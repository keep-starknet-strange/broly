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

BROLY_ORDERBOOK_CONTRACT_ADDRESS=0x0443574e8fd023b8bb0cc85ab4f17e688ace9d5acf369a50611f2696f088717d
LOCK_FUNCTION=lock_inscription
ACCOUNT=$1
INSCRIPTION_ID=$2

echo "Locking inscription request $INSCRIPTION_ID" > $LOG_DIR/lock_request.log
echo "sncast --account $ACCOUNT invoke" >> $LOG_DIR/lock_request.log

sncast --account $ACCOUNT invoke \
    --url $URL \
    --contract-address $BROLY_ORDERBOOK_CONTRACT_ADDRESS \
    --function $LOCK_FUNCTION \
    --calldata $INSCRIPTION_ID \
    >> $LOG_DIR/lock_request.log