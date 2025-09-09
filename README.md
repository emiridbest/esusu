# Esusu: Decentralised Community Savings on Celo

![Esusu Logo](https://github.com/user-attachments/assets/c1e4d15e-d400-477f-a302-98ba9e40135d)


# Proof of Ship 6 
- Made smart contracts upgradable
- Added test suite with above 85% coverage
- Implemented G$ face verification on Farcaster
- Accepting Celo as a means of payment via MentoSDK exchange rate
- Onboard additional users, increasing the community base by over 150%
- Ran a monthly community giveaway scheme
- Launched referral campaign for early community members with rewards payout of over $250 so far
- Ensured GitOps pipeline is functional


## Overview

Esusu is a decentralised application (DApp) built on the Celo Mainnet that modernizes traditional community savings systems. It enables financial inclusion through a 3-in-1 solution that combines collaborative savings, personal finance management, and bill payment capabilities.

## Features

### 1. Thrift Contribution System
- Users join campaigns where they contribute funds monthly
- Each month, one participant receives the pooled contributions
- Provides access to bulk capital without traditional borrowing
- Smart contracts ensure transparency and secure fund distribution

### 2. MiniSafe Box (Time-locked Savings)
- Personal savings with customizable time-locking
- Earn MST (MiniSafe Tokens) as rewards for maintaining locked savings
- Incentivizes financial discipline and long-term planning

### 3. Bill Payment System
- Pay utility bills directly through the platform
- Make charitable donations to various projects
- Low-cost transactions using Celo's efficient blockchain

## Problem Statement

Financial exclusion remains a significant challenge across developing economies, particularly in Africa. Limited banking access and weakening savings culture, exacerbated by economic pressures and increased impulse spending, have created barriers to financial stability. Traditional community savings systems (like Esusu) face trust and efficiency challenges, while formal banking remains inaccessible to many.


## Our Solution

Esusu bridges traditional community savings practices with blockchain technology to create a secure, transparent financial platform that:
- Preserves cultural financial traditions while eliminating trust issues
- Enables financial discipline through smart contract enforcement
- Provides accessible financial tools via mobile devices with minimal bandwidth requirements
- Promotes community cooperation through decentralised technology

## Technology Stack

- **Frontend**: Next.js, Tailwind CSS, Shadcn UI components, TypeScript
- **Blockchain**: Celo Mainnet
- **Smart Contracts**: Solidity, Foundry
- **Development Framework**: Celo Composer
- **Data Storage**: MongoDB
- **SDK**: Goat SDK

## Contract Information
The Esusu protocol has been deployed to the following contracts:

| Network | Contract | Address |
|---------|----------|---------|
| Celo | MiniSafeAave | `0x9fAB2C3310a906f9306ACaA76303BcEb46cA5478` |
| Celo | MiniSafeAaveIntegration | `0xB58c8917eD9e2ba632f6f446cA0509781dd676B2` |
| Celo | MiniSafeAave | `0x67fDEC406b8d3bABaf4D59627aCde3C5cD4BA90A` |
Full Contract Repo: https://github.com/emiridbest/esusu-contracts/

```
esusu/
├── frontend/                  # Next.js 15 user app (Thirdweb wallet, MiniSafe UI, utilities)
│   ├── app/                   # App Router pages + API routes (e.g., /api/topup, /api/utilities/electricity/pay)
│   ├── components/            # Reusable UI components
│   ├── context/
│   │   ├── miniSafe/          # MiniSafeContext.tsx - deposit/withdraw/break flows
│   │   └── utilityProvider/   # ClaimContextProvider, hooks for identity/balances
│   ├── lib/                   # thirdweb client and chain config
│   ├── services/utility/      # Utility payment client helpers
│   └── __tests__/             # Jest tests (MiniSafe components)
├── backend/                   # Next.js 15 API server + shared library (imported by frontend)
│   ├── lib/
│   │   ├── config/environment.ts           # Env validation and typing
│   │   ├── database/ (connection, schemas, migrations, initializer)
│   │   └── services/ (transaction, notification, analytics, electricity)
│   └── app/api/                              # Backend-only routes (utility providers, etc.)
├── farcaster/                 # Next.js 15 frame app (no wallet UI; Wagmi for frames)
│   ├── app/                   # Frame routes and providers
│   └── components/providers/WagmiProvider.tsx
├── scripts/                   # Deployment/ops scripts
├── package.json               # Root monorepo (workspaces: frontend, backend)
├── tsconfig.json              # Root TS config
├── vercel.json                # Deployment config
└── README.md
```

### Architecture Overview

- Frontend imports backend library code via `@esusu/backend` exports (see `backend/package.json` `exports`) and `frontend/next.config.js` `experimental.externalDir: true` + `outputFileTracingIncludes` to bundle backend code in frontend API routes.
- All apps are Next.js 15 (App Router). The `farcaster/` app is standalone (not a workspace) and is used for Farcaster Frames.
- Data is stored in MongoDB via Mongoose (`backend/lib/database/connection.ts`). `environment.ts` validates required env like `MONGODB_URI` and provides sane defaults for pool/timeout.
- Blockchain: Celo. The frontend uses Thirdweb v5 to prepare/send transactions and viem for ABI encoding. Farcaster uses Wagmi connectors for frame interactions (no wallet UI).

### Wallet & Chain Strategy

- Frontend (`frontend/app/providers.tsx`) wraps the app in `ThirdwebProvider`. The Thirdweb client is created in `frontend/lib/thirdweb.ts` and requires `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`. Active chain is `celo`.
- Farcaster uses `wagmi` with the Celo chain and the Farcaster mini-app connector (`farcaster/components/providers/WagmiProvider.tsx`). There is intentionally no full wallet UI in frames.
- Celo MiniPay is supported via injected/WalletConnect connectors.

### Root NPM Scripts (see `package.json`)

- `install:all` – install deps in root, then `frontend/` and `backend/`.
- `dev` – run frontend (port 3000) and backend (port 3001) concurrently.
- `build` / `start` – build and start both packages.
- `db:init` / `db:migrate` / `db:health` – database utilities proxied to backend.
- Farcaster runs separately: `cd farcaster && npm i && npm run dev` (consider `-p 3002`).

## Features

- **Mini Safe**: Secure savings feature
- **Thrift**: Group savings feature
- **Chat Assistant**: AI-powered assistant for performing on-chain transactions

## Getting Started

### Prerequisites

- Node.js 18.17.0 or later
- npm or yarn

### Installation

1. Install dependencies for both frontend and backend:

```bash
npm run install:all
```

### Running the Application

To run both the frontend and backend simultaneously:

```bash
npm run dev
```

This will start:
- Frontend on http://localhost:3000
- Backend on http://localhost:3001

### Environment Variables & Configuration

Create `.env.local` files in `frontend/` and `backend/` (and optionally `farcaster/`). Below are the most relevant variables by package.

- Frontend (client + server routes)
  - Required
    - `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` – Thirdweb client ID used in `frontend/lib/thirdweb.ts`.
  - MiniSafe and UX
    - `NEXT_PUBLIC_TOKEN_ADDRESS` – Default ERC20 token used by MiniSafe (optional, defaults to G$ fallback).
    - `NEXT_PUBLIC_REWARD_TOKEN_ADDRESS` – Reward token (EST) for balance display (optional).
    - `NEXT_PUBLIC_REWARD_TOKEN_DECIMALS` – Fallback decimals for reward token (optional, default 18).
    - `NEXT_PUBLIC_TX_TIMEOUT_MS` – Safety timeout for transaction steps (default 120000 ms).
  - Utility payments (server-only in frontend API routes)
    - `PAYMENT_API_KEY` or `API_KEY` – Optional API key required by `/api/topup` and `/api/utilities/electricity/pay`.
    - `TOPUP_RATE_LIMIT_PER_MINUTE` – Per-IP and per-wallet rate limit for topups (default 10/min).
    - `ELECTRICITY_RATE_LIMIT_PER_MINUTE` – Rate limit for electricity endpoint (default 10/min).
    - `CELO_RPC_URL` – Celo RPC for on-chain payment validation (default `https://forno.celo.org`).
    - `RECIPIENT_WALLET` – Treasury wallet expected as the ERC20 `transfer(to, amount)` recipient.
    - Reloadly (airtime/data) auth and endpoints:
      - `NEXT_CLIENT_ID`, `NEXT_CLIENT_SECRET`
      - `NEXT_PUBLIC_AUTH_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SANDBOX_API_URL`, `NEXT_PUBLIC_SANDBOX_MODE` (`true|false`)

- Backend
  - Required
    - `MONGODB_URI` – Mongo connection string (validated in `backend/lib/config/environment.ts`).
  - Optional
    - `PORT` (default 3001)
    - `DB_ADMIN_KEY`, `DB_CONNECTION_TIMEOUT`, `DB_SOCKET_TIMEOUT`, `DB_MAX_POOL_SIZE`, `DB_MIN_POOL_SIZE`
    - Email/SMS notifications (`backend/lib/services/notificationService.ts`):
      - `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM`
      - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
      - `FRONTEND_URL` – used for deep links in emails/SMS
    - Auth (if used later): `NEXTAUTH_SECRET`, `NEXTAUTH_URL`

- Farcaster (frames)
  - `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (analytics)
  - Runs standalone; no wallet UI provider.

Quickstart:
1) `cp frontend/.env.local.example frontend/.env.local` (if you keep examples) and fill values.
2) `cp backend/.env.local.example backend/.env.local` and fill values (at minimum `MONGODB_URI`).
3) Run `npm run dev` from the root.

## Building for Production

To build both applications for production:

```bash
npm run build
```

To start the production builds:

```bash
npm run start
```

## Technologies Used

- Next.js 15 (App Router across `frontend/`, `backend/`, `farcaster/`)
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui components
- Thirdweb v5 (frontend wallet, transactions) and Viem (ABI encoding)
- Wagmi v2 (Farcaster frame connectors, no wallet UI)
- Ethers v6 (server-side on-chain validation in API routes)
- MongoDB + Mongoose (connection caching, migrations/initializer)
- Notifications: Nodemailer (email) and Twilio (SMS)
- AI: Vercel AI SDK (`ai`, `@ai-sdk/*`) and GOAT SDK

### Security Model for Utility Payments

Critical endpoints like `frontend/app/api/topup/route.ts` (airtime/data) and `frontend/app/api/utilities/electricity/pay/route.ts` enforce on‑chain payment validation before calling providers:
- Decode the ERC20 `transfer(to, amount)` from the provided `transactionHash`.
- Verify the token contract matches the allowed list (cUSD, USDC, USDT on Celo).
- Require at least 1 confirmation and a max transaction age window (10 minutes) to limit replay.
- Derive token decimals dynamically with fallback to ensure amount checks are accurate.
- Enforce recipient equals `RECIPIENT_WALLET` and that `amount >= expectedAmount`.
- Prevent hash replay via `TransactionService.isPaymentHashUsed(transactionHash)`.
- Optional API key and in‑memory rate limiting per IP and per wallet.
- Record transactions in MongoDB and send notifications; mark `completed` or `failed` based on provider result.

### API Endpoints (quick overview)

- `POST /api/topup` (frontend app) – Airtime/data topup via Reloadly.
  - Body: `{ operatorId, amount, recipientPhone, email, transactionHash, expectedAmount, paymentToken }`
- `POST /api/utilities/electricity/pay` (frontend app) – Country/provider‑specific electricity payments.
  - Body: `{ country, providerId, customerId, customerEmail, amount, transactionHash, expectedAmount, paymentToken }`
- `GET /api/analytics` and `POST /api/analytics` (frontend app) – User analytics history and generation.
- `GET /api/dashboard` (frontend app) – User or platform dashboard aggregates.

Note: Frontend API routes import backend services (e.g., `@esusu/backend/lib/services/*`) thanks to `externalDir: true`.

### Mobile Access

To access the app via Celo MiniPay wallet:
1. Open the MiniPay app
2. Navigate to the `site tester` feature
3. Enter `http://esusu-one.vercel.app`

## Screenshots

<div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
    <img src="https://github.com/emiridbest/esusu/assets/6362475/d7c54cc5-3c23-433d-a935-3d09975102c7" alt="Dashboard" width="45%">
    <img src="https://github.com/emiridbest/esusu/assets/6362475/b30de746-c2db-4a43-a976-2c00eea408f3" alt="Savings Interface" width="45%">
    <img src="https://github.com/emiridbest/esusu/assets/6362475/0c958d2d-b537-45f1-91d8-3b6c4c883011" alt="Campaign Creation" width="45%">
    <img src="https://github.com/emiridbest/esusu/assets/6362475/4b27f0c8-4a3c-4b7c-b17d-c8b8fc3879e2" alt="Transaction History" width="45%">
    <img src="https://github.com/emiridbest/esusu/assets/6362475/12111a40-8c3f-4039-9167-b4e02c0bed2f" alt="User Profile" width="45%">
    <img src="https://github.com/emiridbest/esusu/assets/6362475/478530fd-0568-41b5-9485-78ad207f3465" alt="Bill Payment" width="45%">
</div>

## Team

**Emiri Udogwu** - Lead Developer - [GitHub](https://github.com/emiridbest/)

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License


This project is licensed under the [MIT License](LICENSE).
