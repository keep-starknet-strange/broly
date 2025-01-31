#!/bin/bash
#
# Inscribe an ordinal

FEERATE=1
FILE=$1

LOGFILE=/root/ord_inscribe.log

echo "ord --regtest --bitcoin-rpc-url $BITCOIN_RPC_URL --bitcoin-rpc-username $BITCOIN_RPC_USER --bitcoin-rpc-password $BITCOIN_RPC_PASSWORD --bitcoin-data-dir $BITCOIN_DATA_DIR wallet --server-url $ORD_SERVER_URL inscribe --fee-rate $FEERATE --file $FILE" > $LOGFILE
ord --regtest --bitcoin-rpc-url $BITCOIN_RPC_URL --bitcoin-rpc-username $BITCOIN_RPC_USER --bitcoin-rpc-password $BITCOIN_RPC_PASSWORD --bitcoin-data-dir $BITCOIN_DATA_DIR wallet --server-url $ORD_SERVER_URL inscribe --fee-rate $FEERATE --file $FILE >> $LOGFILE
