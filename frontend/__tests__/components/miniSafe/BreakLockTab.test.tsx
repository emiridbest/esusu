import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BreakLockTab from '@/components/miniSafe/BreakLockTab';

// Mock the MiniSafeContext
const mockMiniSafeContext = {
  selectedToken: 'cUSD',
  tokenBalance: '10', // Default to not enough tokens
  isWaitingTx: false,
  handleBreakLock: jest.fn(),
  // Required props to satisfy TypeScript
  cUsdTokenAddress: '',
  celoAddress: '',
  goodDollarAddress: '',
  depositAmount: 0,
  setDepositAmount: jest.fn(),
  withdrawAmount: 0,
  setWithdrawAmount: jest.fn(),
  celoBalance: '',
  cusdBalance: '',
  goodDollarBalance: '',
  setSelectedToken: jest.fn(),
  isApproved: false,
  setIsApproved: jest.fn(),
  isApproving: false,
  isLoading: false,
  interestRate: 5,
  getBalance: jest.fn(),
  getTokenBalance: jest.fn(),
  handleTokenChange: jest.fn(),
  approveSpend: jest.fn(),
  handleDeposit: jest.fn(),
  handleWithdraw: jest.fn(),
  formatBalance: jest.fn(),
};

// Mock the useMiniSafe hook
jest.mock('@/context/miniSafe/MiniSafeContext', () => ({
  useMiniSafe: () => mockMiniSafeContext
}));

describe('BreakLockTab Component', () => {
  test('renders the component with basic content', () => {
    render(<BreakLockTab />);
    
    // Check if component renders with appropriate content
    expect(screen.getByText('Break Timelock')).toBeInTheDocument();
    expect(screen.getByText(/Use your EST tokens to break the timelock/)).toBeInTheDocument();
    expect(screen.getByText('Required EST Tokens')).toBeInTheDocument();
    // Use the data-testid to find the text element
    expect(screen.getByTestId('required-tokens-text')).toHaveTextContent('You need 15 EST tokens to break this timelock');
    expect(screen.getByText('How it works')).toBeInTheDocument();
  });

  test('disables button when not enough tokens', () => {
    render(<BreakLockTab />);
    
    // The button should be disabled when tokenBalance < requiredEstTokens
    const breakButton = screen.getByRole('button', { name: /Break Lock & Withdraw/i });
    expect(breakButton).toBeDisabled();
    
    // Should show warning text
    expect(screen.getByText(/You need 5 more EST tokens/)).toBeInTheDocument();
  });

  test('enables button when enough tokens', () => {
    // Override the mock to set tokenBalance to enough
    const enoughTokensMock = {
      ...mockMiniSafeContext,
      tokenBalance: '20'  // More than the required 15
    };
    
    jest.spyOn(require('@/context/miniSafe/MiniSafeContext'), 'useMiniSafe').mockImplementation(() => enoughTokensMock);
    
    render(<BreakLockTab />);
    
    // The button should be enabled when tokenBalance >= requiredEstTokens
    const breakButton = screen.getByRole('button', { name: /Break Lock & Withdraw/i });
    expect(breakButton).not.toBeDisabled();
    
    // Should show success text
    expect(screen.getByText(/You have enough EST tokens/)).toBeInTheDocument();
  });

  test('calls handleBreakLock when button is clicked', () => {
    // Override the mock to set tokenBalance to enough
    const enoughTokensMock = {
      ...mockMiniSafeContext,
      tokenBalance: '20',  // More than the required 15
      handleBreakLock: jest.fn()
    };
    
    jest.spyOn(require('@/context/miniSafe/MiniSafeContext'), 'useMiniSafe').mockImplementation(() => enoughTokensMock);
    
    render(<BreakLockTab />);
    
    const breakButton = screen.getByRole('button', { name: /Break Lock & Withdraw/i });
    fireEvent.click(breakButton);
    
    expect(enoughTokensMock.handleBreakLock).toHaveBeenCalledTimes(1);
  });

  test('shows loading state when transaction is in progress', () => {
    // Override the mock to set isWaitingTx to true
    const waitingTxMock = {
      ...mockMiniSafeContext,
      tokenBalance: '20',  // More than the required 15
      isWaitingTx: true
    };
    
    jest.spyOn(require('@/context/miniSafe/MiniSafeContext'), 'useMiniSafe').mockImplementation(() => waitingTxMock);
    
    render(<BreakLockTab />);
    
    // The button should be disabled when a transaction is in progress
    const breakButton = screen.getByRole('button', { name: /Break Lock & Withdraw/i });
    expect(breakButton).toBeDisabled();
    
    // Should show loading spinner (animation class)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});