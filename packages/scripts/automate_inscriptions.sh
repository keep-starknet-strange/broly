#!/bin/bash
#
# This script automates the entire inscription process by:
# 1. Monitoring for new inscription requests
# 2. Locking the request
# 3. Running the ord inscription process
# 4. Updating the canonical chain
# 5. Submitting the inscription proof

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
WORK_DIR=$SCRIPT_DIR/../..

# Configuration
OUTPUT_DIR=$HOME/.broly-outputs
TIMESTAMP=$(date +%s)
LOG_DIR=$OUTPUT_DIR/logs/$TIMESTAMP
TMP_DIR=$OUTPUT_DIR/tmp/$TIMESTAMP
mkdir -p $LOG_DIR
mkdir -p $TMP_DIR
PROCESSED_IDS_FILE="$TMP_DIR/processed_ids.txt"
touch "$PROCESSED_IDS_FILE"

# Starknet configuration
URL=https://starknet-sepolia.public.blastapi.io/rpc/v0_7
BROLY_ORDERBOOK_CONTRACT_ADDRESS=0x01888434b64e6b81488bc7b3a7148aa5fccc695591225351227a4314da6a64d5
ACCOUNT=$1 # Starknet account to use

# Bitcoin configuration
BITCOIN_RPC_USERNAME=$2
BITCOIN_RPC_PASSWORD=$3
BITCOIN_RPC_URL=$4
BITCOIN_WALLET_NAME="broly"
BITCOIN_POSTAGE="546sat"
BITCOIN_FEE_RATE=3

BROLY_API_URL=${BROLY_API_URL:-"https://api.broly-btc.com"}
REQUEST_CHECK_INTERVAL=${REQUEST_CHECK_INTERVAL:-60}  # seconds

if [ -z "$ACCOUNT" ] || [ -z "$BITCOIN_RPC_USERNAME" ] || [ -z "$BITCOIN_RPC_PASSWORD" ] || [ -z "$BITCOIN_RPC_URL" ]; then
    echo "Error: Missing required parameters"
    echo "Usage: $0 <starknet_account> <bitcoin_rpc_username> <bitcoin_rpc_password> <bitcoin_rpc_url>"
    exit 1
fi

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_DIR/automation.log
}

check_for_open_requests() {
    log "Checking for open inscription requests..." >&2
    
    RESPONSE=$(curl -s "$BROLY_API_URL/inscriptions/get-open-requests")
    
    if ! echo "$RESPONSE" | jq . > /dev/null 2>&1; then
        log "Invalid JSON response from API" >&2
        return 1
    fi
    
    # Extract the first open request inscription ID from the response
    INSCRIPTION_ID=$(echo "$RESPONSE" | jq -r '.data[0].inscription_id')
    
    if [ -z "$INSCRIPTION_ID" ] || [ "$INSCRIPTION_ID" = "null" ]; then
        log "No open inscription requests found" >&2
        return 1
    fi
    
    log "Found open inscription ID: $INSCRIPTION_ID" >&2
    
    echo "$INSCRIPTION_ID"
    return 0
}

get_destination_address() {
    local INSCRIPTION_ID=$1
    log "Getting destination address for inscription $INSCRIPTION_ID"
    
    RESPONSE=$(curl -s "$BROLY_API_URL/inscriptions/get-open-requests")
    
    if ! echo "$RESPONSE" | jq . > /dev/null 2>&1; then
        log "Invalid JSON response from API"
        return 1
    fi
    
    # Extract the Bitcoin address from the response
    DESTINATION_ADDRESS=$(echo "$RESPONSE" | jq -r --arg id "$INSCRIPTION_ID" '.data[] | select(.inscription_id == ($id | tonumber)) | .bitcoin_address')
    
    if [ -z "$DESTINATION_ADDRESS" ] || [ "$DESTINATION_ADDRESS" = "null" ]; then
        log "No Bitcoin address (destination) found for inscription $INSCRIPTION_ID"
        
        log "Please enter the Bitcoin destination address for this inscription:"
        read DESTINATION_ADDRESS
        
        if [ -z "$DESTINATION_ADDRESS" ]; then
            log "No destination address provided"
            return 1
        fi
    fi
    
    log "Destination address: $DESTINATION_ADDRESS"
    echo "$DESTINATION_ADDRESS"
    return 0
}

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_DIR/automation.log" >&2
}

get_file_for_inscription() {
    local INSCRIPTION_ID=$1
    log "Getting file for inscription $INSCRIPTION_ID"
    
    RESPONSE=$(curl -s "$BROLY_API_URL/inscriptions/get-open-requests")
    
    if ! echo "$RESPONSE" | jq . > /dev/null 2>&1; then
        log "Invalid JSON response from API"
        return 1
    fi
    
    # Extract the inscription data from the response
    INSCRIPTION_DATA=$(echo "$RESPONSE" | jq -r --arg id "$INSCRIPTION_ID" '.data[] | select(.inscription_id == ($id | tonumber)) | .inscription_data')
    
    if [ -z "$INSCRIPTION_DATA" ] || [ "$INSCRIPTION_DATA" = "null" ]; then
        log "No inscription data found for inscription $INSCRIPTION_ID"
        log "Please enter the path to the file to inscribe:"
        read FILE_PATH
        
        if [ -z "$FILE_PATH" ]; then
            log "No file path provided"
            return 1
        fi
        
        echo "$FILE_PATH"
        return 0
    fi

    log "Raw inscription data: $INSCRIPTION_DATA"

    FILE_PATH="$TMP_DIR/file_$INSCRIPTION_ID.txt"

    # Convert hex to binary
    echo "$INSCRIPTION_DATA" | xxd -r -p > "$TMP_DIR/full_inscription_$INSCRIPTION_ID.bin"

    # Find offset of OP_0
    OP0_OFFSET=$(xxd -p "$TMP_DIR/full_inscription_$INSCRIPTION_ID.bin" | tr -d '\n' | grep -b -o '00' | head -n 1 | cut -d':' -f1)
    if [ -z "$OP0_OFFSET" ]; then
        log "Failed to find OP_0 separator (00) in inscription data"
        return 1
    fi

    BYTE_OFFSET=$((OP0_OFFSET / 2))

    LENGTH_HEX=$(xxd -p -s $((BYTE_OFFSET + 1)) -l 1 "$TMP_DIR/full_inscription_$INSCRIPTION_ID.bin")
    LENGTH_DEC=$((16#$LENGTH_HEX))

    # Extract payload
    dd if="$TMP_DIR/full_inscription_$INSCRIPTION_ID.bin" of="$FILE_PATH" bs=1 skip=$((BYTE_OFFSET + 2)) count=$LENGTH_DEC status=none

    if [ ! -f "$FILE_PATH" ] || [ ! -s "$FILE_PATH" ]; then
        log "Failed to create valid payload file"
        return 1
    fi

    log "Extracted payload of $LENGTH_DEC bytes to $FILE_PATH"
    echo "$FILE_PATH"
    return 0
}

lock_request() {
    local INSCRIPTION_ID=$1
    log "Locking inscription request $INSCRIPTION_ID"
    
    # Format the inscription ID
    FELT_INSCRIPTION_ID="0x$(printf '%x' $INSCRIPTION_ID)"
    log "Inscription ID as felt: $FELT_INSCRIPTION_ID"
    
    $SCRIPT_DIR/lock_request.sh $ACCOUNT $FELT_INSCRIPTION_ID
    
    if [ $? -eq 0 ]; then
        log "Successfully locked inscription request $INSCRIPTION_ID"
        return 0
    else
        log "Failed to lock inscription request $INSCRIPTION_ID"
        return 1
    fi
}

inscribe_ordinal() {
    local FILE=$1
    local DESTINATION_ADDRESS=$2
    log "Inscribing ordinal for file $FILE to destination $DESTINATION_ADDRESS"

    ORD_OUTPUT=$(ord --bitcoin-rpc-username "$BITCOIN_RPC_USERNAME" \
        --bitcoin-rpc-password "$BITCOIN_RPC_PASSWORD" \
        --bitcoin-rpc-url "$BITCOIN_RPC_URL" \
        wallet --name "$BITCOIN_WALLET_NAME" \
        inscribe --file "$FILE" \
        --fee-rate "$BITCOIN_FEE_RATE" \
        --destination "$DESTINATION_ADDRESS" \
        --postage "$BITCOIN_POSTAGE" \
        2>&1)

    echo "$ORD_OUTPUT" > "$LOG_DIR/ord_inscribe.log"

    if echo "$ORD_OUTPUT" | grep -qi "error"; then
        log "Failed to inscribe ordinal for file $FILE"
        return 1
    fi

    TX_ID=$(echo "$ORD_OUTPUT" | jq -r '.reveal // empty')
    ORD_INSCRIPTION_ID=$(echo "$ORD_OUTPUT" | jq -r '.inscriptions[0].id // empty')

    if [ -z "$TX_ID" ]; then
        log "Failed to extract transaction ID from ord response"
        return 1
    fi

    log "Transaction ID (reveal): $TX_ID"
    [ -n "$ORD_INSCRIPTION_ID" ] && log "Ordinal Inscription ID: $ORD_INSCRIPTION_ID"

    echo "$TX_ID|$ORD_INSCRIPTION_ID"
    return 0
}

update_canonical_chain() {
    local TX_ID=$1
    local INSCRIPTION_ID=$2
    log "Updating canonical chain for transaction $TX_ID and inscription $INSCRIPTION_ID"
    
    cd $WORK_DIR/packages/bitcoin-on-starknet.js
    if [ -z "$INSCRIPTION_ID" ]; then
        bun run ./scripts/updateCanonicalChain.ts $TX_ID
    else
        bun run ./scripts/updateCanonicalChain.ts $TX_ID $INSCRIPTION_ID
    fi
    
    if [ $? -eq 0 ]; then
        log "Successfully updated canonical chain for transaction $TX_ID"
        return 0
    else
        log "Failed to update canonical chain for transaction $TX_ID"
        return 1
    fi
}

submit_inscription_proof() {
    local TX_ID=$1
    local INSCRIPTION_ID=$2
    log "Submitting inscription proof for transaction $TX_ID and inscription $INSCRIPTION_ID"
    
    cd $WORK_DIR/packages/bitcoin-on-starknet.js
    bun run ./scripts/submitOrdInscription.ts $TX_ID $INSCRIPTION_ID
    
    if [ $? -eq 0 ]; then
        log "Successfully submitted inscription proof"
        return 0
    else
        log "Failed to submit inscription proof"
        return 1
    fi
}

wait_for_confirmation() {
    local TX_ID=$1
    local INSCRIPTION_ID=$2
    local MAX_ATTEMPTS=600
    local ATTEMPT=0

    log "Waiting for transaction $TX_ID to be confirmed..."

    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        CONFIRMATIONS=$(ord --bitcoin-rpc-username "$BITCOIN_RPC_USERNAME" \
            --bitcoin-rpc-password "$BITCOIN_RPC_PASSWORD" \
            --bitcoin-rpc-url "$BITCOIN_RPC_URL" \
            wallet --name "$BITCOIN_WALLET_NAME" \
            transactions | jq -r --arg tx "$TX_ID" '.[] | select(.transaction == $tx) | .confirmations')

        if [[ "$CONFIRMATIONS" =~ ^[0-9]+$ ]] && [ "$CONFIRMATIONS" -gt 0 ]; then
            log "Transaction $TX_ID confirmed with $CONFIRMATIONS confirmations"
            return 0
        fi

        ATTEMPT=$((ATTEMPT + 1))
        log "Transaction not yet confirmed. Attempt $ATTEMPT/$MAX_ATTEMPTS. Waiting 30 seconds..."
        sleep 30
    done

    log "Transaction $TX_ID not confirmed after $MAX_ATTEMPTS attempts"
    return 1
}

log "Starting inscription automation service"
log "Using Starknet account: $ACCOUNT"
log "Using Bitcoin RPC URL: $BITCOIN_RPC_URL"
log "Using Broly API URL: $BROLY_API_URL"

while true; do
    # Check for open inscription requests
    INSCRIPTION_ID=$(check_for_open_requests)

    if [ $? -eq 0 ]; then
        if grep -q "^$INSCRIPTION_ID$" "$PROCESSED_IDS_FILE"; then
            log "Inscription ID $INSCRIPTION_ID already processed. Skipping..."
            sleep $REQUEST_CHECK_INTERVAL
            continue
        fi

        log "Processing inscription ID: $INSCRIPTION_ID"
        
        if lock_request "$INSCRIPTION_ID"; then
            DESTINATION_ADDRESS=$(get_destination_address "$INSCRIPTION_ID")
            if [ $? -ne 0 ]; then
                log "Failed to get destination address for inscription $INSCRIPTION_ID"
                continue
            fi
            
            FILE=$(get_file_for_inscription "$INSCRIPTION_ID")
            if [ $? -ne 0 ]; then
                log "Failed to get file for inscription $INSCRIPTION_ID"
                continue
            fi
            
            log "File to inscribe: $FILE"
            
            # Inscribe the ordinal
            ORD_RESULT=$(inscribe_ordinal "$FILE" "$DESTINATION_ADDRESS")
            if [ $? -eq 0 ] && [ ! -z "$ORD_RESULT" ]; then
                TX_ID=$(echo $ORD_RESULT | cut -d'|' -f1)
                echo "$INSCRIPTION_ID" >> "$PROCESSED_IDS_FILE"
                
                log "Transaction ID: $TX_ID"
                
                if wait_for_confirmation "$TX_ID" "$INSCRIPTION_ID"; then
                    if update_canonical_chain "$TX_ID" "$INSCRIPTION_ID"; then
                        submit_inscription_proof "$TX_ID" "$INSCRIPTION_ID"
                    fi
                else
                    log "Skipping update and submit steps due to unconfirmed transaction"
                fi
            fi
        fi
    else
        log "No open inscription requests found. Waiting before checking again..."
    fi
    
    # Wait before checking again
    log "Waiting $REQUEST_CHECK_INTERVAL seconds before checking again..."
    sleep $REQUEST_CHECK_INTERVAL
done 