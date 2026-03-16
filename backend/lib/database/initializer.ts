import mongoose from 'mongoose';
import { 
  User, 
  Transaction, 
  Group, 
  Notification, 
  Analytics, 
  PaymentHash,
  ThriftGroupMetadata,
  IUser,
  ITransaction,
  Invite 
} from './schemas';
import { FaceVerificationLog } from './faceVerificationLog';

/**
 * Database Initialization Service
 * Handles automatic database setup, indexing, and seeding
 * Designed for deployment environments where DB may not exist
 */
export class DatabaseInitializer {
  private static initialized = false;
  private static initializationPromise: Promise<void> | null = null;

  /**
   * Initialize database - creates collections, indexes, and seeds data
   * Thread-safe with singleton pattern to prevent duplicate initialization
   */
  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    this.initializationPromise = this._performInitialization();
    return this.initializationPromise;
  }

  private static async _performInitialization(): Promise<void> {
    console.log('🔧 Starting database initialization...');
    const startTime = Date.now();

    try {
      // Step 1: Verify connection
      await this._verifyConnection();

      // Step 2: Create collections and indexes (parallel)
      await Promise.all([
        this._ensureCollectionExists('users'),
        this._ensureCollectionExists('transactions'),
        this._ensureCollectionExists('groups'),
        this._ensureCollectionExists('notifications'),
        this._ensureCollectionExists('analytics'),
        this._ensureCollectionExists('paymenthashes'),
        this._ensureCollectionExists('thriftgroupmetadatas'),
        this._ensureCollectionExists('faceverificationlogs'),
        this._ensureCollectionExists('invites')
      ]);

      // Step 3: Create indexes (parallel for performance)
      await Promise.all([
        this._createUserIndexes(),
        this._createTransactionIndexes(),
        this._createGroupIndexes(),
        this._createNotificationIndexes(),
        this._createAnalyticsIndexes(),
        this._createPaymentHashIndexes(),
        this._createThriftMetadataIndexes(),
        this._createFaceVerificationLogIndexes(),
        this._createInviteIndexes(),
      ]);

      // Step 4: Run database migrations
      await this._runMigrations();

      // Step 5: Seed initial data if needed  
      await this._seedInitialData();

      // Step 6: Verify database health
      await this._verifyDatabaseHealth();

      const endTime = Date.now();
      console.log(`✅ Database initialization completed in ${endTime - startTime}ms`);
      this.initialized = true;

    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      if (error instanceof Error && error.message.includes('validation')) {
        console.error('Validation error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      this.initializationPromise = null; // Reset to allow retry
      throw new Error(`Database initialization failed: ${(error as Error).message}`);
    }
  }

  private static async _createInviteIndexes(): Promise<void> {
    try {
      await Invite.collection.createIndexes([
        { key: { walletAddress: 1 }, unique: true, background: true },
        { key: { inviterAddress: 1 }, background: true },
        { key: { createdAt: -1 }, background: true }
      ]);
      console.log('🔍 Invite indexes created');
    } catch (error) {
      console.warn('⚠️ Invite indexes may already exist:', (error as Error).message);
    }
  }

  private static async _verifyConnection(): Promise<void> {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection not established');
    }
    console.log('✅ Database connection verified');
  }

  private static async _ensureCollectionExists(collectionName: string): Promise<void> {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }
    
    try {
      const collections = await db.listCollections({ name: collectionName }).toArray();
      if (collections.length === 0) {
        await db.createCollection(collectionName);
        console.log(`📁 Created collection: ${collectionName}`);
      } else {
        console.log(`📁 Collection exists: ${collectionName}`);
      }
    } catch (error) {
      // If collection creation fails, it might already exist or there might be a permission issue
      console.warn(`⚠️ Could not verify/create collection ${collectionName}:`, (error as Error).message);
      // Don't throw error - continue with initialization
    }
  }

  private static async _createUserIndexes(): Promise<void> {
    try {
      await User.collection.createIndexes([
        { key: { walletAddress: 1 }, unique: true, background: true },
        { key: { email: 1 }, sparse: true, unique: true, background: true },
        { key: { createdAt: -1 }, background: true }
      ]);
      console.log('🔍 User indexes created');
    } catch (error) {
      console.warn('⚠️ User indexes may already exist:', (error as Error).message);
    }
  }

  private static async _createTransactionIndexes(): Promise<void> {
    try {
      await Transaction.collection.createIndexes([
        { key: { user: 1, createdAt: -1 }, background: true },
        { key: { transactionHash: 1 }, unique: true, background: true },
        { key: { type: 1, status: 1 }, background: true },
        { key: { status: 1 }, background: true },
        { key: { 'blockchainStatus.confirmed': 1 }, background: true }
      ]);
      console.log('🔍 Transaction indexes created');
    } catch (error) {
      console.warn('⚠️ Transaction indexes may already exist:', (error as Error).message);
    }
  }

  private static async _createGroupIndexes(): Promise<void> {
    try {
      await Group.collection.createIndexes([
        { key: { 'members.user': 1 }, background: true },
        { key: { status: 1 }, background: true },
        { key: { createdAt: -1 }, background: true },
        { key: { currentRound: 1 }, background: true }
      ]);
      console.log('🔍 Group indexes created');
    } catch (error) {
      console.warn('⚠️ Group indexes may already exist:', (error as Error).message);
    }
  }

  private static async _createNotificationIndexes(): Promise<void> {
    try {
      await Notification.collection.createIndexes([
        { key: { user: 1, read: 1, createdAt: -1 }, background: true },
        { key: { type: 1 }, background: true },
        { key: { createdAt: -1 }, background: true }
      ]);
      console.log('🔍 Notification indexes created');
    } catch (error) {
      console.warn('⚠️ Notification indexes may already exist:', (error as Error).message);
    }
  }

  private static async _createAnalyticsIndexes(): Promise<void> {
    try {
      await Analytics.collection.createIndexes([
        { key: { user: 1, period: 1, date: -1 }, background: true },
        { key: { period: 1, date: -1 }, background: true }
      ]);
      console.log('🔍 Analytics indexes created');
    } catch (error) {
      console.warn('⚠️ Analytics indexes may already exist:', (error as Error).message);
    }
  }

  private static async _createPaymentHashIndexes(): Promise<void> {
    try {
      await PaymentHash.collection.createIndexes([
        { key: { transactionHash: 1 }, unique: true, background: true },
        { key: { used: 1 }, background: true },
        { key: { user: 1 }, background: true },
        { key: { usedAt: 1 }, background: true }
      ]);
      console.log('🔍 PaymentHash indexes created');
    } catch (error) {
      console.warn('⚠️ PaymentHash indexes may already exist:', (error as Error).message);
    }
  }

  private static async _createThriftMetadataIndexes(): Promise<void> {
    try {
      await ThriftGroupMetadata.collection.createIndexes([
        { key: { contractAddress: 1, groupId: 1 }, unique: true, background: true },
        { key: { createdBy: 1 }, background: true },
        { key: { updatedAt: -1 }, background: true },
      ]);
      console.log('🔍 ThriftGroupMetadata indexes created');
    } catch (error) {
      console.warn('⚠️ ThriftGroupMetadata indexes may already exist:', (error as Error).message);
    }
  }

  private static async _createFaceVerificationLogIndexes(): Promise<void> {
    try {
      await FaceVerificationLog.collection.createIndexes([
        { key: { address: 1, timestamp: -1 }, background: true },
        { key: { success: 1 }, background: true },
        { key: { timestamp: -1 }, background: true }
      ]);
      console.log('🔍 FaceVerificationLog indexes created');
    } catch (error) {
      console.warn('⚠️ FaceVerificationLog indexes may already exist:', (error as Error).message);
    }
  }

  private static async _seedInitialData(): Promise<void> {
    console.log('🌱 Checking for initial data seeding...');
    
    // Check if we need to seed data (only in development or first deployment)
    // @ts-ignore - Mongoose union type compatibility issue
    const userCount = await User.countDocuments();
    
    if (userCount === 0 && process.env.NODE_ENV === 'development') {
      await this._seedDevelopmentData();
    }
    
    console.log('🌱 Initial data seeding completed');
  }

  private static async _seedDevelopmentData(): Promise<void> {
    console.log('🌱 Seeding development data...');
    
    try {
      // Create test user
      const testUser = new User({
        walletAddress: '0x5b2e388403b60972777873e359a5d04a832836b3',
        email: 'test@esusu.com',
        profileData: {
          firstName: 'Test',
          lastName: 'User',
          country: 'NG',
          preferredCurrency: 'USD'
        },
        savings: {
          totalSaved: 0,
          aaveDeposits: 0,
          currentAPY: 0
        }
      });
      await testUser.save();

    // Create sample transactions
    const transaction1 = new Transaction({
      user: testUser._id,
      transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
      type: 'utility_payment',
      subType: 'airtime',
      amount: 5.0,
      token: 'cUSD',
      status: 'completed',
      blockchainStatus: {
        confirmed: true,
        confirmations: 5
      },
      utilityDetails: {
        recipient: '+234123456789',
        provider: 'MTN Nigeria',
        country: 'NG',
        metadata: {}
      }
    });
    await transaction1.save();

    const transaction2 = new Transaction({
      user: testUser._id,
      transactionHash: '0x2345678901bcdef23456789012bcdef234567890',
      type: 'savings',
      subType: 'aave_deposit',
      amount: 50.0,
      token: 'cUSD',
      status: 'completed',
      blockchainStatus: {
        confirmed: true,
        confirmations: 10
      },
      aaveDetails: {
        underlyingAsset: 'cUSD',
        apy: 4.2
      }
    });
      await transaction2.save();

      console.log('✅ Development data seeded');
    } catch (error) {
      console.error('❌ Error seeding development data:', error);
      if (error instanceof Error && error.message.includes('validation')) {
        console.error('Validation error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      throw error;
    }
  }

  private static async _runMigrations(): Promise<void> {
    console.log('🔄 Running database migrations...');
    
    try {
      const { MigrationService } = await import('./migrations');
      await MigrationService.runMigrations();
      console.log('✅ Database migrations completed');
    } catch (error) {
      console.error('❌ Database migrations failed:', error);
      throw error;
    }
  }

  private static async _verifyDatabaseHealth(): Promise<void> {
    console.log('🏥 Verifying database health...');
    
    try {
      // Simple health check - just try to count documents in each collection
      // Use Promise.allSettled to not fail if one collection has issues
      const results = await Promise.allSettled([
        User.countDocuments().limit(1),
        Transaction.countDocuments().limit(1),
        Group.countDocuments().limit(1),
        Notification.countDocuments().limit(1),
        Analytics.countDocuments().limit(1),
        PaymentHash.countDocuments().limit(1)
      ]);
      
      // Check if any critical collections failed
      const failedCollections = results.filter(result => result.status === 'rejected');
      if (failedCollections.length > 0) {
        console.warn('⚠️ Some collections had issues during health check:', failedCollections.length);
        failedCollections.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.warn(`  - Collection ${index} failed:`, result.reason);
          }
        });
      }
      
      console.log('✅ Database health verified');
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      // Don't throw error - just log it and continue
      console.warn('⚠️ Continuing despite health check issues...');
    }
  }

  /**
   * Reset initialization state (useful for testing)
   */
  static reset(): void {
    this.initialized = false;
    this.initializationPromise = null;
  }

  /**
   * Get initialization status
   */
  static isInitialized(): boolean {
    return this.initialized;
  }
}
