#!/usr/bin/env node

/**
 * Development Server with Database Initialization
 * 
 * Ensures database is properly initialized before starting Next.js dev server
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`[${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

class DevServerWithDB {
  async start() {
    try {
      log('🚀 Starting Esusu Backend with Database Initialization...', 'bright');
      // Load environment variables from backend root before any checks
      this.loadEnv();
      
      await this.checkEnvironment();
      await this.initializeDatabase();
      await this.startNextServer();
      
    } catch (error) {
      logError(`Startup failed: ${error.message}`);
      process.exit(1);
    }
  }

  loadEnv() {
    const backendRoot = path.resolve(__dirname, '..');
    const envLocalPath = path.join(backendRoot, '.env.local');
    const envPath = path.join(backendRoot, '.env');
    // Load .env.local first so it can override .env
    if (fs.existsSync(envLocalPath)) {
      dotenv.config({ path: envLocalPath });
      log(`Loaded environment from ${envLocalPath}`);
    }
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      log(`Loaded environment from ${envPath}`);
    }
  }

  async checkEnvironment() {
    logStep('1/3', 'Checking environment configuration...');
    
    // Check for required environment variables
    const requiredVars = ['MONGODB_URI'];
    const missingVars = [];
    
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    }
    
    if (missingVars.length > 0) {
      logError(`Missing required environment variables: ${missingVars.join(', ')}`);
      logWarning('Make sure you have a .env file with MONGODB_URI configured');
      process.exit(1);
    }
    
    // Validate MongoDB URI format
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
      logError('MONGODB_URI must start with mongodb:// or mongodb+srv://');
      process.exit(1);
    }
    
    logSuccess('Environment configuration validated');
  }

  async initializeDatabase() {
    logStep('2/3', 'Initializing database...');
    
    try {
      // Test database connection and initialize
      const initScript = `
        const mongoose = require('mongoose');
        
        async function initDb() {
          try {
            const uri = process.env.MONGODB_URI;
            if (!uri) {
              console.error('MONGODB_URI is not set');
              process.exit(1);
            }
            console.log('🔗 Connecting to database...');
            await mongoose.connect(uri, {
              bufferCommands: false,
              serverSelectionTimeoutMS: 10000,
              socketTimeoutMS: 15000,
              connectTimeoutMS: 10000,
              family: 4
            });
            // Simple ping to confirm connectivity
            const admin = mongoose.connection.db.admin();
            await admin.ping();
            console.log('✅ Database connectivity verified');
            await mongoose.disconnect();
            process.exit(0);
          } catch (error) {
            console.error('❌ Database initialization failed:', error?.message || error);
            process.exit(1);
          }
        }
        
        initDb();
      `;
      
      const tempFile = 'temp-init-db.js';
      fs.writeFileSync(tempFile, initScript);
      
      await this.runCommand('node', [tempFile], { timeout: 30000 });
      
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      
      logSuccess('Database initialization completed');
    } catch (error) {
      // Clean up temp file on error
      const tempFile = 'temp-init-db.js';
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  }

  async startNextServer() {
    logStep('3/3', 'Starting Next.js development server...');
    
    log('📡 Backend server will be available at: http://localhost:3001', 'green');
    log('🔍 Health check endpoint: http://localhost:3001/api/db/health', 'blue');
    log('', 'reset');
    
    // Start Next.js dev server
    const nextProcess = spawn('next', ['dev', '-p', '3001'], {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    // Handle process termination
    process.on('SIGINT', () => {
      log('\n🛑 Shutting down development server...', 'yellow');
      nextProcess.kill('SIGINT');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      nextProcess.kill('SIGTERM');
      process.exit(0);
    });

    nextProcess.on('close', (code) => {
      if (code !== 0) {
        logError(`Next.js server exited with code ${code}`);
        process.exit(code);
      }
    });

    nextProcess.on('error', (error) => {
      logError(`Failed to start Next.js server: ${error.message}`);
      process.exit(1);
    });
  }

  runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const { timeout = 10000 } = options;
      
      const child = spawn(command, args, {
        stdio: ['inherit', 'inherit', 'inherit'],
        shell: process.platform === 'win32'
      });
      
      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);
      
      child.on('close', (code) => {
        clearTimeout(timeoutId);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });
      
      child.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }
}

// Start the development server
if (require.main === module) {
  const devServer = new DevServerWithDB();
  devServer.start();
}

module.exports = DevServerWithDB;
