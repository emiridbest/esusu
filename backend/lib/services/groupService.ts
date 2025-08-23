import dbConnect from '../database/connection';
import { Group, IGroup, User } from '../database/schemas';
import { UserService } from './userService';
import { NotificationService } from './notificationService';

export class GroupService {
  static async createGroup(data: {
    name: string;
    description?: string;
    creatorWallet: string;
    contributionAmount: number;
    contributionToken: string;
    contributionInterval: 'weekly' | 'monthly';
    startDate: Date;
  }): Promise<IGroup> {
    await dbConnect();

    // Get or create user
    const creator = await UserService.createOrUpdateUser(data.creatorWallet);

    const group = new Group({
      name: data.name,
      description: data.description,
      members: [{
        user: creator._id,
        joinedAt: new Date(),
        role: 'admin',
        isActive: true
      }],
      settings: {
        contributionAmount: data.contributionAmount,
        contributionToken: data.contributionToken,
        contributionInterval: data.contributionInterval,
        startDate: data.startDate,
        maxMembers: 5
      },
      currentRound: 0,
      status: 'forming',
      payoutSchedule: [],
      totalContributions: 0
    });

    const savedGroup = await group.save();

    // Send notification to creator
    await NotificationService.createNotification({
      userWallet: data.creatorWallet,
      type: 'group_invitation',
      title: 'Group Created Successfully',
      message: `Your thrift group "${data.name}" has been created. Invite members to start saving together!`,
      data: { groupId: savedGroup._id }
    });

    return savedGroup;
  }

  static async joinGroup(groupId: string, memberWallet: string): Promise<IGroup> {
    await dbConnect();

    const group = await Group.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    if (group.members.length >= group.settings.maxMembers) {
      throw new Error('Group is full');
    }

    if (group.status !== 'forming') {
      throw new Error('Group is not accepting new members');
    }

    // Get or create user
    const member = await UserService.createOrUpdateUser(memberWallet) as any;

    // Check if user is already a member
    const existingMember = group.members.find((m: any) => m.user.toString() === (member as any)._id.toString());
    if (existingMember) {
      throw new Error('User is already a member of this group');
    }

    // Add member to group
    group.members.push({
      user: member._id,
      joinedAt: new Date(),
      role: 'member',
      isActive: true
    });

    // If group is full, activate it and create payout schedule
    if (group.members.length === group.settings.maxMembers) {
      group.status = 'active';
      await this.createPayoutSchedule(group);
    }

    const updatedGroup = await group.save();

    // Send notifications to all members
    for (const member of group.members) {
      const memberUser = await User.findById(member.user);
      if (memberUser) {
        await NotificationService.createNotification({
          userWallet: memberUser.walletAddress,
          type: 'group_invitation',
          title: 'New Member Joined',
          message: `A new member has joined your thrift group "${group.name}"`,
          data: { groupId: group._id }
        });
      }
    }

    return updatedGroup;
  }

  static async createPayoutSchedule(group: IGroup): Promise<void> {
    const { contributionInterval, startDate } = group.settings;
    const members = group.members.filter((m: any) => m.isActive);
    
    // Shuffle members for random payout order
    const shuffledMembers = [...members].sort(() => Math.random() - 0.5);
    
    let currentDate = new Date(startDate);
    const payoutSchedule = [];

    for (let round = 1; round <= members.length; round++) {
      const recipient = shuffledMembers[round - 1];
      const payoutAmount = group.settings.contributionAmount * members.length;
      
      payoutSchedule.push({
        round,
        recipient: recipient.user,
        scheduledDate: new Date(currentDate),
        amount: payoutAmount,
        status: 'pending' as const
      });

      // Move to next period
      if (contributionInterval === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7);
      } else {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    group.payoutSchedule = payoutSchedule;
    await group.save();
  }

  static async processContribution(
    groupId: string, 
    contributorWallet: string, 
    transactionHash: string,
    amount: number
  ): Promise<{ success: boolean; message: string }> {
    await dbConnect();

    const group = await Group.findById(groupId).populate('members.user');
    if (!group) {
      throw new Error('Group not found');
    }

    if (group.status !== 'active') {
      throw new Error('Group is not active');
    }

    const contributor = await UserService.getUserByWallet(contributorWallet) as any;
    if (!contributor) {
      throw new Error('User not found');
    }

    // Check if user is a member
    const memberIndex = group.members.findIndex((m: any) => 
      m.user._id.toString() === contributor._id.toString() && m.isActive
    );
    if (memberIndex === -1) {
      throw new Error('User is not a member of this group');
    }

    // Verify contribution amount
    if (amount < group.settings.contributionAmount) {
      throw new Error('Contribution amount is insufficient');
    }

    // Update group total contributions
    group.totalContributions += amount;
    await group.save();

    // Check if all contributions for current round are complete
    const currentRoundContributions = group.totalContributions;
    const expectedTotal = (group.currentRound + 1) * group.settings.contributionAmount * group.members.length;
    
    if (currentRoundContributions >= expectedTotal) {
      // Process payout for current round
      await this.processPayout(group);
    }

    return { success: true, message: 'Contribution recorded successfully' };
  }

  static async processPayout(group: IGroup): Promise<void> {
    const currentRound = group.currentRound + 1;
    const payoutInfo = group.payoutSchedule.find((p: any) => p.round === currentRound);
    
    if (!payoutInfo) {
      throw new Error('Payout schedule not found for current round');
    }

    // Mark payout as paid
    payoutInfo.status = 'paid';
    payoutInfo.payoutDate = new Date();
    group.currentRound = currentRound;

    // Check if group is complete
    if (currentRound >= group.members.length) {
      group.status = 'completed';
    }

    await group.save();

    // Send notifications
    const recipient = await User.findById(payoutInfo.recipient);
    if (recipient) {
      await NotificationService.createNotification({
        userWallet: recipient.walletAddress,
        type: 'payout_received',
        title: 'Payout Received!',
        message: `You've received your payout of ${payoutInfo.amount} ${group.settings.contributionToken} from group "${group.name}"`,
        data: { groupId: group._id, amount: payoutInfo.amount, round: currentRound }
      });
    }

    // Notify other members
    for (const member of group.members) {
      if (member.user.toString() !== payoutInfo.recipient.toString()) {
        const memberUser = await User.findById(member.user);
        if (memberUser) {
          await NotificationService.createNotification({
            userWallet: memberUser.walletAddress,
            type: 'contribution_due',
            title: 'Next Round Started',
            message: `Round ${currentRound + 1} has started for group "${group.name}". Your next contribution is due.`,
            data: { groupId: group._id, round: currentRound + 1 }
          });
        }
      }
    }
  }

  static async getUserGroups(walletAddress: string): Promise<IGroup[]> {
    await dbConnect();

    const user = await UserService.getUserByWallet(walletAddress);
    if (!user) return [];

    return Group.find({
      'members.user': user._id,
      'members.isActive': true
    })
    .populate('members.user', 'walletAddress profileData')
    .populate('payoutSchedule.recipient', 'walletAddress profileData')
    .sort({ createdAt: -1 });
  }

  static async getGroupById(groupId: string): Promise<IGroup | null> {
    await dbConnect();
    
    return Group.findById(groupId)
      .populate('members.user', 'walletAddress profileData')
      .populate('payoutSchedule.recipient', 'walletAddress profileData');
  }

  static async getAvailableGroups(limit: number = 20): Promise<IGroup[]> {
    await dbConnect();
    
    return Group.find({
      status: 'forming',
      $expr: { $lt: [{ $size: '$members' }, '$settings.maxMembers'] }
    })
    .populate('members.user', 'walletAddress profileData')
    .sort({ createdAt: -1 })
    .limit(limit);
  }

  static async leaveGroup(groupId: string, memberWallet: string): Promise<{ success: boolean; message: string }> {
    await dbConnect();

    const group = await Group.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    if (group.status === 'active') {
      throw new Error('Cannot leave an active group');
    }

    const user = await UserService.getUserByWallet(memberWallet) as any;
    if (!user) {
      throw new Error('User not found');
    }

    const memberIndex = group.members.findIndex((m: any) => 
      m.user.toString() === user._id.toString()
    );
    
    if (memberIndex === -1) {
      throw new Error('User is not a member of this group');
    }

    // Remove member from group
    group.members.splice(memberIndex, 1);
    
    // If no members left, delete the group
    if (group.members.length === 0) {
      await Group.findByIdAndDelete(groupId);
      return { success: true, message: 'Group deleted as no members remain' };
    }

    // If the leaving member was admin, assign new admin
    const wasAdmin = group.members[memberIndex]?.role === 'admin';
    if (wasAdmin && group.members.length > 0) {
      group.members[0].role = 'admin';
    }

    await group.save();

    return { success: true, message: 'Successfully left the group' };
  }

  static async getGroupStats(groupId: string): Promise<{
    totalContributions: number;
    totalPayouts: number;
    currentRound: number;
    membersCount: number;
    nextPayoutDate?: Date;
    nextPayoutRecipient?: string;
  }> {
    await dbConnect();

    const group = await Group.findById(groupId).populate('payoutSchedule.recipient', 'walletAddress');
    if (!group) {
      throw new Error('Group not found');
    }

    const completedPayouts = group.payoutSchedule.filter((p: any) => p.status === 'paid').length;
    const nextPayout = group.payoutSchedule.find((p: any) => p.status === 'pending');

    return {
      totalContributions: group.totalContributions,
      totalPayouts: completedPayouts * group.settings.contributionAmount * group.members.length,
      currentRound: group.currentRound,
      membersCount: group.members.filter((m: any) => m.isActive).length,
      nextPayoutDate: nextPayout?.scheduledDate,
      nextPayoutRecipient: nextPayout ? 
        (nextPayout.recipient as any)?.walletAddress : undefined
    };
  }
}
