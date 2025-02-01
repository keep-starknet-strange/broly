#!/bin/bash
#
# Mine a block every 10 seconds

while true; do
  ORDINALS_RECEIVE_ADDRESS=$(cat /root/ord.addr)
  bitcoin-cli -rpcconnect=$REGTEST_HOST -rpcpassword=$BITCOIN_PASSWORD -rpcuser=$BITCOIN_USER -regtest generatetoaddress 1 $ORDINALS_RECEIVE_ADDRESS
  sleep 10
done
