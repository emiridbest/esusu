import { ethers, type ContractRunner, type BigNumberish, type Contract } from 'ethers';
import MiniSafeAaveUpgradeableABI from './abis/MiniSafeAaveUpgradeable.json';

export const contractAddress = "0x9fAB2C3310a906f9306ACaA76303BcEb46cA5478";
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

  async updateUserBalance(userAddress: string, tokenAddress: string, amount: BigNumberish, isDeposit: boolean) {
    return await this.contract.updateUserBalance(userAddress, tokenAddress, amount, isDeposit);
  }

  // Thrift Group Operations
  async createThriftGroup(name: string, description: string, depositAmount: BigNumberish, maxMembers: BigNumberish, isPublic: boolean) {
    return await this.contract.createThriftGroup(name, description, depositAmount, maxMembers, isPublic);
  }

  async joinPublicGroup(groupId: BigNumberish) {
    return await this.contract.joinPublicGroup(groupId);
  }

  async addMemberToPrivateGroup(groupId: BigNumberish, memberAddress: string) {
    return await this.contract.addMemberToPrivateGroup(groupId, memberAddress);
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
    return await this.contract.getThriftGroup(groupId);
  }

  async getUserGroups(userAddress: string) {
    return await this.contract.getUserGroups(userAddress);
  }

  async checkContributionDue(groupId: BigNumberish, memberAddress: string) {
    return await this.contract.checkContributionDue(groupId, memberAddress);
  }

  // Emergency Functions
  async executeEmergencyWithdrawal(tokenAddress: string, amount: BigNumberish) {
    return await this.contract.executeEmergencyWithdrawal(tokenAddress, amount);
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

  // Admin Functions
  async setManagerAuthorization(managerAddress: string, isAuthorized: boolean) {
    return await this.contract.setManagerAuthorization(managerAddress, isAuthorized);
  }

  async isAuthorizedManager(managerAddress: string) {
    return await this.contract.authorizedManagers(managerAddress);
  }

  // Events
  onDeposit(callback: (...args: unknown[]) => void) {
    return this.contract.on('Deposit', callback);
  }

  onWithdrawal(callback: (...args: unknown[]) => void) {
    return this.contract.on('Withdrawal', callback);
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