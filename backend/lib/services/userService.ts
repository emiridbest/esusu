import dbConnect from '../database/connection';
import { User, IUser } from '../database/schemas';

export class UserService {
  static async createOrUpdateUser(walletAddress: string, userData?: Partial<IUser>): Promise<IUser> {
    await dbConnect();
    
    // @ts-ignore - Mongoose union type compatibility issue
    const user = await User.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      { 
        $set: { 
          walletAddress: walletAddress.toLowerCase(),
          ...userData 
        },
        $setOnInsert: {
          savings: {
            totalSaved: 0,
            aaveDeposits: 0,
            currentAPY: 0
          }
        }
      },
      { 
        upsert: true, 
        new: true, 
        runValidators: true 
      }
    );

    return user;
  }

  static async getUserByWallet(walletAddress: string): Promise<IUser | null> {
    await dbConnect();
    // @ts-ignore - Mongoose union type compatibility issue
    return User.findOne({ walletAddress: walletAddress.toLowerCase() });
  }

  static async getUserById(userId: string): Promise<IUser | null> {
    await dbConnect();
    // @ts-ignore - Mongoose union type compatibility issue
    return User.findById(userId);
  }

  static async updateUserSavings(walletAddress: string, savingsData: {
    totalSaved?: number;
    aaveDeposits?: number;
    currentAPY?: number;
  }): Promise<IUser | null> {
    await dbConnect();
    
    // @ts-ignore - Mongoose union type compatibility issue
    return User.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      { 
        $set: { 
          'savings.totalSaved': savingsData.totalSaved,
          'savings.aaveDeposits': savingsData.aaveDeposits,
          'savings.currentAPY': savingsData.currentAPY
        }
      },
      { new: true }
    );
  }

  static async updateUserProfile(walletAddress: string, profileData: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    country?: string;
    preferredCurrency?: string;
  }): Promise<IUser | null> {
    await dbConnect();
    
    const updateData: any = {};
    
    if (profileData.firstName) updateData['profileData.firstName'] = profileData.firstName;
    if (profileData.lastName) updateData['profileData.lastName'] = profileData.lastName;
    if (profileData.country) updateData['profileData.country'] = profileData.country;
    if (profileData.preferredCurrency) updateData['profileData.preferredCurrency'] = profileData.preferredCurrency;
    if (profileData.email) updateData.email = profileData.email;
    if (profileData.phone) updateData.phone = profileData.phone;

    // @ts-ignore - Mongoose union type compatibility issue
    return User.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      { $set: updateData },
      { new: true, runValidators: true }
    );
  }

  static async getAllUsers(limit: number = 100, offset: number = 0): Promise<IUser[]> {
    await dbConnect();
    // @ts-ignore - Mongoose union type compatibility issue
    return User.find({})
      .skip(offset)
      .limit(limit)
      .sort({ createdAt: -1 });
  }

  static async getUserStats(walletAddress: string): Promise<{
    totalSavings: number;
    totalUtilitySpent: number;
    groupsCount: number;
    transactionsCount: number;
  }> {
    await dbConnect();
    
    const user = await this.getUserByWallet(walletAddress);
    if (!user) throw new Error('User not found');

    // These would be calculated from related collections
    // Will implement detailed stats in analytics service
    return {
      totalSavings: user.savings.totalSaved,
      totalUtilitySpent: 0, // Calculate from transactions
      groupsCount: 0, // Calculate from groups
      transactionsCount: 0 // Calculate from transactions
    };
  }
}
