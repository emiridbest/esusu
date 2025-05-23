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
            value: "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' https://app.posthog.com https://us-assets.i.posthog.com 'unsafe-inline'; connect-src 'self' https://app.posthog.com https://us-assets.i.posthog.com; img-src 'self' data: blob:; frame-src 'self' https://*.warpcast.com https://*.farcaster.xyz;"
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
