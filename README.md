
## ESUSU

### Overview
ESUSU is a decentralized application (DApp) built on the Celo Mainnet  that facilitates stablecoin contributions through a collective savings model known as Esusu in many African communities. The DApp allows users to create and join campaigns, contribute funds, and track campaign details transparently on the blockchain.

The dApp is a 3 in 1 solution to solving issues related to financial inclusion and poor savings trend. the sectios are 
- Esusu thrift contribution => % users joibn a contribution campaign where they pool their funds evrymonth for 5 months . For every month a unique user takes home the total contribution giving everyone access to `bulk money` which naturally the couldnt have saved up. This also elemintaes the need to borrow money for fundung big projects.
- Esusu piggy box => Funds are locked up over time so that users no longer have access to them. They earn `MST` tokens for locking up funds but loss these tokens if the decide to break the lock.
- Esusu pay bills => users can pay for their utility and also make donations to their various projects.

![image](https://github.com/emiridbest/esusu/assets/6362475/be3da0ba-5da9-47ea-a1eb-f3dd886485ef)


### Features of Esusu Thrift Contribution
- Create and manage campaigns
- Join existing campaigns => To join a campaign, users must `stake` (`contributionAmount` * 5) so that they can be held accountable.
- On `staking`, users earn 5 `EST` tokens
- Contribute funds to campaigns
- View campaign details such as description, contribution amount, payout interval, total contributions, and more
- Track last payout block and user participation
- When any user cannot meet the contribution responsibility for the month, the `defaultpayment` contribution is triggerred so the  `contributionAmount`  is deducted from the staked amount and also a penalty of 1 `EST` token.

### Technologies Used
- **Frontend**: Next.js, Tailwind CSS, Typescript
- **Backend**: Solidity, Ethereum blockchain
- **Smart Contracts**: Web3.js, ethers.js
- **Deployment**: Celo Mainnet
-  **Contract Address**: 0xf9d3f0cde68a24d4da3a1c9dd31952d85855c691
-  **Tokens**: `EST` Esusu Tokens as reward for staking  and `MST` MiniSafe Token as reward for locking up funds.
- **Sourcify Verification Link**: https://repo.sourcify.dev/contracts/full_match/42220/0xf9D3F0cdE68A24d4da3a1c9dD31952D85855C691/sources/
### Setup Instructions
1. Clone the repository:
   ```
   git clone https://github.com/emiridbest/esusu.git
   ```
2. Install dependencies:
   ```
   yarn install
   ```
3. Start the development server:
   ```
   yarn run dev
   ```
4. Visit `http://localhost:3000` in your browser to view the application.

### Usage
- Create an account or connect your Celo Minipay wallet.
- Go to the `site tester` in mini pay and enter http://esusu-one.vercel.app
- **Esusu thrift**
- Explore available campaigns or create your own.
- Join campaigns to start contributing funds.
- Track campaign progress and participate in payouts.

### Contributing
Contributions are welcome! Please follow the standard GitHub flow:
1. Fork the repository
2. Create a new branch (`git checkout -b feature/<feature-name>`)
3. Make your changes
4. Commit your changes (`git commit -am 'Add new feature'`)
5. Push to the branch (`git push origin feature/<feature-name>`)
6. Create a new Pull Request

### License
This project is licensed under the [MIT License](LICENSE).

### TO DO
- Fully implement the `stake()` logic


![1](https://github.com/emiridbest/esusu/assets/6362475/d7c54cc5-3c23-433d-a935-3d09975102c7)

![2](https://github.com/emiridbest/esusu/assets/6362475/b30de746-c2db-4a43-a976-2c00eea408f3)

![3](https://github.com/emiridbest/esusu/assets/6362475/0c958d2d-b537-45f1-91d8-3b6c4c883011)
![4](https://github.com/emiridbest/esusu/assets/6362475/4b27f0c8-4a3c-4b7c-b17d-c8b8fc3879e2)

![5](https://github.com/emiridbest/esusu/assets/6362475/12111a40-8c3f-4039-9167-b4e02c0bed2f)


![6](https://github.com/emiridbest/esusu/assets/6362475/478530fd-0568-41b5-9485-78ad207f3465)


![8](https://github.com/emiridbest/esusu/assets/6362475/ef36d162-66fc-49d0-a43c-fe9a45081532)


![9](https://github.com/emiridbest/esusu/assets/6362475/1a28931f-c967-4463-9ee8-0710e7114e7c)


![10](https://github.com/emiridbest/esusu/assets/6362475/0e1d0a9e-c1fd-4997-ab42-d0dcfb69df43)





---
