export const contractAddress = "0x8b9e9324E44Cbc78F21CcA71C1Cb84062c590826" //"0xf9d3f0cde68a24d4da3a1c9dd31952d85855c691";

export const abi = [
	{
	  "type": "constructor",
	  "inputs": [],
	  "stateMutability": "nonpayable"
	},
	{
	  "type": "function",
	  "name": "allowance",
	  "inputs": [
		{
		  "name": "owner",
		  "type": "address",
		  "internalType": "address"
		},
		{
		  "name": "spender",
		  "type": "address",
		  "internalType": "address"
		}
	  ],
	  "outputs": [
		{
		  "name": "",
		  "type": "uint256",
		  "internalType": "uint256"
		}
	  ],
	  "stateMutability": "view"
	},
	{
	  "type": "function",
	  "name": "approve",
	  "inputs": [
		{
		  "name": "spender",
		  "type": "address",
		  "internalType": "address"
		},
		{
		  "name": "value",
		  "type": "uint256",
		  "internalType": "uint256"
		}
	  ],
	  "outputs": [
		{
		  "name": "",
		  "type": "bool",
		  "internalType": "bool"
		}
	  ],
	  "stateMutability": "nonpayable"
	},
	{
	  "type": "function",
	  "name": "balanceOf",
	  "inputs": [
		{
		  "name": "account",
		  "type": "address",
		  "internalType": "address"
		}
	  ],
	  "outputs": [
		{
		  "name": "",
		  "type": "uint256",
		  "internalType": "uint256"
		}
	  ],
	  "stateMutability": "view"
	},
	{
	  "type": "function",
	  "name": "campaignContributions",
	  "inputs": [
		{
		  "name": "",
		  "type": "uint256",
		  "internalType": "uint256"
		},
		{
		  "name": "",
		  "type": "address",
		  "internalType": "address"
		}
	  ],
	  "outputs": [
		{
		  "name": "",
		  "type": "uint256",
		  "internalType": "uint256"
		}
	  ],
	  "stateMutability": "view"
	},
	{
	  "type": "function",
	  "name": "campaignCounter",
	  "inputs": [],
	  "outputs": [
		{
		  "name": "",
		  "type": "uint256",
		  "internalType": "uint256"
		}
	  ],
	  "stateMutability": "view"
	},
	{
	  "type": "function",
	  "name": "campaigns",
	  "inputs": [
		{
		  "name": "",
		  "type": "uint256",
		  "internalType": "uint256"
		}
	  ],
	  "outputs": [
		{
		  "name": "name",
		  "type": "string",
		  "internalType": "string"
		},
		{
		  "name": "description",
		  "type": "string",
		  "internalType": "string"
		},
		{
		  "name": "contributionAmount",
		  "type": "uint256",
		  "internalType": "uint256"
		},
		{
		  "name": "payoutInterval",
		  "type": "uint256",
		  "internalType": "uint256"
		},
		{
		  "name": "lastPayoutBlock",
		  "type": "uint256",
		  "internalType": "uint256"
		},
		{
		  "name": "totalContributions",
		  "type": "uint256",
		  "internalType": "uint256"
		},
		{
		  "name": "monthlyContribution",
		  "type": "uint256",
		  "internalType": "uint256"
		},
		{
		  "name": "withdrawIndex",
		  "type": "uint256",
		  "internalType": "uint256"
		},
		{
		  "name": "id",
		  "type": "uint256",
		  "internalType": "uint256"
		}
	  ],
	  "stateMutability": "view"
	},
	{
	  "type": "function",
	  "name": "contribute",
	  "inputs": [
		{
		  "name": "tokenAddress",
		  "type": "address",
		  "internalType": "address"
		},
		{
		  "name": "amount",
		  "type": "uint256",
		  "internalType": "uint256"
		}
	  ],
	  "outputs": [],
	  "stateMutability": "nonpayable"
	},
	{
	  "type": "function",
	  "name": "createCampaign",
	  "inputs": [
		{
		  "name": "_name",
		  "type": "string",
		  "internalType": "string"
		},
		{
		  "name": "_description",
		  "type": "string",
		  "internalType": "string"
		},
		{
		  "name": "_contributionAmount",
		  "type": "uint256",
		  "internalType": "uint256"
		}
	  ],
	  "outputs": [],
	  "stateMutability": "nonpayable"
	},
	{
	  "type": "function",
	  "name": "decimals",
	  "inputs": [],
	  "outputs": [
		{
		  "name": "",
		  "type": "uint8",
		  "internalType": "uint8"
		}
	  ],
	  "stateMutability": "view"
	},
	{
	  "type": "function",
	  "name": "fixedToken",
	  "inputs": [],
	  "outputs": [
		{
		  "name": "",
		  "type": "address",
		  "internalType": "contract IERC20"
		}
	  ],
	  "stateMutability": "view"
	},
	{
	  "type": "function",
	  "name": "getAllCampaigns",
	  "inputs": [],
	  "outputs": [
		{
		  "name": "",
		  "type": "uint256[]",
		  "internalType": "uint256[]"
		}
	  ],
	  "stateMutability": "view"
	},
	{
	  "type": "function",
	  "name": "getCampaignDetails",
	  "inputs": [
		{
		  "name": "campaignId",
		  "type": "uint256",
		  "internalType": "uint256"
		}
	  ],
	  "outputs": [
		{
		  "name": "",
		  "type": "string",
		  "internalType": "string"
		},
		{
		  "name": "",
		  "type": "string",
		  "internalType": "string"
		},
		{
		  "name": "",
		  "type": "uint256",
		  "internalType": "uint256"
		},
		{
		  "name": "",
		  "type": "uint256",
		  "internalType": "uint256"
		},
		{
		  "name": "",
		  "type": "uint256",
		  "internalType": "uint256"
		},
		{
		  "name": "",
		  "type": "uint256",
		  "internalType": "uint256"
		},
		{
		  "name": "",
		  "type": "string",
		  "internalType": "string"
		},
		{
		  "name": "",
		  "type": "uint256",
		  "internalType": "uint256"
		}
	  ],
	  "stateMutability": "view"
	},
	{
	  "type": "function",
	  "name": "joinCampaign",
	  "inputs": [
		{
		  "name": "campaignId",
		  "type": "uint256",
		  "internalType": "uint256"
		},
		{
		  "name": "tokenAddress",
		  "type": "address",
		  "internalType": "address"
		},
		{
		  "name": "userName",
		  "type": "string",
		  "internalType": "string"
		}
	  ],
	  "outputs": [],
	  "stateMutability": "payable"
	},
	{
	  "type": "function",
	  "name": "monthlyContribution",
	  "inputs": [],
	  "outputs": [
		{
		  "name": "",
		  "type": "uint256",
		  "internalType": "uint256"
		}
	  ],
	  "stateMutability": "view"
	},
	{
	  "type": "function",
	  "name": "name",
	  "inputs": [],
	  "outputs": [
		{
		  "name": "",
		  "type": "string",
		  "internalType": "string"
		}
	  ],
	  "stateMutability": "view"
	},
	{
	  "type": "function",
	  "name": "owner",
	  "inputs": [],
	  "outputs": [
		{
		  "name": "",
		  "type": "address",
		  "internalType": "address"
		}
	  ],
	  "stateMutability": "view"
	},
	{
	  "type": "function",
	  "name": "payoutInterval",
	  "inputs": [],
	  "outputs": [
		{
		  "name": "",
		  "type": "uint256",
		  "internalType": "uint256"
		}
	  ],
	  "stateMutability": "view"
	},
	{
	  "type": "function",
	  "name": "stakingRequirementMultiplier",
	  "inputs": [],
	  "outputs": [
		{
		  "name": "",
		  "type": "uint256",
		  "internalType": "uint256"
		}
	  ],
	  "stateMutability": "view"
	},
	{
	  "type": "function",
	  "name": "stakings",
	  "inputs": [
		{
		  "name": "",
		  "type": "address",
		  "internalType": "address"
		}
	  ],
	  "outputs": [
		{
		  "name": "isStaking",
		  "type": "bool",
		  "internalType": "bool"
		},
		{
		  "name": "stakedAmount",
		  "type": "uint256",
		  "internalType": "uint256"
		},
		{
		  "name": "earnedTokens",
		  "type": "uint256",
		  "internalType": "uint256"
		}
	  ],
	  "stateMutability": "view"
	},
	{
	  "type": "function",
	  "name": "symbol",
	  "inputs": [],
	  "outputs": [
		{
		  "name": "",
		  "type": "string",
		  "internalType": "string"
		}
	  ],
	  "stateMutability": "view"
	},
	{
	  "type": "function",
	  "name": "totalContributions",
	  "inputs": [],
	  "outputs": [
		{
		  "name": "",
		  "type": "uint256",
		  "internalType": "uint256"
		}
	  ],
	  "stateMutability": "view"
	},
	{
	  "type": "function",
	  "name": "totalSupply",
	  "inputs": [],
	  "outputs": [
		{
		  "name": "",
		  "type": "uint256",
		  "internalType": "uint256"
		}
	  ],
	  "stateMutability": "view"
	},
	{
	  "type": "function",
	  "name": "transfer",
	  "inputs": [
		{
		  "name": "to",
		  "type": "address",
		  "internalType": "address"
		},
		{
		  "name": "value",
		  "type": "uint256",
		  "internalType": "uint256"
		}
	  ],
	  "outputs": [
		{
		  "name": "",
		  "type": "bool",
		  "internalType": "bool"
		}
	  ],
	  "stateMutability": "nonpayable"
	},
	{
	  "type": "function",
	  "name": "transferFrom",
	  "inputs": [
		{
		  "name": "from",
		  "type": "address",
		  "internalType": "address"
		},
		{
		  "name": "to",
		  "type": "address",
		  "internalType": "address"
		},
		{
		  "name": "value",
		  "type": "uint256",
		  "internalType": "uint256"
		}
	  ],
	  "outputs": [
		{
		  "name": "",
		  "type": "bool",
		  "internalType": "bool"
		}
	  ],
	  "stateMutability": "nonpayable"
	},
	{
	  "type": "function",
	  "name": "updatePayoutInterval",
	  "inputs": [
		{
		  "name": "_payoutInterval",
		  "type": "uint256",
		  "internalType": "uint256"
		}
	  ],
	  "outputs": [],
	  "stateMutability": "nonpayable"
	},
	{
	  "type": "function",
	  "name": "userNameToAddress",
	  "inputs": [
		{
		  "name": "",
		  "type": "string",
		  "internalType": "string"
		}
	  ],
	  "outputs": [
		{
		  "name": "",
		  "type": "address",
		  "internalType": "address"
		}
	  ],
	  "stateMutability": "view"
	},
	{
	  "type": "function",
	  "name": "withdraw",
	  "inputs": [
		{
		  "name": "campaignId",
		  "type": "uint256",
		  "internalType": "uint256"
		}
	  ],
	  "outputs": [],
	  "stateMutability": "nonpayable"
	},
	{
	  "type": "event",
	  "name": "Approval",
	  "inputs": [
		{
		  "name": "owner",
		  "type": "address",
		  "indexed": true,
		  "internalType": "address"
		},
		{
		  "name": "spender",
		  "type": "address",
		  "indexed": true,
		  "internalType": "address"
		},
		{
		  "name": "value",
		  "type": "uint256",
		  "indexed": false,
		  "internalType": "uint256"
		}
	  ],
	  "anonymous": false
	},
	{
	  "type": "event",
	  "name": "CampaignCreated",
	  "inputs": [
		{
		  "name": "creator",
		  "type": "address",
		  "indexed": true,
		  "internalType": "address"
		},
		{
		  "name": "campaignId",
		  "type": "uint256",
		  "indexed": false,
		  "internalType": "uint256"
		},
		{
		  "name": "contributionAmount",
		  "type": "uint256",
		  "indexed": false,
		  "internalType": "uint256"
		}
	  ],
	  "anonymous": false
	},
	{
	  "type": "event",
	  "name": "ContributionMade",
	  "inputs": [
		{
		  "name": "participant",
		  "type": "address",
		  "indexed": true,
		  "internalType": "address"
		},
		{
		  "name": "amount",
		  "type": "uint256",
		  "indexed": false,
		  "internalType": "uint256"
		}
	  ],
	  "anonymous": false
	},
	{
	  "type": "event",
	  "name": "Defaulted",
	  "inputs": [
		{
		  "name": "participant",
		  "type": "address",
		  "indexed": true,
		  "internalType": "address"
		},
		{
		  "name": "amount",
		  "type": "uint256",
		  "indexed": false,
		  "internalType": "uint256"
		}
	  ],
	  "anonymous": false
	},
	{
	  "type": "event",
	  "name": "Staked",
	  "inputs": [
		{
		  "name": "participant",
		  "type": "address",
		  "indexed": true,
		  "internalType": "address"
		},
		{
		  "name": "amount",
		  "type": "uint256",
		  "indexed": false,
		  "internalType": "uint256"
		}
	  ],
	  "anonymous": false
	},
	{
	  "type": "event",
	  "name": "Transfer",
	  "inputs": [
		{
		  "name": "from",
		  "type": "address",
		  "indexed": true,
		  "internalType": "address"
		},
		{
		  "name": "to",
		  "type": "address",
		  "indexed": true,
		  "internalType": "address"
		},
		{
		  "name": "value",
		  "type": "uint256",
		  "indexed": false,
		  "internalType": "uint256"
		}
	  ],
	  "anonymous": false
	},
	{
	  "type": "event",
	  "name": "Withdrawn",
	  "inputs": [
		{
		  "name": "participant",
		  "type": "address",
		  "indexed": true,
		  "internalType": "address"
		},
		{
		  "name": "amount",
		  "type": "uint256",
		  "indexed": false,
		  "internalType": "uint256"
		}
	  ],
	  "anonymous": false
	},
	{
	  "type": "error",
	  "name": "ERC20InsufficientAllowance",
	  "inputs": [
		{
		  "name": "spender",
		  "type": "address",
		  "internalType": "address"
		},
		{
		  "name": "allowance",
		  "type": "uint256",
		  "internalType": "uint256"
		},
		{
		  "name": "needed",
		  "type": "uint256",
		  "internalType": "uint256"
		}
	  ]
	},
	{
	  "type": "error",
	  "name": "ERC20InsufficientBalance",
	  "inputs": [
		{
		  "name": "sender",
		  "type": "address",
		  "internalType": "address"
		},
		{
		  "name": "balance",
		  "type": "uint256",
		  "internalType": "uint256"
		},
		{
		  "name": "needed",
		  "type": "uint256",
		  "internalType": "uint256"
		}
	  ]
	},
	{
	  "type": "error",
	  "name": "ERC20InvalidApprover",
	  "inputs": [
		{
		  "name": "approver",
		  "type": "address",
		  "internalType": "address"
		}
	  ]
	},
	{
	  "type": "error",
	  "name": "ERC20InvalidReceiver",
	  "inputs": [
		{
		  "name": "receiver",
		  "type": "address",
		  "internalType": "address"
		}
	  ]
	},
	{
	  "type": "error",
	  "name": "ERC20InvalidSender",
	  "inputs": [
		{
		  "name": "sender",
		  "type": "address",
		  "internalType": "address"
		}
	  ]
	},
	{
	  "type": "error",
	  "name": "ERC20InvalidSpender",
	  "inputs": [
		{
		  "name": "spender",
		  "type": "address",
		  "internalType": "address"
		}
	  ]
	}
  ]