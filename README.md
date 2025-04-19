# Esusu Platform

A financial management platform that provides savings solutions and blockchain-based transactions.

## Project Structure

This project has been upgraded to Next.js 15 and reorganized into a monorepo with separate frontend and backend applications:

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
