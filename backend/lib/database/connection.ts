import mongoose from 'mongoose';
import { envConfig } from '../config/environment';

// Define a global cache type for mongoose to avoid multiple connections in dev
type MongooseGlobal = {
  conn: typeof import('mongoose') | null;
  promise: Promise<typeof import('mongoose')> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseGlobal | undefined;
}

// Global mongoose behavior tweaks to avoid silent buffering
mongoose.set('bufferCommands', false);
mongoose.set('strictQuery', true);

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached: MongooseGlobal = (globalThis.mongoose as MongooseGlobal) || { conn: null, promise: null };
globalThis.mongoose = cached;

// Wait until mongoose is fully connected (readyState === 1) or time out
function waitForReady(timeoutMs = 15000): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (mongoose.connection.readyState === 1) {
      return resolve(true);
    }

    const onConnected = () => {
      cleanup();
      resolve(true);
    };

    const onError = (err: unknown) => {
      cleanup();
      reject(err instanceof Error ? err : new Error(String(err)));
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Mongo did not reach readyState=1 within ${timeoutMs}ms (state=${mongoose.connection.readyState})`));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      mongoose.connection.off('connected', onConnected);
      mongoose.connection.off('error', onError);
    };

    mongoose.connection.on('connected', onConnected);
    mongoose.connection.on('error', onError);
  });
}

async function dbConnect() {
  // Lazily resolve environment each call to ensure env is loaded in all runtimes
  const config = envConfig.getConfig();
  const MONGODB_URI = config.database.uri;

  // Helpful diagnostics to detect duplicate mongoose instances and runtime
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const resolvedPath = require.resolve('mongoose');
    console.log('🧩 Mongoose module:', {
      version: (mongoose as any).version,
      resolvedPath,
      readyState: mongoose.connection.readyState,
    });
  } catch (_) {
    // noop
  }

  if (cached.conn) {
    console.log('🔁 Cached mongoose instance present. ReadyState:', mongoose.connection.readyState);
    if (mongoose.connection.readyState === 1) {
      return cached.conn;
    }
    // If not connected yet, fall through to await any in-flight promise or start a new connection
  }

  // If there is a cached (possibly resolved) promise but the connection is
  // currently disconnected or disconnecting, reset the promise so we can
  // attempt a fresh reconnection. This handles cases where the initial
  // connection succeeded, later dropped, and subsequent calls would otherwise
  // only wait for ready without re-connecting.
  if (
    cached.promise &&
    mongoose.connection.readyState !== 1 &&
    mongoose.connection.readyState !== 2
  ) {
    console.warn('🔄 Mongoose has a stale promise with readyState', mongoose.connection.readyState, '- resetting to reconnect');
    cached.promise = null;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: config.database.connectionTimeout,
      socketTimeoutMS: config.database.socketTimeout,
      connectTimeoutMS: config.database.connectionTimeout,
      maxPoolSize: config.database.maxPoolSize,
      minPoolSize: config.database.minPoolSize,
      maxIdleTimeMS: 30000,
      waitQueueTimeoutMS: 5000,
      family: 4, // Use IPv4, skip trying IPv6
      directConnection: true, // Prefer direct connection for single-host URIs/proxies
    } as const;

    console.log('🔌 Connecting to MongoDB...', {
      uri: MONGODB_URI ? `${MONGODB_URI.substring(0, 20)}...` : 'NOT SET',
      env: config.app.nodeEnv,
      pool: `${config.database.minPoolSize}-${config.database.maxPoolSize}`
    });

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then(async (mongooseInstance) => {
        console.log('✅ MongoDB connected successfully. ReadyState:', mongoose.connection.readyState);

        // Initialize database (collections, indexes, migrations, seed data)
        const { DatabaseInitializer } = await import('./initializer');
        await DatabaseInitializer.initialize();

        return mongooseInstance;
      })
      .catch((error) => {
        console.error('❌ MongoDB connection error:', {
          name: error?.name,
          message: error?.message,
        });
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
    // Double-check readiness in case driver reports connected before indexes/migrations complete
    if (mongoose.connection.readyState !== 1) {
      await waitForReady(config.database.connectionTimeout + 5000);
    }
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
