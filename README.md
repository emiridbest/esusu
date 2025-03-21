# Esusu: Decentralized Community Savings on Celo

![Esusu Logo](https://github.com/user-attachments/assets/c1e4d15e-d400-477f-a302-98ba9e40135d)

## Overview

Esusu is a decentralized application (DApp) built on the Celo Mainnet that modernizes traditional community savings systems. It enables financial inclusion through a 3-in-1 solution that combines collaborative savings, personal finance management, and bill payment capabilities.

## Features

### 1. Thrift Contribution System(Coming soon)
- Users join campaigns where they contribute funds monthly
- Each month, one participant receives the pooled contributions
- Provides access to bulk capital without traditional borrowing
- Smart contracts ensure transparency and secure fund distribution

### 2. MiniSafe Box (Time-locked Savings)
- Personal savings with customizable time-locking
- Earn MST (MiniSafe Tokens) as rewards for maintaining locked savings
- Incentivizes financial discipline and long-term planning

### 3. Bill Payment System(Coming soon)
- Pay utility bills directly through the platform
- Make charitable donations to various projects
- Low-cost transactions using Celo's efficient blockchain

## Problem Statement

Financial exclusion remains a significant challenge across developing economies, particularly in Africa. Limited banking access and a weakening savings culture, exacerbated by economic pressures and increased impulse spending, have created barriers to financial stability. Traditional community savings systems (like Esusu) face trust and efficiency challenges, while formal banking remains inaccessible to many.

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

## Recent Achievements (Proof of Ship Season 2)

| Date | Milestone |
|------|-----------|
| Mar 2-14 | AI Agent Research for trading capabilities |
| Mar 8-23 | Frontend redesign and implementation |
| Mar 15-25 | Community building and user feedback collection |
| Mar 20-25 | UI improvements based on user feedback |
| Mar 20 | Smart contract update to fix redundancy in Breaktimelock functionality |

## Roadmap (Next Month)

- [ ] Update smart contract to production state
- [ ] Integrate with Aave protocol
- [ ] Implement Gooddollar deposits
- [ ] Incorporate Gooddollar identity verification
- [ ] Complete smart contract audit
- [ ] Expand community reach

## Getting Started

### Prerequisites
- Node.js and Yarn installed
- Minipay wallet

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/emiridbest/esusu.git
   cd esusu
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Start the development server:
   ```bash
   yarn run dev
   ```

4. Visit `http://localhost:3000` in your browser to view the application.

### Mobile Access

To access the app via Celo Minipay wallet:
1. Open the Minipay app
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
