/**
 * Farcaster FID to Wallet Address Mapping Service
 * Maps Farcaster user IDs (FIDs) to wallet addresses for transaction processing
 */

import { UserService } from '@esusu/backend/lib/services/userService';

interface FIDMapping {
  fid: number;
  walletAddress: string;
  isPrimary: boolean;
  createdAt: Date;
  lastUsed: Date;
}

export class FIDMappingService {
  /**
   * Link a Farcaster FID to a wallet address
   */
  static async linkFIDToWallet(
    fid: number,
    walletAddress: string,
    isPrimary: boolean = true
  ): Promise<void> {
    try {
      // Create or update user with FID using the correct method
      await UserService.createOrUpdateUser(walletAddress, {
        farcasterFid: fid,
        lastActive: new Date(),
      } as any);
    } catch (error) {
      console.error('Error linking FID to wallet:', error);
      throw new Error(`Failed to link FID ${fid} to wallet ${walletAddress}`);
    }
  }

  /**
   * Get wallet address from FID
   * Note: This requires a custom query since getUserByFID doesn't exist yet
   */
  static async getWalletFromFID(fid: number): Promise<string | null> {
    try {
      // For now, we'll need to query directly or add this method to UserService
      // Temporary workaround: return null if no mapping exists
      // TODO: Add getUserByFID to UserService
      return null;
    } catch (error) {
      console.error('Error getting wallet from FID:', error);
      return null;
    }
  }

  /**
   * Get FID from wallet address
   */
  static async getFIDFromWallet(walletAddress: string): Promise<number | null> {
    try {
      const user = await UserService.getUserByWallet(walletAddress);
      return (user as any)?.farcasterFid || null;
    } catch (error) {
      console.error('Error getting FID from wallet:', error);
      return null;
    }
  }

  /**
   * Verify FID ownership of wallet
   */
  static async verifyFIDOwnership(fid: number, walletAddress: string): Promise<boolean> {
    try {
      const linkedWallet = await this.getWalletFromFID(fid);
      return linkedWallet?.toLowerCase() === walletAddress.toLowerCase();
    } catch (error) {
      console.error('Error verifying FID ownership:', error);
      return false;
    }
  }

  /**
   * Get or create mapping for FID and wallet
   */
  static async getOrCreateMapping(
    fid: number,
    walletAddress: string
  ): Promise<string> {
    try {
      const existingWallet = await this.getWalletFromFID(fid);
      
      if (existingWallet) {
        if (existingWallet.toLowerCase() === walletAddress.toLowerCase()) {
          return existingWallet;
        }
        await this.linkFIDToWallet(fid, walletAddress, true);
        return walletAddress;
      }
      
      await this.linkFIDToWallet(fid, walletAddress, true);
      return walletAddress;
    } catch (error) {
      console.error('Error getting or creating FID mapping:', error);
      throw error;
    }
  }

  /**
   * Remove FID mapping
   */
  static async unlinkFID(fid: number): Promise<void> {
    try {
      const walletAddress = await this.getWalletFromFID(fid);
      if (walletAddress) {
        // @ts-ignore - Mongoose type compatibility
        await UserService.updateUser(walletAddress, {
          farcasterFid: null,
        });
      }
    } catch (error) {
      console.error('Error unlinking FID:', error);
      throw error;
    }
  }
}
