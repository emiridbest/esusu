# Esusu: Decentralised Community Savings on Celo

![Esusu Logo](https://github.com/user-attachments/assets/c1e4d15e-d400-477f-a302-98ba9e40135d)

# Proof of Ship 9 
- Commence viral app invite campaign: New user and inviter get G$2000 each.
- Add airtime freebies: Prices are subsidised at over 20x.
- Track tx hashes: This is for dispute resolution and activity monitoring.
- Improve UI: Making it look cleaner and more professional.
- Grow DAU to >650: The actual value at the time of report is 685
- Commence G$ only daily claims: Making Esusu attractive to users who do not want subsidised airtimr or data topups.


# Proof of Ship 7

- Implemented robust user management and profile service (wallet-based identity, email/phone linking, MongoDB integration)
- Centralised transaction management for savings, withdrawals, utility payments, group contributions, and payouts with blockchain tracking
- Developed group thrift and rotating savings service (5-member groups, automated scheduling, strong validation)
- Built a utility and electricity payment service with secure API integration and auditable flows
- Added notification and multi-channel alert service (email, SMS, push) for key user and group events

# Proof of Ship 6 
- Made smart contracts upgradable
- Added test suite with above 85% coverage
- Implemented G$ face verification on Farcaster
- Onboard additional users, increasing the community base by over 150%
- Ran a monthly community giveaway scheme
- Launched referral campaign for early community members with rewards payout of over $250 so far
- Ensured GitOps pipeline is functional
## Overview

Esusu is a decentralised application (DApp) built on the Celo Mainnet that modernises traditional community savings systems. It enables financial inclusion through a 3-in-1 solution that combines collaborative savings, personal finance management, and bill payment capabilities.

## Features

### 1. Thrift Contribution System
- Users join campaigns where they contribute funds monthly
- Each month, one participant receives the pooled contributions
- Provides access to bulk capital without traditional borrowing
- Smart contracts ensure transparency and secure fund distribution
- **Group Admin Controls**: Group creators have comprehensive admin functions:
  - Activate inactive groups to start contributions
  - Set custom payout order for group members
  - Distribute payouts to current recipients
  - Emergency withdrawal capabilities for critical situations
- **Smart Ownership Detection**: Admin controls automatically appear for group creators based on smart contract ownership

### 2. MiniSafe Box (Time-locked Savings)
- Personal savings with customizable time-locking
- Earn MST (MiniSafe Tokens) as rewards for maintaining locked savings
- Incentivises financial discipline and long-term planning

### 3. AI-Powered Chat Assistant
- Intelligent conversational interface for performing on-chain transactions
- Supports sending CELO, cUSD, and other tokens
- Implements dollar-cost averaging using Balmy protocol
- Provides on-chain advice based on user data

### 4. Bill Payment System
- Pay utility bills directly through the platform
- Make charitable donations to various projects
- Low-cost transactions using Celo's efficient blockchain

### 5. Recent Accomplishments

#### Proof of Ship 6
- Made smart contracts upgradable
- Added test suite with above 85% coverage
- Implemented G$ face verification on Farcaster
- Accepting Celo as a means of payment via MentoSDK exchange rate
- Onboard additional users, increasing the community base by over 150%
- Ran a monthly community giveaway scheme
- Launched referral campaign for early community members with rewards payout of over $250 so far
- Ensured GitOps pipeline is functional

#### Proof of Ship 7
- Implemented robust user management and profile service (wallet-based identity, email/phone linking, MongoDB integration)
- Centralized transaction management for savings, withdrawals, utility payments, group contributions, and payouts with blockchain tracking
- Developed group thrift and rotating savings service (5-member groups, automated scheduling, strong validation)
- Built utility and electricity payment service with secure API integration and auditable flows
- Added notification and multi-channel alert service (email, SMS, push) for key user and group events

## Problem Statement

Financial exclusion remains a significant challenge across developing economies, particularly in Africa. Limited banking access and weakening savings culture, exacerbated by economic pressures and increased impulse spending, have created barriers to financial stability. Traditional community savings systems (like Esusu) face trust and efficiency challenges, while formal banking remains inaccessible to many.

## Our Solution

Esusu bridges traditional community savings practices with blockchain technology to create a secure, transparent financial platform that:
- Preserves cultural financial traditions while eliminating trust issues
- Enables financial discipline through smart contract enforcement
- Provides accessible financial tools via mobile devices with minimal bandwidth requirements
- Promotes community cooperation through decentralised technology

### Technology Stack

- **Frontend**: Next.js 15, Tailwind CSS, Shadcn UI components, TypeScript, React 18
- **Blockchain**: Celo Mainnet
- **Smart Contracts**: Solidity, Foundry, UUPS Upgradeable Proxy Standard
- **Development Framework**: Celo Composer
- **Data Storage**: MongoDB with Mongoose
- **Wallet Integration**: Thirdweb v5 (Frontend), Wagmi v2 (Farcaster frames only)
- **AI SDK**: Vercel AI SDK with GOAT SDK
- **Notifications**: Nodemailer (Email), Twilio (SMS)
- **Deployment**: Vercel with GitOps pipeline

## Contract Information
The Esusu protocol has been upgraded to use UUPS (Universal Upgradeable Proxy Standard) upgradeable contracts with a multi-sig governance system. This architecture allows for secure and controlled upgrades while maintaining the same proxy addresses for client integrations.

### Smart Contract Architecture

The system now follows an upgradeable proxy pattern with the following components:

- **Proxy Contracts**: These are the addresses that remain constant across upgrades and should be used for client integrations
- **Implementation Contracts**: These contain the actual logic and can be upgraded via the governance system
- **Multi-sig Governance**: A 3-of-5 multi-sig wallet controls contract upgrades through a Timelock Controller

### Key Benefits

- Proxy addresses remain the same across upgrades
- Implementation contracts can be upgraded securely via governance
- Multi-sig requires 3 of 5 signers for critical operations
- Enhanced security through timelock mechanism

### Contract Addresses

PLACEHOLDER: Contract addresses will be added here in the format:
| Network | Contract | Address |
|---------|----------|---------|
| Celo | MiniSafeFactoryUpgradeable Proxy | `0x...` |
| Celo | MiniSafe Implementation | `0x...` |
| Celo | TokenStorage Implementation | `0x...` |
| Celo | AaveIntegration Implementation | `0x...` |
| Celo | Timelock Controller | `0x...` |
| Celo | Token Storage Proxy | `0x...` |
| Celo | Aave Integration Proxy | `0x...` |
| Celo | MiniSafe Proxy | `0x...` |

Full Contract Repo: https://github.com/emiridbest/esusu-contracts/

## Architecture

```
esusu/
├── frontend/                  # Next.js 15 user app (Thirdweb wallet, MiniSafe UI, utilities)
│   ├── app/                   # App Router pages + API routes (e.g., /api/topup, /api/utilities/electricity/pay)
│   │   ├── thrift/[id]/       # Individual thrift group detail pages with integrated admin controls
│   │   └── thrift-admin/      # Dedicated thrift admin page (legacy, admin functions now in detail pages)
│   ├── components/            # Reusable UI components
│   ├── context/
│   │   ├── miniSafe/          # MiniSafeContext.tsx - deposit/withdraw/break flows
│   │   ├── thrift/            # ThriftContext.tsx - group management + admin functions
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

- **Mini Safe**: Secure savings feature with time-locking capabilities
- **Thrift**: Group savings feature with collaborative contributions
- **Chat Assistant**: AI-powered assistant for performing on-chain transactions and financial advice
  
### UI Enhancements (Thrift)

- **Edit Details**: Group creators can edit off-chain metadata (name, description, cover image URL, category, tags) from:
  - Group card (public list)
  - Your groups table
  - Group details page header
  - Auth: Uses SIWE session to avoid repeated signing; automatically falls back to one-off signed message when needed.

- **Metadata History**: A new `History` tab on the group details page shows the audit trail from `updateLog`, including:
  - Editor wallet (shortened)
  - Timestamp
  - Which fields changed (name, description, coverImageUrl, category, tags)

- **List Filters**: Simple filters above the public group list:
  - Category: substring match (case-insensitive)
  - Tags: comma-separated tokens; all tokens must be present (AND) in the group’s tags (case-insensitive substring)
  - Clear Filters button to reset filters

## Getting Started

### Prerequisites

- Node.js 18.17.0 or later
- npm or yarn
- MongoDB database (local or Atlas)
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/emiridbest/esusu.git
cd esusu
```

2. Install dependencies for both frontend and backend:
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
    - `NEXTAUTH_SECRET` or `SIWE_JWT_SECRET` – Secret for signing SIWE session JWT (used by `/api/auth/*` and `/api/thrift/metadata`).
  - MiniSafe and UX
    - `NEXT_PUBLIC_TOKEN_ADDRESS` – Default ERC20 token used by MiniSafe (optional, defaults to G$ fallback).
    - `NEXT_PUBLIC_REWARD_TOKEN_ADDRESS` – Reward token (EST) for balance display (optional).
    - `NEXT_PUBLIC_REWARD_TOKEN_DECIMALS` – Fallback decimals for reward token (optional, default 18).
    - `NEXT_PUBLIC_TX_TIMEOUT_MS` – Safety timeout for transaction steps (default 120000 ms).
  - Utility payments (server-only in frontend API routes)
    - `PAYMENT_API_KEY` or `API_KEY` – Optional API key required by `/api/topup` and `/api/utilities/electricity/pay`.
    - `TOPUP_RATE_LIMIT_PER_MINUTE` – Per-IP and per-wallet rate limit for topups (default 10/min).
    - `ELECTRICITY_RATE_LIMIT_PER_MINUTE` – Rate limit for electricity endpoint (default 10/min).
    - `CELO_RPC_URL` – Celo RPC for on-chain payment validation (default `https://rpc.ankr.com/celo/e1b2a5b5b759bc650084fe69d99500e25299a5a994fed30fa313ae62b5306ee8`).
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

To build both production applications:

```bash
npm run build
```

To start the production builds:

```bash
npm run start
```

## Technologies Used

- Next.js 15 (App Router across `frontend/`, `backend/`, `farcaster/`)
- React 18 + TypeScript (with strict type checking)
- Tailwind CSS + shadcn/ui components
- Thirdweb v5 (frontend wallet, transactions) and Viem (ABI encoding)
- Wagmi v2 (Farcaster frame connectors, no wallet UI)
- Ethers v6 (server-side on-chain validation in API routes)
- MongoDB + Mongoose (connection caching, migrations/initializer)
- Notifications: Nodemailer (email) and Twilio (SMS)
- AI: Vercel AI SDK (`ai`, `@ai-sdk/*`) and GOAT SDK
- Testing: Jest with React Testing Library

### Recent Updates & Fixes


- Improved validation for all utility payment forms (electricity, airtime, data):
  - Amount, meter number, phone, and plan fields now have stricter checks and clear error messages.
- Enhanced error handling and user feedback:
  - Payment and currency conversion errors are surfaced to users and logged for easier debugging.
- Updated dependency versions (viem, twilio, mongoose, etc.):
  - Ensures compatibility with latest APIs and fixes known type issues.
- Optimized payment logic and token balance checks:
  - All supported tokens (CUSD, USDC, USDT, CELO, G$) use correct decimals and multipliers for accurate payments.
- Refactored UI components for consistency and mobile experience:
  - Unified form layouts, improved color contrast, and standardized feedback across all utility flows.
- Fixed race conditions and edge cases in form validation and submission:
  - Prevents double submissions, handles async validation, and ensures robust user experience.
- Transaction step progress for utility payments:
  - Electricity now show real-time progress for 'Check Balance', 'Send Payment', and 'Pay Electricity Bill'.
  - Step status is updated in sync with backend and wallet actions, providing clear feedback for each stage (success/error/loading).
- Payment summary and conversion improvements:
  - Payment summary and currency conversion are only shown when the entered amount is valid, preventing display of incorrect or zero values.
- Robust validation and error handling:
  - Provider limits, token balance checks, and instant UI feedback block invalid or insufficient payments before transaction initiation.
- Complete Thrift Admin Integration: Moved all admin functionality to individual group pages (`/thrift/[id]`) with contract-based admin detection
- Secure Payout Order Management: Admin can only reorder existing members, preventing arbitrary address addition
- Enhanced Error Handling: All contract errors now show as user-friendly toast notifications instead of console errors
- Early Error Detection: Implemented `estimateGas` calls to catch errors during gas estimation phase
- UI Standardization: Applied pay bills page UI standards across all thrift functionality for consistency
- Accurate Join Date Tracking: Implemented database-backed member join date storage and retrieval
- API Endpoint Creation: New endpoints for member management with proper error handling
- BSON Error Resolution: Fixed ObjectId vs integer groupId query issues in MongoDB
- Connection Pool Optimization: Improved MongoDB connection handling and timeout management
- New Contract Functions: Added `getCurrentRecipient`, `getGroupPayouts`, `activateThriftGroup`, `setPayoutOrder`, `emergencyWithdraw`
- Gas Estimation Error Handling: Early error detection prevents console errors and improves user experience
- Contract Data Priority: Smart contract data takes priority with database as fallback for accuracy
- Backend reliability:
  - Retry logic and error handling for backend currency conversion API (Reloadly) to improve reliability.
- Codebase refactoring:
  - Centralized step status updates and improved context/form logic for instant UI updates and robust state management.
- Refactored frontend currency conversion logic for utility payments (CELO, G$, cUSD, USDC, USDT)
- Fixed DualCurrencyPrice to use correct token price logic (stablecoins 1:1 USD, CELO/G$ via CoinGecko)
- Improved transaction feedback and error handling in ElectricityBillForm
- Backend  `/api/utilities/electricity/pay` endpoints under review for Reloadly authentication issues
- Identified 401 Unauthorized errors from Reloadly sandbox API; troubleshooting API key, endpoint, and network config
- Added Postman test instructions for Reloadly sandbox electricity payments
- Next steps: verify backend credentials, improve error handling, and ensure secure secret management

#### Database & Backend Fixes
- **MongoDB Connection Error Resolution**: Fixed "SRV URI does not support directConnection" error by implementing conditional connection options that detect MongoDB Atlas SRV URIs and only apply `directConnection: true` for standard MongoDB URIs
- **Database Initialization Robustness**: Enhanced error handling in database seeding process with detailed validation error logging to identify specific field validation issues
- **API Route Type Safety**: Fixed TypeScript compilation errors in contribution-status API route by updating parameter types to match Next.js 15 App Router requirements

#### Frontend UI & UX Improvements
- **ThriftProvider Context Fix**: Added missing ThriftProvider to main app providers to resolve "useThrift must be used within a ThriftProvider" error on thrift pages
- **Payment Data Integration**: Implemented blockchain data retrieval for thrift group payment information:
  - Added payment-related fields to ThriftGroup interface (lastPaymentDate, nextPaymentDate, userContribution, etc.)
  - Updated UserCampaigns table to display real payment data from blockchain instead of hardcoded values
  - Enhanced payment date calculations based on group start time and contribution intervals
- **Token Configuration Enhancement**: 
  - Created comprehensive token configuration system with support for CELO, cUSD, USDC, USDT, and G$
  - Updated thrift group creation to allow token selection from predefined list
  - Added date picker for thrift group start date selection
  - Fixed currency display to show correct token symbols instead of defaulting to cUSD
- **UI Visibility Fixes**:
  - Fixed "About Us" navigation tab visibility in both light and dark modes
  - Resolved "Clear Filters" button visibility issues with proper dark mode styling
  - Enhanced button contrast and readability across all themes
- **Action Button Improvements**: Added meaningful action buttons to thrift groups table:
  - "View" button for all users
  - "Edit" button for group creators
  - "Contribute" button for group members
- **Status Display Logic**: Improved group status display with more meaningful states:
  - "Pending" for inactive groups
  - "Active" for active groups with available slots
  - "Full" for active groups at capacity

#### Smart Contract Integration
- **Missing ABI Functions**: Implemented database-backed alternatives for missing smart contract functions:
  - `checkContributionDue`: Fetches contribution status via API endpoint
  - `getUserGroups`: Retrieves user groups from database through API
- **Contract Interaction Robustness**: Added comprehensive error handling for contract calls to prevent crashes when groups don't exist
- **Transaction Timing**: Implemented proper delays after group creation to ensure transaction finality before data refresh
- **Gas Estimation Error Handling**: Implemented early error detection using `estimateGas` calls to catch contract errors before transaction execution
- **Enhanced Contract Functions**: Added new contract interaction methods:
  - `getCurrentRecipient`: Fetch current payout recipient from contract
  - `getGroupPayouts`: Retrieve historical payout data
  - `activateThriftGroup`: Activate inactive thrift groups
  - `setPayoutOrder`: Set member payout sequence
  - `emergencyWithdraw`: Emergency withdrawal functionality for thrift

#### Thrift Admin System Implementation
- **Contract-Based Admin Detection**: Implemented proper group ownership checking using smart contract `admin` field instead of hardcoded addresses
- **Integrated Admin Controls**: Added comprehensive thrift admin functions directly to individual group detail pages (`/thrift/[id]`)
- **Admin Functions Available**:
  - **Activate Group**: Start inactive thrift groups to allow contributions
  - **Set Payout Order**: Define the order members will receive payouts
  - **Distribute Payout**: Distribute payouts to current recipients
  - **Emergency Withdraw**: Emergency withdrawal for critical situations
- **Smart Access Control**: Admin controls only visible to actual group creators/admins based on contract ownership
- **Enhanced ThriftContext**: Added admin functions (`activateThriftGroup`, `setPayoutOrder`, `emergencyWithdraw`) to context for seamless integration
- **UI/UX Improvements**:
  - Clean admin section following pay bills page UI standards
  - Contextual admin functions based on group status (active/inactive)
  - Professional admin dialog for setting payout orders
  - Real-time admin status checking and updates

#### Secure Payout Order Management
- **Member-Only Reordering**: Admin can only reorder existing group members, preventing addition of arbitrary addresses
- **Visual Member Management**: Interactive interface showing all current group members with their addresses
- **Reorder Interface**: Up/down arrows to move members in the payout order with clear position indicators
- **Security Benefits**:
  - No arbitrary address addition (prevents admin from adding personal addresses)
  - Member validation (only existing group members can be included)
  - Transparent process (all members can see current payout order)
  - Audit trail (clear record of payment sequence)
  - Fraud prevention (eliminates possibility of fake addresses)

#### Enhanced Error Handling & User Experience
- **Graceful Error Notifications**: All contract errors now show as user-friendly toast notifications instead of console errors
- **Early Error Detection**: Implemented `estimateGas` calls to catch errors during gas estimation phase
- **Specific Error Messages**: 
  - "Payout order not set" → Clear instruction to set payout order first
  - "Group is not active" → Explanation that admin needs to activate group
  - "Execution reverted" → General guidance to check requirements
  - "Insufficient funds" → Clear instruction to check token balance
- **Always Interactive Buttons**: Contribute and other action buttons are always clickable, providing feedback

#### UI/UX Standardization & Consistency
- **Pay Bills Page UI Standards**: Applied consistent design patterns from pay bills page across thrift functionality
- **Component Standardization**: 
  - Replaced custom gradients with standard shadcn components
  - Unified color schemes and typography across all pages
  - Consistent card layouts and spacing
  - Standardized button variants and interactions
- **Layout Improvements**:
  - Fixed component positioning and nesting issues
  - Proper motion animations with consistent timing
  - Clean, professional appearance matching project standards
  - Responsive design maintained across all screen sizes
- **Visual Consistency**:
  - Unified admin controls styling
  - Consistent form layouts and input styling
  - Standardized dialog and modal designs
  - Professional color palette throughout

#### Database Integration & Data Management
- **Member Join Date Tracking**: Implemented accurate join date storage and retrieval from database
- **API Endpoints**: Created new endpoints for member management:
  - `GET /api/groups/[groupId]/members`: Fetch group members with join dates
  - `POST /api/groups/[groupId]/members`: Add member with timestamp
- **Data Priority System**: Contract data takes priority with database as fallback for accuracy
- **BSON Error Resolution**: Fixed ObjectId vs integer groupId query issues
- **Connection Pool Optimization**: Improved MongoDB connection handling and timeout management
- **Graceful Fallbacks**: Database errors don't break functionality, with proper error handling

#### Code Quality & Maintenance
- **Error Handling**: Enhanced error handling throughout the application with better user feedback and debugging information
- **Type Safety**: Improved TypeScript type definitions and resolved compilation errors
- **Code Organization**: Better separation of concerns between frontend and backend services
- **Documentation**: Updated README with comprehensive fix documentation and improved project structure

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

### Analytics & Dashboard

- `GET /api/analytics` and `POST /api/analytics` (frontend app) – User analytics history and generation.
- `GET /api/dashboard` (frontend app) – User or platform dashboard aggregates.

### Thrift Metadata (off‑chain) & Authentication

- `GET /api/thrift/metadata?contract=0x...&ids=1,2,3` – Batch fetch thrift metadata for groups. Returns array of documents keyed by `(contractAddress, groupId)` with fields `{ name, description, coverImageUrl, category, tags, createdBy, updatedBy, updateLog, createdAt, updatedAt }`.
- `POST /api/thrift/metadata` – Create/update thrift metadata with secure auth.
  - Prefers SIWE session via `esusu_session` httpOnly cookie. Fallback to signed message.
  - Request body (session): `{ contractAddress, groupId, name, description?, coverImageUrl?, category?, tags? }`
  - Request body (signature fallback): add `{ signerAddress, signature, timestamp }` and sign the canonical message:
    ```
    Esusu: Thrift Metadata Update
    contractAddress=<lowercased address>
    groupId=<id>
    name=<name>
    description=<description or empty>
    coverImageUrl=<url or empty>
    category=<category or empty>
    tags=<comma separated or empty>
    timestamp=<unix ms>
    ```
  - Only the creator (`createdBy`) can update. All updates append to `updateLog`.

### Thrift Group Management & Admin Functions

- `GET /api/groups?user=<address>` – Fetch user's thrift groups with admin status
- `GET /api/groups/[groupId]/members` – Get group members with join dates from database
- `POST /api/groups/[groupId]/members` – Store member join date when joining group
- `GET /api/groups/[groupId]/contribution-status?user=<address>` – Check user's contribution status for specific group

**Admin Functions (Smart Contract Integration)**:
- `activateThriftGroup(groupId)` – Activate inactive thrift groups
- `setPayoutOrder(groupId, payoutOrder)` – Set custom payout order for group members
- `distributePayout(groupId)` – Distribute payout to current recipient
- `emergencyWithdraw(groupId)` – Emergency withdrawal for critical situations

**Admin Access Control**:
- Admin functions are only available to group creators (checked via smart contract `admin` field)
- Admin controls appear automatically on group detail pages for authorized users
- Real-time admin status checking ensures proper access control

### Authentication (SIWE)

- `GET /api/auth/siwe/message?address=0x...&chainId=42220&domain=<host>&uri=<origin>` – Build SIWE message.
- `POST /api/auth/siwe/verify` – Verify signature and set `esusu_session` cookie.
- `GET /api/auth/session` – Return `{ authenticated, address }` if session is valid.

Note: Frontend API routes import backend services thanks to `externalDir: true`.

## Security Model for Utility Payments

Critical endpoints like `frontend/app/api/topup/route.ts` (airtime/data) and `frontend/app/api/utilities/electricity/pay/route.ts` enforce on‑chain payment validation before calling providers:
- Decode the ERC20 `transfer(to, amount)` from the provided `transactionHash`.
- Verify the token contract matches the allowed list (cUSD, USDC, USDT on Celo).
- Require at least 1 confirmation and a max transaction age window (10 minutes) to limit replay.
- Derive token decimals dynamically with fallback to ensure amount checks are accurate.
- Enforce recipient equals `RECIPIENT_WALLET` and that `amount >= expectedAmount`.
- Prevent hash replay via `TransactionService.isPaymentHashUsed(transactionHash)`.
- Optional API key and in‑memory rate limiting per IP and per wallet.
- Record transactions in MongoDB and send notifications; mark `completed` or `failed` based on provider result.

### Mobile Access

To access the app via the Celo MiniPay wallet:
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
