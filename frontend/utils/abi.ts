import { ethers, type ContractRunner, type BigNumberish, type Contract } from 'ethers';
import MiniSafeAaveUpgradeableABI from './abis/MiniSafeAaveUpgradeable.json';

export const contractAddress = "0x91fFc24B9b4756726E186247b9013a01B24a0364"; // Replace with actual deployed address
export const abi = MiniSafeAaveUpgradeableABI;

/**
 * MiniSafeAave contract wrapper for ethers v6
 */
export class MiniSafeAave {
  contract: Contract;
  address: string;

  constructor(address: string, signerOrProvider: ContractRunner) {
    this.contract = new ethers.Contract(address, MiniSafeAaveUpgradeableABI, signerOrProvider);
    this.address = address;
  }

  // Deposit and Withdrawal
  async deposit(tokenAddress: string, amount: BigNumberish) {
    return await this.contract.deposit(tokenAddress, amount);
  }

  async withdraw(tokenAddress: string, amount: BigNumberish) {
    return await this.contract.withdraw(tokenAddress, amount);
  }

  async breakTimelock(tokenAddress: string) {
    return await this.contract.breakTimelock(tokenAddress);
  }

  async getBalance(account: string, tokenAddress: string) {
    return await this.contract.getBalance(account, tokenAddress);
  }

  async getUserBalance(userAddress: string, tokenAddress: string) {
    return await this.getBalance(userAddress, tokenAddress);
  }

  // Thrift Group Operations
  async createThriftGroup(contributionAmount: BigNumberish, startDate: BigNumberish, isPublic: boolean, tokenAddress: string, email: string, phone: string) {
    return await this.contract.createThriftGroup(contributionAmount, startDate, isPublic, tokenAddress, email, phone);
  }

  async joinPublicGroup(groupId: BigNumberish, email: string, phone: string) {
    return await this.contract.joinPublicGroup(groupId, email, phone);
  }

  async addMemberToPrivateGroup(groupId: BigNumberish, memberAddress: string, email: string, phone: string) {
    return await this.contract.addMemberToPrivateGroup(groupId, memberAddress, email, phone);
  }

  async makeContribution(groupId: BigNumberish) {
    return await this.contract.makeContribution(groupId);
  }

  async activateThriftGroup(groupId: BigNumberish) {
    return await this.contract.activateThriftGroup(groupId);
  }

  async setPayoutOrder(groupId: BigNumberish, payoutOrder: string[]) {
    return await this.contract.setPayoutOrder(groupId, payoutOrder);
  }

  async distributePayout(groupId: BigNumberish) {
    return await this.contract.distributePayout(groupId);
  }

  async emergencyWithdraw(groupId: BigNumberish) {
    return await this.contract.emergencyWithdraw(groupId);
  }

  async getThriftGroup(groupId: BigNumberish) {
    return await this.contract.thriftGroups(groupId);
  }

  async getPayoutOrder(groupId: BigNumberish) {
    return await this.contract.getPayoutOrder(groupId);
  }

  async isGroupMember(groupId: BigNumberish, member: string) {
    return await this.contract.isGroupMember(groupId, member);
  }

  async totalThriftGroups() {
    return await this.contract.totalThriftGroups();
  }

  async getSupportedTokens() {
    return await this.contract.getSupportedTokens();
  }

  async isValidToken(tokenAddress: string) {
    return await this.contract.isValidToken(tokenAddress);
  }

  async getUserGroups(userAddress: string) {
    // This function doesn't exist in the ABI
    // Fetch from database via API
    try {
      const response = await fetch(`/api/groups?user=${userAddress}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user groups');
      }
      const data = await response.json();
      return data.groups || [];
    } catch (error) {
      console.error('Error fetching user groups:', error);
      return [];
    }
  }

  async getGroupInfo(groupId: BigNumberish) {
    return await this.contract.getGroupInfo(groupId);
  }

  async getGroupMembers(groupId: BigNumberish) {
    return await this.contract.getGroupMembers(groupId);
  }

  async getCurrentRecipient(groupId: BigNumberish) {
    return await this.contract.getCurrentRecipient(groupId);
  }

  async getGroupPayouts(groupId: BigNumberish) {
    return await this.contract.getGroupPayouts(groupId);
  }

  async checkContributionDue(userAddress: string, groupId: BigNumberish) {
    // This function doesn't exist in the ABI
    // Check contribution status via API
    try {
      const response = await fetch(`/api/groups/${groupId}/contribution-status?user=${userAddress}`);
      if (!response.ok) {
        throw new Error('Failed to check contribution status');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking contribution due:', error);
      return { isDue: false, message: 'Unable to check contribution status' };
    }
  }

  // Emergency Functions
  async executeEmergencyWithdrawal(tokenAddress: string) {
    return await this.contract.executeEmergencyWithdrawal(tokenAddress);
  }

  async cancelEmergencyWithdrawal() {
    return await this.contract.cancelEmergencyWithdrawal();
  }

  async initiateEmergencyWithdrawal() {
    return await this.contract.initiateEmergencyWithdrawal();
  }

  // Admin Functions
  async resumeOperations() {
    return await this.contract.resumeOperations();
  }

  async triggerCircuitBreaker(reason: string) {
    return await this.contract.triggerCircuitBreaker(reason);
  }

  async updateCircuitBreakerThresholds(newWithdrawalThreshold: BigNumberish, newTimeThreshold: BigNumberish) {
    return await this.contract.updateCircuitBreakerThresholds(newWithdrawalThreshold, newTimeThreshold);
  }

  async addSupportedToken(tokenAddress: string) {
    return await this.contract.addSupportedToken(tokenAddress);
  }

  async pause() {
    return await this.contract.pause();
  }

  async unpause() {
    return await this.contract.unpause();
  }

  async paused() {
    return await this.contract.paused();
  }

  // Events
  // Example event helpers (only those present in the ABI)
  onDeposited(callback: (...args: unknown[]) => void) {
    return this.contract.on('Deposited', callback);
  }

  onWithdrawn(callback: (...args: unknown[]) => void) {
    return this.contract.on('Withdrawn', callback);
  }

  onThriftGroupCreated(callback: (...args: unknown[]) => void) {
    return this.contract.on('ThriftGroupCreated', callback);
  }

  onMemberJoined(callback: (...args: unknown[]) => void) {
    return this.contract.on('MemberJoined', callback);
  }

  onContributionMade(callback: (...args: unknown[]) => void) {
    return this.contract.on('ContributionMade', callback);
  }

  onPayoutDistributed(callback: (...args: unknown[]) => void) {
    this.contract.on('PayoutDistributed', callback);
  }

  removeAllListeners(): void {
    this.contract.removeAllListeners();
  }
}