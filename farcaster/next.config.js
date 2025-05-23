/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true
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
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.posthog.com https://*.posthogcdn.com; connect-src 'self' https://*.posthog.com; frame-ancestors 'self' https://*.farcaster.xyz https://*.warpcast.com https://*.farcaster.network https://*.frames.deploy-preview-6754.frame.far.quest *;",
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