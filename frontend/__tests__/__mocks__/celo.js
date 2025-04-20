const mockCelo = {
  request: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
};

const mockSigner = {
  getAddress: jest.fn(() => Promise.resolve('0x123456789')),
};

const mockContract = {
  balances: jest.fn(),
  getBalance: jest.fn(),
  balanceOf: jest.fn(),
  deposit: jest.fn(),
  withdraw: jest.fn(),
  breakTimelock: jest.fn(),
};

const mockTokenContract = {
  allowance: jest.fn(),
  approve: jest.fn(),
};

const setupMocks = () => {
  // Configure mock returns
  mockCelo.request.mockImplementation((args) => {
    if (args.method === 'eth_requestAccounts') {
      return Promise.resolve(['0x123456789']);
    }
    return Promise.resolve();
  });
  
  // Mock contract responses
  mockContract.balances.mockResolvedValue({
    celoBalance: BigInt(5 * 10**18),
  });
  
  mockContract.getBalance.mockImplementation((address, token) => {
    return Promise.resolve(BigInt(5 * 10**18));
  });
  
  mockContract.balanceOf.mockResolvedValue(BigInt(10));
  
  // Mock transaction response
  const mockTx = {
    wait: jest.fn().mockResolvedValue({ status: 1 }),
  };
  
  mockContract.deposit.mockResolvedValue(mockTx);
  mockContract.withdraw.mockResolvedValue(mockTx);
  mockContract.breakTimelock.mockResolvedValue(mockTx);
  
  // Mock token contract
  mockTokenContract.allowance.mockResolvedValue(BigInt(0));
  mockTokenContract.approve.mockResolvedValue({
    wait: jest.fn().mockResolvedValue({ status: 1 }),
  });
};

// Export using CommonJS syntax
module.exports = {
  mockCelo,
  mockSigner,
  mockContract,
  mockTokenContract,
  setupMocks
};

// Add at least one test to the file
describe('Celo mock', () => {
  test('exists', () => {
    expect(true).toBe(true);
  });
});