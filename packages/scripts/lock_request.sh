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

NETWORK=sepolia
# KEYSTORE_PATH=$WORK_DIR/test.key
# ACCOUNT_FILE=$WORK_DIR/account.json

# BROLY_ORDERBOOK_CONTRACT_ADDRESS=0x04f68339f949e8307057c3e56f08d4f405f0d0b257c9b4d05ede4143e230bced
LOCK_FUNCTION=lock_inscription
INSCRIPTION_ID=$1
TX_HASH=$($SCRIPT_DIR/text_to_byte_array.sh "$2")

echo "Locking inscription request $INSCRIPTION_ID with transaction hash $TX_HASH" > $LOG_DIR/lock_request.log
echo "starkli invoke --network $NETWORK --keystore $KEYSTORE_PATH --account $ACCOUNT_FILE --keystore-password '' --watch $BROLY_ORDERBOOK_CONTRACT_ADDRESS $LOCK_FUNCTION $INSCRIPTION_ID $TX_HASH" > $LOG_DIR/lock_request.log
starkli invoke --network $NETWORK --keystore $KEYSTORE_PATH --account $ACCOUNT_FILE --keystore-password "" --watch $BROLY_ORDERBOOK_CONTRACT_ADDRESS $LOCK_FUNCTION $INSCRIPTION_ID $TX_HASH
