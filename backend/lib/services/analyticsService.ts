import dbConnect from '../database/connection';
import { Analytics, Transaction, Group, User, IAnalytics, ITransaction } from '../database/schemas';
import { UserService } from './userService';

export class AnalyticsService {
  // Generate analytics for a specific user and period
  static async generateUserAnalytics(
    walletAddress: string,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    date: Date = new Date()
  ): Promise<IAnalytics> {
    await dbConnect();

    const user = await UserService.getUserByWallet(walletAddress);
    if (!user) {
      throw new Error('User not found');
    }

    // Calculate date range for the period
    const { startDate, endDate } = this.getDateRange(period, date);

    // Get all transactions for the period
    const userId = (user as any)._id;
    const transactions = await Transaction.find({
      user: userId,
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ['confirmed', 'completed'] }
    }) as unknown as ITransaction[];

    // Calculate metrics
    const metrics = {
      totalSavings: 0,
      savingsGrowth: 0,
      aaveEarnings: 0,
      utilitySpent: 0,
      groupContributions: 0,
      groupPayouts: 0,
      transactionCount: transactions.length
    };

    // Process transactions
    for (const tx of transactions) {
      switch (tx.type) {
        case 'savings':
          if (tx.subType === 'aave_deposit') {
            metrics.totalSavings += tx.amount;
          }
          break;
        case 'withdrawal':
          if (tx.subType === 'aave_withdrawal') {
            metrics.totalSavings -= tx.amount;
          }
          break;
        case 'utility_payment':
          metrics.utilitySpent += tx.amount;
          break;
        case 'group_contribution':
          metrics.groupContributions += tx.amount;
          break;
        case 'group_payout':
          metrics.groupPayouts += tx.amount;
          break;
      }
    }

    // Calculate savings growth (compare with previous period)
    const previousPeriodAnalytics = await this.getPreviousPeriodAnalytics(
      walletAddress,
      period,
      date
    );
    if (previousPeriodAnalytics) {
      metrics.savingsGrowth = 
        ((metrics.totalSavings - previousPeriodAnalytics.metrics.totalSavings) / 
         (previousPeriodAnalytics.metrics.totalSavings || 1)) * 100;
    }

    // Calculate Aave earnings (simplified - would need more complex calculation)
    const aaveTransactions = transactions.filter((tx: ITransaction) => 
      tx.subType === 'aave_deposit' && tx.aaveDetails?.apy
    );
    metrics.aaveEarnings = aaveTransactions.reduce((total: number, tx: ITransaction) => {
      const daysInPeriod = this.getDaysInPeriod(period);
      const dailyRate = (tx.aaveDetails?.apy || 0) / 365 / 100;
      return total + (tx.amount * dailyRate * daysInPeriod);
    }, 0);

    // Save or update analytics
    const analytics = await Analytics.findOneAndUpdate(
      { user: userId, period, date: this.normalizeDate(date, period) },
      {
        user: userId,
        period,
        date: this.normalizeDate(date, period),
        metrics
      },
      { upsert: true, new: true }
    );

    return analytics;
  }

  // Get analytics for a user across multiple periods
  static async getUserAnalyticsHistory(
    walletAddress: string,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    limit: number = 12
  ): Promise<IAnalytics[]> {
    await dbConnect();

    const user = await UserService.getUserByWallet(walletAddress);
    if (!user) return [];

    const userId = (user as any)._id;
    return Analytics.find({
      user: userId,
      period
    })
    .sort({ date: -1 })
    .limit(limit);
  }

  // Get comprehensive user dashboard data
  static async getUserDashboard(walletAddress: string): Promise<{
    overview: {
      totalSavings: number;
      totalUtilitySpent: number;
      activeGroups: number;
      monthlyGrowth: number;
    };
    recentTransactions: any[];
    groupsOverview: any[];
    savingsBreakdown: {
      aave: number;
      groups: number;
      liquid: number;
    };
    monthlyTrends: any[];
  }> {
    await dbConnect();

    const user = await UserService.getUserByWallet(walletAddress);
    if (!user) {
      throw new Error('User not found');
    }

    // Get overview data
    const totalSavings = user.savings.totalSaved;
    const aaveDeposits = user.savings.aaveDeposits;

    // Get total utility spending (last 30 days)
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const userId = (user as any)._id;
    const utilityTransactions = await Transaction.find({
      user: userId,
      type: 'utility_payment',
      createdAt: { $gte: last30Days },
      status: { $in: ['confirmed', 'completed'] }
    });
    const totalUtilitySpent = utilityTransactions.reduce((sum: number, tx: ITransaction) => sum + tx.amount, 0);

    // Get active groups
    const activeGroups = await Group.countDocuments({
      'members.user': userId,
      'members.isActive': true,
      status: { $in: ['forming', 'active'] }
    });

    // Get monthly growth
    const currentMonth = await this.generateUserAnalytics(walletAddress, 'monthly');
    const monthlyGrowth = currentMonth.metrics.savingsGrowth;

    // Get recent transactions
    const recentTransactions = await Transaction.find({
      user: userId,
      status: { $in: ['confirmed', 'completed'] }
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('groupDetails.groupId', 'name');

    // Get groups overview
    const userGroups = await Group.find({
      'members.user': userId,
      'members.isActive': true
    }).populate('members.user', 'walletAddress profileData');

    const groupsOverview = userGroups.map((group: any) => ({
      id: group._id,
      name: group.name,
      status: group.status,
      currentRound: group.currentRound,
      totalRounds: group.members.length,
      nextPayoutDate: group.payoutSchedule.find((p: any) => p.status === 'pending')?.scheduledDate,
      contributionAmount: group.settings.contributionAmount,
      contributionToken: group.settings.contributionToken
    }));

    // Calculate savings breakdown
    const groupContributions = await Transaction.aggregate([
      { $match: { user: userId, type: 'group_contribution', status: { $in: ['confirmed', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const groupSavings = groupContributions[0]?.total || 0;

    const savingsBreakdown = {
      aave: aaveDeposits,
      groups: groupSavings,
      liquid: Math.max(0, totalSavings - aaveDeposits - groupSavings)
    };

    // Get monthly trends (last 6 months)
    const monthlyTrends = await Analytics.find({
      user: userId,
      period: 'monthly'
    })
    .sort({ date: -1 })
    .limit(6)
    .select('date metrics.totalSavings metrics.utilitySpent metrics.aaveEarnings');

    return {
      overview: {
        totalSavings,
        totalUtilitySpent,
        activeGroups,
        monthlyGrowth
      },
      recentTransactions,
      groupsOverview,
      savingsBreakdown,
      monthlyTrends: monthlyTrends.reverse() // Oldest first for chart display
    };
  }

  // Get platform-wide analytics
  static async getPlatformAnalytics(): Promise<{
    totalUsers: number;
    totalSavings: number;
    totalUtilityPayments: number;
    activeGroups: number;
    totalTransactions: number;
    topSavers: any[];
    groupsBreakdown: any;
    monthlyGrowth: any[];
  }> {
    await dbConnect();

    // Basic counts
    const totalUsers = await User.countDocuments();
    const activeGroups = await Group.countDocuments({ status: { $in: ['forming', 'active'] } });
    const totalTransactions = await Transaction.countDocuments({ status: { $in: ['confirmed', 'completed'] } });

    // Total savings across platform
    const savingsAggregation = await Transaction.aggregate([
      { $match: { type: 'savings', status: { $in: ['confirmed', 'completed'] } } },
      { $group: { _id: null, totalSavings: { $sum: '$amount' } } }
    ]);
    const totalSavings = savingsAggregation[0]?.totalSavings || 0;

    // Total utility payments
    const utilityAggregation = await Transaction.aggregate([
      { $match: { type: 'utility_payment', status: { $in: ['confirmed', 'completed'] } } },
      { $group: { _id: null, totalUtility: { $sum: '$amount' } } }
    ]);
    const totalUtilityPayments = utilityAggregation[0]?.totalUtility || 0;

    // Top savers
    const topSavers = await User.find({})
      .sort({ 'savings.totalSaved': -1 })
      .limit(10)
      .select('walletAddress profileData savings.totalSaved');

    // Groups breakdown by status
    const groupsBreakdown = await Group.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Monthly growth trends
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyGrowth = await Analytics.aggregate([
      { 
        $match: { 
          period: 'monthly', 
          date: { $gte: sixMonthsAgo } 
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          totalSavings: { $sum: '$metrics.totalSavings' },
          totalUsers: { $addToSet: '$user' },
          totalTransactions: { $sum: '$metrics.transactionCount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    return {
      totalUsers,
      totalSavings,
      totalUtilityPayments,
      activeGroups,
      totalTransactions,
      topSavers,
      groupsBreakdown,
      monthlyGrowth
    };
  }

  // Get group-specific analytics
  static async getGroupAnalytics(groupId: string): Promise<{
    overview: {
      totalContributions: number;
      totalPayouts: number;
      completionRate: number;
      averageContributionTime: number;
    };
    memberPerformance: any[];
    payoutHistory: any[];
    projectedTimeline: any[];
  }> {
    await dbConnect();

    const group = await Group.findById(groupId)
      .populate('members.user', 'walletAddress profileData')
      .populate('payoutSchedule.recipient', 'walletAddress profileData');

    if (!group) {
      throw new Error('Group not found');
    }

    // Calculate overview metrics
    const totalContributions = group.totalContributions;
    const completedPayouts = group.payoutSchedule.filter((p: any) => p.status === 'paid').length;
    const totalPayouts = completedPayouts * group.settings.contributionAmount * group.members.length;
    const completionRate = (completedPayouts / group.members.length) * 100;

    // Get member performance
    const memberPerformance = await Promise.all(
      (group as any).members.map(async (member: any) => {
        const contributions = await Transaction.find({
          user: member.user._id,
          type: 'group_contribution',
          'groupDetails.groupId': groupId,
          status: { $in: ['confirmed', 'completed'] }
        });

        const totalContributed = contributions.reduce((sum: number, tx: ITransaction) => sum + tx.amount, 0);
        const onTimeContributions = contributions.filter((tx: ITransaction) => {
          // Logic to determine if contribution was on time
          return true; // Simplified
        }).length;

        return {
          user: member.user,
          totalContributed,
          contributionCount: contributions.length,
          onTimeRate: contributions.length > 0 ? (onTimeContributions / contributions.length) * 100 : 0,
          joinedAt: member.joinedAt
        };
      })
    );

    // Payout history
    const payoutHistory = (group as any).payoutSchedule
      .filter((p: any) => p.status === 'paid')
      .map((payout: any) => ({
        round: payout.round,
        recipient: payout.recipient,
        amount: payout.amount,
        scheduledDate: payout.scheduledDate,
        payoutDate: payout.payoutDate
      }));

    // Projected timeline
    const projectedTimeline = (group as any).payoutSchedule.map((payout: any) => ({
      round: payout.round,
      scheduledDate: payout.scheduledDate,
      status: payout.status,
      projectedAmount: payout.amount
    }));

    return {
      overview: {
        totalContributions,
        totalPayouts,
        completionRate,
        averageContributionTime: 0 // Would need more complex calculation
      },
      memberPerformance,
      payoutHistory,
      projectedTimeline
    };
  }

  // Helper methods
  private static getDateRange(period: string, date: Date): { startDate: Date; endDate: Date } {
    const endDate = new Date(date);
    const startDate = new Date(date);

    switch (period) {
      case 'daily':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        const dayOfWeek = startDate.getDay();
        startDate.setDate(startDate.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() + (6 - dayOfWeek));
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(endDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yearly':
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
    }

    return { startDate, endDate };
  }

  private static normalizeDate(date: Date, period: string): Date {
    const normalized = new Date(date);
    
    switch (period) {
      case 'daily':
        normalized.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        const dayOfWeek = normalized.getDay();
        normalized.setDate(normalized.getDate() - dayOfWeek);
        normalized.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        normalized.setDate(1);
        normalized.setHours(0, 0, 0, 0);
        break;
      case 'yearly':
        normalized.setMonth(0, 1);
        normalized.setHours(0, 0, 0, 0);
        break;
    }

    return normalized;
  }

  private static getDaysInPeriod(period: string): number {
    switch (period) {
      case 'daily': return 1;
      case 'weekly': return 7;
      case 'monthly': return 30;
      case 'yearly': return 365;
      default: return 30;
    }
  }

  private static async getPreviousPeriodAnalytics(
    walletAddress: string,
    period: string,
    currentDate: Date
  ): Promise<IAnalytics | null> {
    const user = await UserService.getUserByWallet(walletAddress);
    if (!user) return null;

    const previousDate = new Date(currentDate);
    
    switch (period) {
      case 'daily':
        previousDate.setDate(previousDate.getDate() - 1);
        break;
      case 'weekly':
        previousDate.setDate(previousDate.getDate() - 7);
        break;
      case 'monthly':
        previousDate.setMonth(previousDate.getMonth() - 1);
        break;
      case 'yearly':
        previousDate.setFullYear(previousDate.getFullYear() - 1);
        break;
    }

    const userId = (user as any)._id;
    return Analytics.findOne({
      user: userId,
      period,
      date: this.normalizeDate(previousDate, period)
    });
  }

  // Batch analytics generation (for cron jobs)
  static async generateAllUserAnalytics(period: 'daily' | 'weekly' | 'monthly' | 'yearly'): Promise<void> {
    await dbConnect();

    const users = await User.find({}).select('walletAddress');
    
    for (const user of users) {
      try {
        await this.generateUserAnalytics(user.walletAddress, period);
      } catch (error) {
        console.error(`Error generating analytics for user ${user.walletAddress}:`, error);
      }
    }

    console.log(`✅ Generated ${period} analytics for ${users.length} users`);
  }
}
