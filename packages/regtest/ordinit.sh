#!/bin/bash
#
# Initialize the regtest environment for ordinals

# Create ordinal wallet
ord --regtest --bitcoin-rpc-url http://broly-regtest-1:18443 --bitcoin-rpc-username user --bitcoin-rpc-password password --bitcoin-data-dir /root/.bitcoin wallet --server-url http://broly-ord-1:8553 create
ord --regtest --bitcoin-rpc-url http://broly-regtest-1:18443 --bitcoin-rpc-username user --bitcoin-rpc-password password --bitcoin-data-dir /root/.bitcoin wallet --server-url http://broly-ord-1:8553 receive > /root/.bitcoin/ord.rec
