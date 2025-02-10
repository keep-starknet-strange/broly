#!/bin/bash
#
# Estimate fee for inscribing an ordinal

FEERATE=$(curl -sSL "https://mempool.space/api/v1/fees/recommended" | jq -r '.halfHourFee')
BTC_TO_SAT=100000000
#TODO: STRK decimals 10^18?
BTC_TO_STRK=$(curl https://api.coinconvert.net/convert/btc/strk\?amount\=1 | jq -r '.STRK')
FILE=$1

LOGFILE=/root/estimate_fee.log

echo "ord --regtest --bitcoin-rpc-url $BITCOIN_RPC_URL --bitcoin-rpc-username $BITCOIN_RPC_USER --bitcoin-rpc-password $BITCOIN_RPC_PASSWORD --bitcoin-data-dir $BITCOIN_DATA_DIR wallet --server-url $ORD_SERVER_URL inscribe --dry-run --fee-rate $FEERATE --file $FILE | jq -r '.total_fees'" > $LOGFILE
ord --regtest --bitcoin-rpc-url $BITCOIN_RPC_URL --bitcoin-rpc-username $BITCOIN_RPC_USER --bitcoin-rpc-password $BITCOIN_RPC_PASSWORD --bitcoin-data-dir $BITCOIN_DATA_DIR wallet --server-url $ORD_SERVER_URL inscribe --dry-run --fee-rate $FEERATE --file $FILE >> $LOGFILE
echo "ord --regtest --bitcoin-rpc-url $BITCOIN_RPC_URL --bitcoin-rpc-username $BITCOIN_RPC_USER --bitcoin-rpc-password $BITCOIN_RPC_PASSWORD --bitcoin-data-dir $BITCOIN_DATA_DIR wallet --server-url $ORD_SERVER_URL inscribe --dry-run --fee-rate $FEERATE --file $FILE | jq -r '.total_fees'" >> $LOGFILE
ord --regtest --bitcoin-rpc-url $BITCOIN_RPC_URL --bitcoin-rpc-username $BITCOIN_RPC_USER --bitcoin-rpc-password $BITCOIN_RPC_PASSWORD --bitcoin-data-dir $BITCOIN_DATA_DIR wallet --server-url $ORD_SERVER_URL inscribe --dry-run --fee-rate $FEERATE --file $FILE | jq -r '.total_fees' >> $LOGFILE
TOTAL_FEE_SATS=$(ord --regtest --bitcoin-rpc-url $BITCOIN_RPC_URL --bitcoin-rpc-username $BITCOIN_RPC_USER --bitcoin-rpc-password $BITCOIN_RPC_PASSWORD --bitcoin-data-dir $BITCOIN_DATA_DIR wallet --server-url $ORD_SERVER_URL inscribe --dry-run --fee-rate $FEERATE --file $FILE | jq -r '.total_fees')
echo "echo '$TOTAL_FEE_SATS * $BTC_TO_STRK / $BTC_TO_SAT' | bc -l" >> $LOGFILE
TOTAL_FEE_STRK=$(echo "$TOTAL_FEE_SATS * $BTC_TO_STRK / $BTC_TO_SAT" | bc -l)
echo "Total fee: $TOTAL_FEE_STRK" >> $LOGFILE
echo $TOTAL_FEE_STRK
