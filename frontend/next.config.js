/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Use an object for serverActions to satisfy Next 15 config schema
    serverActions: {},
    externalDir: true
  },
  eslint: {
    // Do not fail the build on ESLint errors. We run lint separately.
    ignoreDuringBuilds: true,
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