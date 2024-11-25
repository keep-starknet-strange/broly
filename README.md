# Bitcoin Registry Orchestrates Like Yesterday (B.R.O.L.Y)

> Order on Starknet, write on Bitcoin, get money trustlessly, repeat

Broly is a decentralized Bitcoin inscription service that uses Starknet for orderbook management and escrow. It enables trustless Bitcoin inscriptions with guaranteed payments through smart contracts.

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
        ES[Escrow Contract]
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
    SW <--> ES
    IS --> BTC
    OM --> OB
    OM --> ES
    API --> IS
    IS --> API
```

## Flow

1. User connects both Bitcoin and Starknet wallets
2. User creates an inscription order:
   - Specifies inscription content and reward amount
   - Order is created on Starknet orderbook
   - Funds are locked in escrow contract
3. Inscribor service:
   - Monitors pending orders
   - Creates Bitcoin inscriptions
   - Triggers escrow release on successful inscription
4. User receives inscription, inscribor receives reward

## Project Structure

```text
broly/
├── apps/
│   ├── app/               # Frontend React application
│   └── backend/           # REST API service
├── packages/
│   ├── inscribor/         # Bitcoin inscription service
│   └── onchain/           # Starknet smart contracts
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
  - Node.js
  - Express
  - REST API
- Smart Contracts:
  - Cairo (Starknet)
  - Scarb
- Inscribor:
  - Node.js
  - BitcoinJS-lib
  - Starknet.js

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

1. Start development environment:

```bash
pnpm dev
```

## Components

### Frontend (web)

- Dashboard view for pending inscriptions
- New inscription order form
- Wallet connections (Bitcoin + Starknet)
- Order status tracking

### Backend (backend)

- REST API for order management
- Status tracking endpoints
- Order history

### Smart Contracts (onchain)

- Orderbook contract
- Escrow contract
- Payment handling

### Inscribor Service

- Order monitoring
- Bitcoin inscription creation
- Transaction verification
- Starknet interaction for escrow release

## License

Broly is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
