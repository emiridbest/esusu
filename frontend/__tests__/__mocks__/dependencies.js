// Import React for JSX support
const React = require('react');

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
  ToastContainer: () => {
    const mockReact = require('react');
    return mockReact.createElement('div', { 'data-testid': 'toast-container' });
  },
}));

jest.mock('ethers', () => {
  return {
    BrowserProvider: jest.fn(),
    Contract: jest.fn(),
    formatUnits: jest.fn((value) => '5.0'),
  };
});

jest.mock('viem', () => ({
  parseEther: jest.fn((value) => BigInt(value * 10**18)),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => {
      const mockReact = require('react');
      return mockReact.createElement('div', props, children);
    },
  },
}));

jest.mock('@/components/TransactionList', () => {
  return function MockTransactionList() {
    const mockReact = require('react');
    return mockReact.createElement('div', { 'data-testid': 'transaction-list' });
  };
});