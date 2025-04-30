# Esusu: Decentralized Community Savings on Celo

![Esusu Logo](https://github.com/user-attachments/assets/c1e4d15e-d400-477f-a302-98ba9e40135d)

## Overview

Esusu is a decentralized application (DApp) built on the Celo Mainnet that modernizes traditional community savings systems. It enables financial inclusion through a 3-in-1 solution that combines collaborative savings, personal finance management, and bill payment capabilities.

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
- Promotes community cooperation through decentralized technology

## Technology Stack

- **Frontend**: Next.js, Tailwind CSS, Shadcn UI components, TypeScript
- **Blockchain**: Celo Mainnet
- **Smart Contracts**: Solidity, Foundry
- **Development Framework**: Celo Composer
- **Data Storage**: MongoDB
- **SDK**: Goat SDK

## Contract Information

- **Current Esusu Piggy Box Contract**: `0x4f2823A3AACa8eA1B427ABC5750Ccb3D4E8C4AC7`
- **Former Contract**: `0xD7154A32280c31a510BF248CE35F2627162227b4`
- **Token**: MST (MiniSafe Token) - Rewards for locking up funds

```
esusu/
├── frontend/            # Next.js 15 frontend application
│   ├── app/             # App Router components and routes
│   ├── components/      # Reusable React components
│   ├── public/          # Static assets
│   └── ...
├── backend/             # Next.js 15 backend API server
│   ├── app/             # API routes
│   └── ...
└── ...
```

## Features

- **Mini Safe**: Secure savings feature
- **Thrift**: Group savings feature
- **Chat Assistant**: AI-powered assistant for performing onchain transactions

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

### Environment Setup

1. Configure your frontend environment variables in `frontend/.env`:
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

2. Configure your backend environment variables in `backend/.env`:
```
PORT=3001
OPENAI_API_KEY=your_openai_api_key_here
WALLET_PRIVATE_KEY=your_wallet_private_key_here
RPC_PROVIDER_URL=your_rpc_provider_url_here
```

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

- Next.js 15
- React 18
- TypeScript
- Tailwind CSS
- OpenAI SDK
- Viem for Blockchain Interactions
- GOAT SDK for Web3 Integration



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
