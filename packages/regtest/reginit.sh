#!/bin/bash
#
# Initialize the regtest environment for ordinals

# Generate 101 blocks to receive coins
ORDINALS_RECEIVE_ADDRESS=$(cat /root/.bitcoin/ord.rec | jq -r '.addresses[0]')
bitcoin-cli -rpcconnect=broly-regtest-1 -regtest generatetoaddress 101 $ORDINALS_RECEIVE_ADDRESS
