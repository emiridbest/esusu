/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Use an object for serverActions to satisfy Next 15 config schema
    serverActions: {},
    externalDir: true
  },
  // Ensure Vercel/Next includes external backend files used by API routes
  outputFileTracingIncludes: {
    'app/api/**': ['../backend/lib/**']
  },
  // Set workspace root to silence multiple lockfiles warning
  outputFileTracingRoot: require('path').join(__dirname, '..'),

  // typescript: {
  //   // Don't fail the build on TypeScript errors during Vercel deployment
  //   ignoreBuildErrors: true,
  // },
  webpack: (config, { isServer }) => {
    // Handle MongoDB and other Node.js modules for client-side rendering
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        dns: false,
        child_process: false,
        tls: false,
      };
    }
    
    // Optimize for Vercel deployment
    config.externals = [...(config.externals || []), 'aws4'];
    
    return config;
  },
  env: {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3001',
  },
  // Configure CORS and other security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;