import { Abi } from "viem";

export const contractAddress = "0xD7154A32280c31a510BF248CE35F2627162227b4";
export const abi = [
	{
	  "type": "constructor",
	  "inputs": [],
	  "stateMutability": "nonpayable"
	},
	{
	  "type": "receive",
	  "stateMutability": "payable"
	},
	{
	  "type": "function",
	  "name": "CELO_TOKEN_ADDRESS",
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
	  "name": "CUSD_TOKEN_ADDRESS",
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
	  "name": "balances",
	  "inputs": [
		{
		  "name": "",
		  "type": "address",
		  "internalType": "address"
		}
	  ],
	  "outputs": [
		{
		  "name": "celoBalance",
		  "type": "uint256",
		  "internalType": "uint256"
		},
		{
		  "name": "cUsdBalance",
		  "type": "uint256",
		  "internalType": "uint256"
		},
		{
		  "name": "depositTime",
		  "type": "uint256",
		  "internalType": "uint256"
		},
		{
		  "name": "tokenIncentive",
		  "type": "uint256",
		  "internalType": "uint256"
		}
	  ],
	  "stateMutability": "view"
	},
	{
	  "type": "function",
	  "name": "breakTimelock",
	  "inputs": [
		{
		  "name": "tokenAddress",
		  "type": "address",
		  "internalType": "address"
		}
	  ],
	  "outputs": [],
	  "stateMutability": "payable"
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
	  "name": "deposit",
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
	  "stateMutability": "payable"
	},
	{
	  "type": "function",
	  "name": "downliners",
	  "inputs": [
		{
		  "name": "",
		  "type": "address",
		  "internalType": "address"
		},
		{
		  "name": "",
		  "type": "uint256",
		  "internalType": "uint256"
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
	  "name": "due",
	  "inputs": [],
	  "outputs": [
		{
		  "name": "",
		  "type": "bool",
		  "internalType": "bool"
		}
	  ],
	  "stateMutability": "view"
	},
	{
	  "type": "function",
	  "name": "getBalance",
	  "inputs": [
		{
		  "name": "account",
		  "type": "address",
		  "internalType": "address"
		},
		{
		  "name": "tokenAddress",
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
	  "name": "getDownliners",
	  "inputs": [
		{
		  "name": "upliner",
		  "type": "address",
		  "internalType": "address"
		}
	  ],
	  "outputs": [
		{
		  "name": "",
		  "type": "address[]",
		  "internalType": "address[]"
		}
	  ],
	  "stateMutability": "view"
	},
	{
	  "type": "function",
	  "name": "lockDuration",
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
	  "name": "setUpliner",
	  "inputs": [
		{
		  "name": "upliner",
		  "type": "address",
		  "internalType": "address"
		}
	  ],
	  "outputs": [],
	  "stateMutability": "nonpayable"
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
	  "name": "timeSinceDeposit",
	  "inputs": [
		{
		  "name": "depositor",
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
	  "name": "upliners",
	  "inputs": [
		{
		  "name": "",
		  "type": "address",
		  "internalType": "address"
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
		  "name": "tokenAddress",
		  "type": "address",
		  "internalType": "address"
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
	  "name": "Deposited",
	  "inputs": [
		{
		  "name": "depositor",
		  "type": "address",
		  "indexed": true,
		  "internalType": "address"
		},
		{
		  "name": "amount",
		  "type": "uint256",
		  "indexed": false,
		  "internalType": "uint256"
		},
		{
		  "name": "token",
		  "type": "address",
		  "indexed": true,
		  "internalType": "address"
		}
	  ],
	  "anonymous": false
	},
	{
	  "type": "event",
	  "name": "RewardDistributed",
	  "inputs": [
		{
		  "name": "upliner",
		  "type": "address",
		  "indexed": true,
		  "internalType": "address"
		},
		{
		  "name": "depositor",
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
	  "name": "TimelockBroken",
	  "inputs": [
		{
		  "name": "breaker",
		  "type": "address",
		  "indexed": true,
		  "internalType": "address"
		},
		{
		  "name": "totalSavings",
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
	  "name": "UplinerSet",
	  "inputs": [
		{
		  "name": "user",
		  "type": "address",
		  "indexed": true,
		  "internalType": "address"
		},
		{
		  "name": "upliner",
		  "type": "address",
		  "indexed": true,
		  "internalType": "address"
		}
	  ],
	  "anonymous": false
	},
	{
	  "type": "event",
	  "name": "Withdrawn",
	  "inputs": [
		{
		  "name": "withdrawer",
		  "type": "address",
		  "indexed": true,
		  "internalType": "address"
		},
		{
		  "name": "amount",
		  "type": "uint256",
		  "indexed": false,
		  "internalType": "uint256"
		},
		{
		  "name": "token",
		  "type": "address",
		  "indexed": true,
		  "internalType": "address"
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
	},
	{
	  "type": "error",
	  "name": "ReentrancyGuardReentrantCall",
	  "inputs": []
	}
  ]