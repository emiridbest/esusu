/**
 * Environment Configuration Validation
 * 
 * Validates and provides typed access to environment variables
 * with proper defaults and validation rules.
 */

export interface DatabaseConfig {
  uri: string;
  adminKey: string;
  connectionTimeout: number;
  socketTimeout: number;
  maxPoolSize: number;
  minPoolSize: number;
}

export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  nextAuthSecret: string;
  nextAuthUrl: string;
}

export interface EnvironmentConfig {
  database: DatabaseConfig;
  app: AppConfig;
}

class EnvironmentValidator {
  private static instance: EnvironmentValidator;
  private config: EnvironmentConfig | null = null;

  static getInstance(): EnvironmentValidator {
    if (!EnvironmentValidator.instance) {
      EnvironmentValidator.instance = new EnvironmentValidator();
    }
    return EnvironmentValidator.instance;
  }

  validate(): EnvironmentConfig {
    if (this.config) {
      return this.config;
    }

    console.log('🔍 Validating environment configuration...');

    const errors: string[] = [];
    
    // Validate required variables
    const mongoUri = this.getRequiredEnv('MONGODB_URI', errors);
    const nodeEnv = this.validateNodeEnv(errors);
    
    // Validate optional variables with defaults
    const dbAdminKey = process.env.DB_ADMIN_KEY || 'admin123';
    const port = parseInt(process.env.PORT || '3000', 10);
    const nextAuthSecret = process.env.NEXTAUTH_SECRET || this.generateDefaultSecret();
    const nextAuthUrl = process.env.NEXTAUTH_URL || `http://localhost:${port}`;

    // Validate MongoDB URI format
    if (mongoUri && !this.isValidMongoUri(mongoUri)) {
      errors.push('MONGODB_URI must be a valid MongoDB connection string (mongodb:// or mongodb+srv://)');
    }

    // Validate port
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push('PORT must be a valid port number (1-65535)');
    }

    if (errors.length > 0) {
      const errorMessage = `Environment validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`;
      console.error('❌', errorMessage);
      throw new Error(errorMessage);
    }

    this.config = {
      database: {
        uri: mongoUri!,
        adminKey: dbAdminKey,
        connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10),
        socketTimeout: parseInt(process.env.DB_SOCKET_TIMEOUT || '15000', 10),
        maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '10', 10),
        minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE || '5', 10)
      },
      app: {
        nodeEnv: nodeEnv!,
        port,
        nextAuthSecret,
        nextAuthUrl
      }
    };

    console.log('✅ Environment configuration validated successfully');
    
    // Log configuration (without sensitive data)
    console.log('📋 Configuration summary:');
    console.log(`  - Environment: ${this.config.app.nodeEnv}`);
    console.log(`  - Port: ${this.config.app.port}`);
    console.log(`  - Database: ${this.maskUri(this.config.database.uri)}`);
    console.log(`  - Pool Size: ${this.config.database.minPoolSize}-${this.config.database.maxPoolSize}`);

    return this.config;
  }

  private getRequiredEnv(name: string, errors: string[]): string | undefined {
    const value = process.env[name];
    if (!value || value.trim() === '') {
      errors.push(`${name} is required but not set`);
      return undefined;
    }
    return value.trim();
  }

  private validateNodeEnv(errors: string[]): 'development' | 'production' | 'test' | undefined {
    const nodeEnv = process.env.NODE_ENV;
    if (!nodeEnv) {
      return 'development'; // Default fallback
    }
    
    const validEnvs = ['development', 'production', 'test'];
    if (!validEnvs.includes(nodeEnv)) {
      errors.push(`NODE_ENV must be one of: ${validEnvs.join(', ')} (got: ${nodeEnv})`);
      return undefined;
    }
    
    return nodeEnv as 'development' | 'production' | 'test';
  }

  private isValidMongoUri(uri: string): boolean {
    return uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://');
  }

  private generateDefaultSecret(): string {
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ NEXTAUTH_SECRET not set in production - generating random secret');
    }
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private maskUri(uri: string): string {
    try {
      const url = new URL(uri);
      if (url.password) {
        url.password = '***';
      }
      return url.toString();
    } catch {
      // If URI parsing fails, just mask potential passwords
      return uri.replace(/:([^:@]+)@/, ':***@');
    }
  }

  getConfig(): EnvironmentConfig {
    if (!this.config) {
      return this.validate();
    }
    return this.config;
  }

  isDevelopment(): boolean {
    return this.getConfig().app.nodeEnv === 'development';
  }

  isProduction(): boolean {
    return this.getConfig().app.nodeEnv === 'production';
  }

  isTest(): boolean {
    return this.getConfig().app.nodeEnv === 'test';
  }
}

// Export singleton instance
export const envConfig = EnvironmentValidator.getInstance();

// Export for testing
export { EnvironmentValidator };

// Only validate in non-import contexts to avoid issues during development
if (require.main === module) {
  envConfig.validate();
}
