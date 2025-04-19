import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BalanceCard from '@/components/miniSafe/BalanceCard';

// Mock the MiniSafeContext
const mockMiniSafeContext = {
  celoBalance: '10.5',
  cusdBalance: '100.75',
  goodDollarBalance: '50.25',
  tokenBalance: '20',
  selectedToken: 'cUSD',
  handleTokenChange: jest.fn(),
  isLoading: false,
  getBalance: jest.fn(),
  getTokenBalance: jest.fn(),
  formatBalance: jest.fn((balance) => {
    const balanceNumber = parseFloat(balance);
    return balanceNumber.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }),
  interestRate: 5,
  // Required props to satisfy TypeScript
  cUsdTokenAddress: '',
  celoAddress: '',
  goodDollarAddress: '',
  depositAmount: 0,
  setDepositAmount: jest.fn(),
  withdrawAmount: 0,
  setWithdrawAmount: jest.fn(),
  setSelectedToken: jest.fn(),
  isApproved: false,
  setIsApproved: jest.fn(),
  isApproving: false,
  isWaitingTx: false,
  approveSpend: jest.fn(),
  handleDeposit: jest.fn(),
  handleWithdraw: jest.fn(),
  handleBreakLock: jest.fn(),
};

// Mock the useMiniSafe hook
jest.mock('@/context/miniSafe/MiniSafeContext', () => ({
  useMiniSafe: () => mockMiniSafeContext
}));

describe('BalanceCard Component', () => {
  test('renders the component with balances', () => {
    render(<BalanceCard />);
    
    // Check if component renders with appropriate content
    expect(screen.getByText('My Savings')).toBeInTheDocument();
    expect(screen.getByText('CELO Balance')).toBeInTheDocument();
    expect(screen.getByText('cUSD Balance')).toBeInTheDocument();
    expect(screen.getByText('G$ Balance')).toBeInTheDocument();
    expect(screen.getByText('EST Tokens')).toBeInTheDocument();
    
    // Check if balances are displayed correctly
    expect(screen.getByText('10.50')).toBeInTheDocument(); // CELO balance
    expect(screen.getByText('100.75')).toBeInTheDocument(); // cUSD balance
    expect(screen.getByText('50.25')).toBeInTheDocument(); // G$ balance
    expect(screen.getByText('20')).toBeInTheDocument(); // EST tokens
  });

  test('displays interest rate message when cusdBalance is greater than 0', () => {
    render(<BalanceCard />);
    
    expect(screen.getByText(/Your assets are earning approximately 5% APY in EST tokens/)).toBeInTheDocument();
  });

  test('calls refresh functions when refresh button is clicked', () => {
    render(<BalanceCard />);
    
    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);
    
    expect(mockMiniSafeContext.getBalance).toHaveBeenCalledTimes(1);
    expect(mockMiniSafeContext.getTokenBalance).toHaveBeenCalledTimes(1);
  });

  test('shows loading state when isLoading is true', () => {
    // Override the mock to set isLoading to true
    const loadingMock = {
      ...mockMiniSafeContext,
      isLoading: true
    };
    
    jest.spyOn(require('@/context/miniSafe/MiniSafeContext'), 'useMiniSafe').mockImplementation(() => loadingMock);
    
    render(<BalanceCard />);
    
    // Check if skeletons are rendered
    const skeletons = document.querySelectorAll('.h-5');
    expect(skeletons.length).toBeGreaterThan(0);
    
    // Check that balances are not rendered when loading
    expect(screen.queryByText('10.50')).not.toBeInTheDocument();
  });
});