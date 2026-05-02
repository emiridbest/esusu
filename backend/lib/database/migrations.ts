import mongoose from 'mongoose';
import { 
  User, 
  Transaction, 
  Group, 
  Notification, 
  Analytics, 
  PaymentHash 
} from './schemas';

/**
 * Database Migration System
 * Handles version upgrades and schema changes during deployment
 */

interface Migration {
  version: string;
  description: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

export class MigrationService {
  private static migrations: Migration[] = [
    {
      version: '1.0.0',
      description: 'Initial database setup',
      up: async () => {
        console.log('📦 Running initial migration v1.0.0...');
        // Initial setup is handled by DatabaseInitializer
      },
      down: async () => {
        console.log('🔄 Reverting migration v1.0.0...');
        // Migration collection will be created automatically
        
        const db = mongoose.connection.db;
        if (!db) {
          throw new Error('Database connection not available');
        }
        
        // Drop all collections
        await Promise.all([
          db.dropCollection('users').catch(() => {}),
          db.dropCollection('transactions').catch(() => {}),
          db.dropCollection('groups').catch(() => {}),
          db.dropCollection('notifications').catch(() => {}),
          db.dropCollection('analytics').catch(() => {}),
          db.dropCollection('paymenthashes').catch(() => {})
        ]);
      }
    },
    {
      version: '1.1.0',
      description: 'Add compound indexes for performance',
      up: async () => {
        console.log('📦 Running migration v1.1.0 - Adding performance indexes...');
        
        await Promise.all([
          // User performance indexes
          User.collection.createIndex(
            { 'profileData.country': 1, createdAt: -1 },
            { background: true, name: 'country_created_idx' }
          ),
          
          // Transaction performance indexes
          Transaction.collection.createIndex(
            { user: 1, type: 1, createdAt: -1 },
            { background: true, name: 'user_type_created_idx' }
          ),
          Transaction.collection.createIndex(
            { token: 1, status: 1 },
            { background: true, name: 'token_status_idx' }
          ),
          
          // Group performance indexes
          Group.collection.createIndex(
            { status: 1, 'settings.contributionInterval': 1 },
            { background: true, name: 'status_interval_idx' }
          ),
          
          // Analytics performance indexes
          Analytics.collection.createIndex(
            { user: 1, period: 1, 'metrics.totalSavings': -1 },
            { background: true, name: 'user_period_savings_idx' }
          )
        ]);
      },
      down: async () => {
        console.log('🔄 Reverting migration v1.1.0...');
        
        await Promise.all([
          User.collection.dropIndex('country_created_idx').catch(() => {}),
          Transaction.collection.dropIndex('user_type_created_idx').catch(() => {}),
          Transaction.collection.dropIndex('token_status_idx').catch(() => {}),
          Group.collection.dropIndex('status_interval_idx').catch(() => {}),
          Analytics.collection.dropIndex('user_period_savings_idx').catch(() => {})
        ]);
      }
    },
    {
      version: '1.2.0',
      description: 'Add data validation and constraints',
      up: async () => {
        console.log('📦 Running migration v1.2.0 - Adding data validation...');
        
        // Add validation rules
        const db = mongoose.connection.db;
        if (!db) {
          throw new Error('Database connection not available');
        }
        
        await db.command({
          collMod: 'transactions',
          validator: {
            $jsonSchema: {
              bsonType: 'object',
              required: ['user', 'transactionHash', 'type', 'amount', 'token'],
              properties: {
                amount: {
                  bsonType: 'double',
                  minimum: 0,
                  description: 'Amount must be a positive number'
                },
                type: {
                  enum: ['savings', 'withdrawal', 'utility_payment', 'group_contribution', 'group_payout']
                }
              }
            }
          }
        });
      },
      down: async () => {
        console.log('🔄 Reverting migration v1.2.0...');
        
        // Remove validation
        const db = mongoose.connection.db;
        if (!db) {
          throw new Error('Database connection not available');
        }
        
        await db.command({
          collMod: 'transactions',
          validator: {}
        });
      }
    },
    {
      version: '1.2.1',
      description: 'Fix G$ and CELO utility_payment amounts stored as USD instead of token units',
      up: async () => {
        console.log('📦 Running migration v1.2.1 - Fixing G$/CELO utility payment amounts...');

        // 1 G$ = $0.0001167 USD  →  correct_G$ = stored_USD / 0.0001167
        const GD_USD_PRICE = 0.0001167;
        // 1 CELO = $0.1 USD  →  correct_CELO = stored_USD / 0.1
        const CELO_USD_PRICE = 0.1;

        const db = mongoose.connection.db;
        if (!db) throw new Error('Database connection not available');

        // Fix G$ records: amount < 10 means it was stored as USD cents
        const gdResult = await db.collection('transactions').updateMany(
          { type: 'utility_payment', token: 'G$', amount: { $gt: 0, $lt: 10 } },
          [{ $set: { amount: { $divide: ['$amount', GD_USD_PRICE] } } }]
        );
        console.log(`✅ Fixed ${gdResult.modifiedCount} G$ transaction(s)`);

        // Fix CELO records: same criterion
        const celoResult = await db.collection('transactions').updateMany(
          { type: 'utility_payment', token: 'CELO', amount: { $gt: 0, $lt: 10 } },
          [{ $set: { amount: { $divide: ['$amount', CELO_USD_PRICE] } } }]
        );
        console.log(`✅ Fixed ${celoResult.modifiedCount} CELO transaction(s)`);
      },
      down: async () => {
        console.log('🔄 Reverting migration v1.2.1 - Restoring G$/CELO amounts to USD values...');

        const GD_USD_PRICE = 0.0001167;
        const CELO_USD_PRICE = 0.1;

        const db = mongoose.connection.db;
        if (!db) throw new Error('Database connection not available');

        // Reverse: corrected token amounts are large (>10), USD originals were tiny (<10)
        await db.collection('transactions').updateMany(
          { type: 'utility_payment', token: 'G$', amount: { $gte: 10 } },
          [{ $set: { amount: { $multiply: ['$amount', GD_USD_PRICE] } } }]
        );

        await db.collection('transactions').updateMany(
          { type: 'utility_payment', token: 'CELO', amount: { $gte: 10 } },
          [{ $set: { amount: { $multiply: ['$amount', CELO_USD_PRICE] } } }]
        );

        console.log('✅ Revert complete');
      }
    }
  ];

  /**
   * Run all pending migrations
   */
  static async runMigrations(): Promise<void> {
    console.log('🚀 Starting migration process...');
    
    try {
      // Get current version
      const currentVersion = await this.getCurrentVersion();
      console.log(`📍 Current database version: ${currentVersion}`);
      
      // Find migrations to run
      const pendingMigrations = this.migrations.filter(migration => 
        this.compareVersions(migration.version, currentVersion) > 0
      );
      
      if (pendingMigrations.length === 0) {
        console.log('✅ Database is up to date');
        return;
      }
      
      console.log(`📦 Running ${pendingMigrations.length} pending migrations...`);
      
      // Run migrations in sequence
      for (const migration of pendingMigrations) {
        console.log(`🔄 Running migration ${migration.version}: ${migration.description}`);
        await migration.up();
        await this.setVersion(migration.version);
        console.log(`✅ Migration ${migration.version} completed`);
      }
      
      console.log('🎉 All migrations completed successfully');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Rollback to a specific version
   */
  static async rollbackTo(targetVersion: string): Promise<void> {
    console.log(`🔄 Rolling back to version ${targetVersion}...`);
    
    const currentVersion = await this.getCurrentVersion();
    
    // Find migrations to rollback
    const migrationsToRollback = this.migrations
      .filter(migration => this.compareVersions(migration.version, targetVersion) > 0)
      .reverse(); // Rollback in reverse order
    
    for (const migration of migrationsToRollback) {
      console.log(`🔄 Rolling back migration ${migration.version}`);
      await migration.down();
    }
    
    await this.setVersion(targetVersion);
    console.log(`✅ Rollback to ${targetVersion} completed`);
  }

  private static async getExecutedMigrations(): Promise<string[]> {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }
    
    const migrations = await db
      .collection('migrations')
      .find({ status: 'completed' })
      .sort({ executedAt: 1 })
      .toArray();
    
    return migrations.map(m => m.version);
  }

  private static async getCurrentVersion(): Promise<string> {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }
      
      const versionDoc = await db
        .collection('migrations')
        .findOne({ _id: 'version' } as any);
      
      return versionDoc?.version || '0.0.0';
    } catch (error) {
      // Collection doesn't exist yet
      return '0.0.0';
    }
  }

  private static async setVersion(version: string): Promise<void> {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }
    
    await db
      .collection('migrations')
      .replaceOne(
        { _id: 'version' } as any,
        { _id: 'version', version, updatedAt: new Date() },
        { upsert: true }
      );
  }

  private static compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }
}
