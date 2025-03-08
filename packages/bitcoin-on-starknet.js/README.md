# Bitcoin on Starknet

Bitcoin on Starknet is a TypeScript library that enables reading Bitcoin data on Starknet. This package provides a flexible Bitcoin provider interface and tools to generate proofs for use with the [Utu Relay](https://github.com/lfglabs-dev/utu_relay) smart contract on Starknet.

## Features

- Generate proofs for Bitcoin data to be used on Starknet
- Flexible implementation allowing various Bitcoin data sources
- Seamless integration with Starknet providers

## Installation

```bash
npm install bitcoin-on-starknet
```

## Usage

Before using the library, make sure to set up your environment variables in a `.env` file:

```bash
# Bitcoin RPC credentials
BITCOIN_RPC_URL="http://localhost:8332"
BITCOIN_RPC_USER="your-rpc-username"
BITCOIN_RPC_PASS="your-rpc-password"

# Starknet provider configuration
STARKNET_PROVIDER_URL="your-starknet-provider-url"
```

## Testing

```bash
bun run test
```

## Building

```bash
bun run build
```