<div align="center">
  <img src="apps/web/public/images/logo-high.png" alt="broly-logo" height="220"/>

  # B.R.O.L.Y.
  ***Bitcoin Registry Orchestrates Like Yesterday***
</div>

> Order on Starknet, write on Bitcoin, get money trustlessly, repeat

Broly is a decentralized Bitcoin inscription service that uses Starknet for orderbook management. It enables trustless Bitcoin inscriptions with guaranteed payments through smart contracts.

<div align="center">
<a href="https://github.com/keep-starknet-strange/broly/actions/workflows/contracts.yml"><img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/keep-starknet-strange/broly/contracts.yml?style=for-the-badge" height=30></a>
<a href="https://bitcoin.org/"> <img alt="Bitcoin" src="https://img.shields.io/badge/Bitcoin-000?style=for-the-badge&logo=bitcoin&logoColor=white" height=30></a>
<a href="https://exploration.starkware.co/"><img src="https://img.shields.io/badge/Exploration Team-000.svg?&style=for-the-badge&logo=data:image/svg%2bxml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIGlkPSJhIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxODEgMTgxIj48ZGVmcz48c3R5bGU+LmJ7ZmlsbDojZmZmO308L3N0eWxlPjwvZGVmcz48cGF0aCBjbGFzcz0iYiIgZD0iTTE3Ni43Niw4OC4xOGwtMzYtMzcuNDNjLTEuMzMtMS40OC0zLjQxLTIuMDQtNS4zMS0xLjQybC0xMC42MiwyLjk4LTEyLjk1LDMuNjNoLjc4YzUuMTQtNC41Nyw5LjktOS41NSwxNC4yNS0xNC44OSwxLjY4LTEuNjgsMS44MS0yLjcyLDAtNC4yN0w5Mi40NSwuNzZxLTEuOTQtMS4wNC00LjAxLC4xM2MtMTIuMDQsMTIuNDMtMjMuODMsMjQuNzQtMzYsMzcuNjktMS4yLDEuNDUtMS41LDMuNDQtLjc4LDUuMThsNC4yNywxNi41OGMwLDIuNzIsMS40Miw1LjU3LDIuMDcsOC4yOS00LjczLTUuNjEtOS43NC0xMC45Ny0xNS4wMi0xNi4wNi0xLjY4LTEuODEtMi41OS0xLjgxLTQuNCwwTDQuMzksODguMDVjLTEuNjgsMi4zMy0xLjgxLDIuMzMsMCw0LjUzbDM1Ljg3LDM3LjNjMS4zNiwxLjUzLDMuNSwyLjEsNS40NCwxLjQybDExLjQtMy4xMSwxMi45NS0zLjYzdi45MWMtNS4yOSw0LjE3LTEwLjIyLDguNzYtMTQuNzYsMTMuNzNxLTMuNjMsMi45OC0uNzgsNS4zMWwzMy40MSwzNC44NGMyLjIsMi4yLDIuOTgsMi4yLDUuMTgsMGwzNS40OC0zNy4xN2MxLjU5LTEuMzgsMi4xNi0zLjYsMS40Mi01LjU3LTEuNjgtNi4wOS0zLjI0LTEyLjMtNC43OS0xOC4zOS0uNzQtMi4yNy0xLjIyLTQuNjItMS40Mi02Ljk5LDQuMyw1LjkzLDkuMDcsMTEuNTIsMTQuMjUsMTYuNzEsMS42OCwxLjY4LDIuNzIsMS42OCw0LjQsMGwzNC4zMi0zNS43NHExLjU1LTEuODEsMC00LjAxWm0tNzIuMjYsMTUuMTVjLTMuMTEtLjc4LTYuMDktMS41NS05LjE5LTIuNTktMS43OC0uMzQtMy42MSwuMy00Ljc5LDEuNjhsLTEyLjk1LDEzLjg2Yy0uNzYsLjg1LTEuNDUsMS43Ni0yLjA3LDIuNzJoLS42NWMxLjMtNS4zMSwyLjcyLTEwLjYyLDQuMDEtMTUuOGwxLjY4LTYuNzNjLjg0LTIuMTgsLjE1LTQuNjUtMS42OC02LjA5bC0xMi45NS0xNC4xMmMtLjY0LS40NS0xLjE0LTEuMDgtMS40Mi0xLjgxbDE5LjA0LDUuMTgsMi41OSwuNzhjMi4wNCwuNzYsNC4zMywuMTQsNS43LTEuNTVsMTIuOTUtMTQuMzhzLjc4LTEuMDQsMS42OC0xLjE3Yy0xLjgxLDYuNi0yLjk4LDE0LjEyLTUuNDQsMjAuNDYtMS4wOCwyLjk2LS4wOCw2LjI4LDIuNDYsOC4xNiw0LjI3LDQuMTQsOC4yOSw4LjU1LDEyLjk1LDEyLjk1LDAsMCwxLjMsLjkxLDEuNDIsMi4wN2wtMTMuMzQtMy42M1oiLz48L3N2Zz4=" alt="Exploration Team" height="30"></a>
</div>

---

## Why Broly? 

Broly is a showcase of the power of Starknet brought to the Bitcoin ecosystem. With Broly, a user without any funds on Bitcoin can get their data inscribed on Bitcoin for a `STRK` fee. All they need is a Bitcoin and a Starknet wallet extension. They broadcast their request transaction to Starknet. The data is stored in the Broly contract. A user running the `inscribor` service can pick up the request, inscribe the data on Bitcoin, and transfer it to the requester's Bitcoin address. The `inscribor` can submit the creation and transfer transactions to the Broly contract on Starknet, and get the full verification of the correctness of the transaction execution. 

Try [Broly](https://www.broly-btc.com/)!

### Dependencies

`raito`: A provable [Bitcoin light client](https://github.com/keep-starknet-strange/raito) written in Cairo. 

`shinigami`: A [Bitcoin script VM](https://github.com/keep-starknet-strange/shinigami), aka Bitcoin Execution Engine in Cairo. 

`utu_relay`: A [smart contract](https://github.com/lfglabs-dev/utu_relay) that enables secure verification of Bitcoin transactions and events, and bridges Bitcoin data to Starknet. 

Kudos to the [Exploration](https://github.com/keep-starknet-strange) team and [LFG](https://github.com/lfglabs-dev) labs for the effort!

## Architecture

```mermaid
flowchart TB
    subgraph Frontend
        UI[React UI]
        BW[Bitcoin Wallet]
        SW[Starknet Wallet]
    end

    subgraph Backend
        API[REST API]
        DB[(Database)]
    end

    subgraph Starknet
        OB[Orderbook Contract]
        TI[Tx Inclusion]
    end

    subgraph Bitcoin
        BTC[Bitcoin Network]
    end

    subgraph Inscribor
        IS[Inscription Service]
        OM[Order Monitor]
    end

    UI --> API
    UI <--> BW
    UI <--> SW
    API --> DB
    SW <--> OB
    IS --> BTC
    OM --> OB
    OB --> TI
    API --> IS
    IS --> API
    IS --> OB
```

## Flow

1. User connects both Bitcoin [Xverse](https://www.xverse.app/) and [Starknet](https://www.argent.xyz/) Argent or [Braavos](https://braavos.app/) wallets
2. User creates an inscription order:
   - Specifies inscription content and reward amount
   - Order is created on Starknet orderbook
   - Funds are locked in the contract
3. Inscribor service:
   - Monitors pending orders
   - Creates Bitcoin inscriptions
   - Triggers reward release on successful inscription
4. User receives inscription, inscribor receives reward

## Getting Started

1. Run the app

```bash
cp .env.example .env
# Edit .env variables to match your environment
docker compose up
```

View the website [locally](http://localhost:5173/). 

2. Restart your app ( after changes to backend(s), indexer, ... )

```bash
docker compose down --volumes
docker compose build
docker compose up
```

2. Run the proof-utils package

```bash
cd packages/proof-utils
pnpm add -D typescript ts-node
pnpm run build 
node dist/index.js
```

The script will print the serialized transaction hex.

## Project Structure

```text
broly/
├── apps/
│   ├── web/               # Frontend React application
│   └── backend/           # REST API service
├── packages/
│   ├── inscribor/         # Bitcoin inscription service
│   ├── onchain/           # Starknet smart contracts
│   ├── scripts/           # Deployment & Testing scripts
│   └── indexer/           # Starknet contract indexing
├── package.json
└── turbo.json
```

## Technology Stack

- Frontend:
  - React + TypeScript
  - Vite
  - TailwindCSS
  - Starknet.js
  - BitcoinJS-lib
- Backend:
  - Golang
  - Postgres DB
  - REST API
- Smart Contracts:
  - Cairo (Starknet)
  - Scarb
- Inscribor:
  - Node.js
  - BitcoinJS-lib
  - Starknet.js

## Components

### Frontend (web)

- New inscription order form
- Dashboard view for pending inscriptions
- Wallet connections (Bitcoin + Starknet)
- Order status tracking
- Exploring inscriptions

### Backend (backend)

- REST API for order management
- Status tracking endpoints
- Order history

### Smart Contracts (onchain)

- Orderbook contract
- Transaction inclusion
- Payment handling

### Inscribor Service

- Order monitoring
- Bitcoin inscription creation
- Transaction verification
- Starknet interaction for reward release

## License

Broly is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
