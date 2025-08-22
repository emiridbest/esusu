import { ethers } from 'ethers';
import MiniSafeAaveUpgradeableABI from './abis/MiniSafeAaveUpgradeable.json';

export const contractAddress = "0x9fAB2C3310a906f9306ACaA76303BcEb46cA5478";
export const abi = MiniSafeAaveUpgradeableABI;

/**
 * MiniSafeAave contract wrapper for ethers v6
 */
export class MiniSafeAave {
  constructor(address, signerOrProvider) {
    this.contract = new ethers.Contract(address, MiniSafeAaveUpgradeableABI, signerOrProvider);
    this.address = address;
  }

  // Deposit and Withdrawal
  async deposit(tokenAddress, amount) {
    return await this.contract.deposit(tokenAddress, amount);
  }

  async withdraw(tokenAddress, amount) {
    return await this.contract.withdraw(tokenAddress, amount);
  }

  async breakTimelock(tokenAddress) {
    return await this.contract.breakTimelock(tokenAddress);
  }

  async getBalance(account, tokenAddress) {
    return await this.contract.getBalance(account, tokenAddress);
  }

  async getUserBalance(userAddress, tokenAddress) {
    return await this.getBalance(userAddress, tokenAddress);
  }

  async updateUserBalance(userAddress, tokenAddress, amount, isDeposit) {
    return await this.contract.updateUserBalance(userAddress, tokenAddress, amount, isDeposit);
  }

  // Thrift Group Operations
  async createThriftGroup(name, description, depositAmount, maxMembers, isPublic) {
    return await this.contract.createThriftGroup(name, description, depositAmount, maxMembers, isPublic);
  }

  async joinPublicGroup(groupId) {
    return await this.contract.joinPublicGroup(groupId);
  }

  async addMemberToPrivateGroup(groupId, memberAddress) {
    return await this.contract.addMemberToPrivateGroup(groupId, memberAddress);
  }

  async makeContribution(groupId) {
    return await this.contract.makeContribution(groupId);
  }

  async activateThriftGroup(groupId) {
    return await this.contract.activateThriftGroup(groupId);
  }

  async setPayoutOrder(groupId, payoutOrder) {
    return await this.contract.setPayoutOrder(groupId, payoutOrder);
  }

  async distributePayout(groupId) {
    return await this.contract.distributePayout(groupId);
  }

  async emergencyWithdraw(groupId) {
    return await this.contract.emergencyWithdraw(groupId);
  }

  async getThriftGroup(groupId) {
    return await this.contract.getThriftGroup(groupId);
  }

  async getUserGroups(userAddress) {
    return await this.contract.getUserGroups(userAddress);
  }

  async checkContributionDue(groupId, memberAddress) {
    return await this.contract.checkContributionDue(groupId, memberAddress);
  }

  // Emergency Functions
  async executeEmergencyWithdrawal(tokenAddress, amount) {
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
  async setManagerAuthorization(managerAddress, isAuthorized) {
    return await this.contract.setManagerAuthorization(managerAddress, isAuthorized);
  }

  async isAuthorizedManager(managerAddress) {
    return await this.contract.authorizedManagers(managerAddress);
  }

  // Events
  onDeposit(callback) {
    return this.contract.on('Deposit', callback);
  }

  onWithdrawal(callback) {
    return this.contract.on('Withdrawal', callback);
  }

  onThriftGroupCreated(callback) {
    return this.contract.on('ThriftGroupCreated', callback);
  }

  onMemberJoined(callback) {
    return this.contract.on('MemberJoined', callback);
  }

  onContributionMade(callback) {
    return this.contract.on('ContributionMade', callback);
  }

  onPayoutDistributed(callback) {
    return this.contract.on('PayoutDistributed', callback);
  }

  removeAllListeners() {
    return this.contract.removeAllListeners();
  }
}