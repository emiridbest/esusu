jest.mock('react-toastify', () => ({
    toast: {
      success: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    },
    ToastContainer: () => <div data-testid="toast-container" />,
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
      div: ({ children, ...props }) => <div {...props}>{children}</div>,
    },
  }));
  
  jest.mock('@/components/TransactionList', () => {
    return function MockTransactionList() {
      return <div data-testid="transaction-list" />;
    };
  });