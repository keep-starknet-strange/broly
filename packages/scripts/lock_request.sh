#!/bin/bash
#
# This script locks a specified inscription request on Starknet

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
WORK_DIR=$SCRIPT_DIR/../..

OUTPUT_DIR=$HOME/.broly-outputs
TIMESTAMP=$(date +%s)
LOG_DIR=$OUTPUT_DIR/logs/$TIMESTAMP
TMP_DIR=$OUTPUT_DIR/tmp/$TIMESTAMP

# TODO: Clean option to remove old logs and state
#rm -rf $OUTPUT_DIR/logs/*
#rm -rf $OUTPUT_DIR/tmp/*
mkdir -p $LOG_DIR
mkdir -p $TMP_DIR

URL=https://starknet-sepolia.public.blastapi.io/rpc/v0_7

BROLY_ORDERBOOK_CONTRACT_ADDRESS=0x00eb978fc1f6be290dbe2020db8e8b748d26925801ed79e904e12bfc5ce3582e
LOCK_FUNCTION=lock_inscription
ACCOUNT=$1
INSCRIPTION_ID=$2

echo "Locking inscription request $INSCRIPTION_ID" > $LOG_DIR/lock_request.log
echo "sncast --account $ACCOUNT invoke --url $URL --contract-address $BROLY_ORDERBOOK_CONTRACT_ADDRESS --function $LOCK_FUNCTION --calldata $INSCRIPTION_ID" >> $LOG_DIR/lock_request.log

sncast --account $ACCOUNT invoke \
    --url $URL \
    --contract-address $BROLY_ORDERBOOK_CONTRACT_ADDRESS \
    --function $LOCK_FUNCTION \
    --calldata $INSCRIPTION_ID \
    >> $LOG_DIR/lock_request.log