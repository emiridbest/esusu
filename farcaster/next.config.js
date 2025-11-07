/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  reactStrictMode: true,
  pageExtensions: ['tsx', 'ts'],
  allowedDevOrigins: ['local-origin.dev', '*.local-origin.dev', 'https://fourth-adventures-removed-file.trycloudflare.com'],
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      fs: false
    }
    
    // Add explicit path aliases for production builds
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname)
    }
    
    // Exclude backend-temp files from webpack bundle
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push(/^backend-temp\//);
    }
    
    // Suppress Mento SDK ethers v6 compatibility warnings
    config.ignoreWarnings = [
      { module: /@mento-protocol\/mento-sdk/ },
      { module: /backend-temp/ }
    ];
    
    return config
  }
}

module.exports = nextConfig;