import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DepositTab from '@/components/miniSafe/DepositTab';

// Mock the MiniSafeContext
const mockMiniSafeContext = {
  depositAmount: 10,
  setDepositAmount: jest.fn(),
  selectedToken: 'cUSD',
  isApproved: false,
  isApproving: false,
  isWaitingTx: false,
  approveSpend: jest.fn(),
  handleDeposit: jest.fn(),
  // Required props to satisfy TypeScript
  cUsdTokenAddress: '',
  celoAddress: '',
  goodDollarAddress: '',
  withdrawAmount: 0,
  setWithdrawAmount: jest.fn(),
  celoBalance: '',
  cusdBalance: '',
  goodDollarBalance: '',
  tokenBalance: '',
  setSelectedToken: jest.fn(),
  setIsApproved: jest.fn(),
  isLoading: false,
  interestRate: 5,
  getBalance: jest.fn(),
  getTokenBalance: jest.fn(),
  handleTokenChange: jest.fn(),
  handleWithdraw: jest.fn(),
  handleBreakLock: jest.fn(),
  formatBalance: jest.fn(),
};

// Mock the useMiniSafe hook
jest.mock('@/context/miniSafe/MiniSafeContext', () => ({
  useMiniSafe: () => mockMiniSafeContext
}));

describe('DepositTab Component', () => {
  test('renders the component with basic content', () => {
    render(<DepositTab />);
    
    // Check if component renders with appropriate content
    expect(screen.getByText(/Deposit cUSD/)).toBeInTheDocument();
    expect(screen.getByText(/Deposited assets are locked over time/)).toBeInTheDocument();
    expect(screen.getByLabelText('Amount')).toBeInTheDocument();
    expect(screen.getByText('What happens when you deposit?')).toBeInTheDocument();
  });

  test('updates deposit amount when input changes', () => {
    const setDepositAmountMock = jest.fn();
    const updatedMock = {
      ...mockMiniSafeContext,
      setDepositAmount: setDepositAmountMock
    };
    
    jest.spyOn(require('@/context/miniSafe/MiniSafeContext'), 'useMiniSafe').mockImplementation(() => updatedMock);
    
    render(<DepositTab />);
    
    const amountInput = screen.getByLabelText('Amount');
    fireEvent.change(amountInput, { target: { value: '50' } });
    
    expect(setDepositAmountMock).toHaveBeenCalledWith(50);
  });

  test('shows approve button for cUSD token', () => {
    render(<DepositTab />);
    
    // Should show approve button when token is cUSD
    expect(screen.getByRole('button', { name: /Approve/i })).toBeInTheDocument();
  });

  test('shows deposit button only for non-cUSD tokens', () => {
    const nonCusdMock = {
      ...mockMiniSafeContext,
      selectedToken: 'CELO'
    };
    
    jest.spyOn(require('@/context/miniSafe/MiniSafeContext'), 'useMiniSafe').mockImplementation(() => nonCusdMock);
    
    render(<DepositTab />);
    
    // Should not show approve button when token is not cUSD
    expect(screen.queryByRole('button', { name: /Approve/i })).not.toBeInTheDocument();
    
    // Should show a single deposit button
    expect(screen.getByRole('button', { name: /Deposit CELO/i })).toBeInTheDocument();
  });

  test('calls approveSpend when approve button is clicked', () => {
    const approveSpendMock = jest.fn();
    const updatedMock = {
      ...mockMiniSafeContext,
      approveSpend: approveSpendMock
    };
    
    jest.spyOn(require('@/context/miniSafe/MiniSafeContext'), 'useMiniSafe').mockImplementation(() => updatedMock);
    
    render(<DepositTab />);
    
    const approveButton = screen.getByRole('button', { name: /Approve/i });
    fireEvent.click(approveButton);
    
    expect(approveSpendMock).toHaveBeenCalledTimes(1);
  });

  test('calls handleDeposit when deposit button is clicked', () => {
    const handleDepositMock = jest.fn();
    const updatedMock = {
      ...mockMiniSafeContext,
      handleDeposit: handleDepositMock,
      isApproved: true  // For cUSD, deposit is enabled only after approval
    };
    
    jest.spyOn(require('@/context/miniSafe/MiniSafeContext'), 'useMiniSafe').mockImplementation(() => updatedMock);
    
    render(<DepositTab />);
    
    const depositButton = screen.getByRole('button', { name: /^Deposit$/i });
    fireEvent.click(depositButton);
    
    expect(handleDepositMock).toHaveBeenCalledTimes(1);
  });

  test('disables deposit button when not approved for cUSD', () => {
    render(<DepositTab />);
    
    // For cUSD, deposit button should be disabled when not approved
    const depositButton = screen.getByRole('button', { name: /^Deposit$/i });
    expect(depositButton).toBeDisabled();
  });

  test('shows approved state for approve button', () => {
    const approvedMock = {
      ...mockMiniSafeContext,
      isApproved: true
    };
    
    jest.spyOn(require('@/context/miniSafe/MiniSafeContext'), 'useMiniSafe').mockImplementation(() => approvedMock);
    
    render(<DepositTab />);
    
    // Should show "Approved" text on the button
    expect(screen.getByRole('button', { name: /Approved/i })).toBeInTheDocument();
    
    // The approve button should be disabled when already approved
    const approveButton = screen.getByRole('button', { name: /Approved/i });
    expect(approveButton).toBeDisabled();
  });

  test('shows loading state during approval process', () => {
    const approvingMock = {
      ...mockMiniSafeContext,
      isApproving: true
    };
    
    jest.spyOn(require('@/context/miniSafe/MiniSafeContext'), 'useMiniSafe').mockImplementation(() => approvingMock);
    
    render(<DepositTab />);
    
    // The approve button should be disabled during approval
    const approveButton = screen.getByRole('button', { name: /Approve/i });
    expect(approveButton).toBeDisabled();
    
    // Should show loading spinner (animation class)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  test('shows loading state during deposit transaction', () => {
    const waitingTxMock = {
      ...mockMiniSafeContext,
      isApproved: true,
      isWaitingTx: true
    };
    
    jest.spyOn(require('@/context/miniSafe/MiniSafeContext'), 'useMiniSafe').mockImplementation(() => waitingTxMock);
    
    render(<DepositTab />);
    
    // The deposit button should be disabled during transaction
    const depositButton = screen.getByRole('button', { name: /^Deposit$/i });
    expect(depositButton).toBeDisabled();
    
    // Should show loading spinner (animation class)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});