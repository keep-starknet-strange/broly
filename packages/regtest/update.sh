#!/bin/bash
#
# Mine a block every 10 seconds

while true; do
  ORDINALS_RECEIVE_ADDRESS=$(cat /root/.bitcoin/ord.rec | jq -r '.addresses[0]')
  bitcoin-cli -rpcconnect=$REGTEST_HOST -regtest generatetoaddress 1 $ORDINALS_RECEIVE_ADDRESS
  sleep 10
done
