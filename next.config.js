/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  // Minimal configuration to avoid Windows path issues
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Completely disable webpack caching
      config.cache = false;
      
      // Disable symlinks
      config.resolve.symlinks = false;
      
      // Use polling for file watching on Windows
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 300,
        ignored: /node_modules/,
        followSymlinks: false
      };
      
      // Disable webpack's built-in optimizations that cause issues
      config.optimization.splitChunks = false;
      config.optimization.minimize = false;
    }

    // Fix Supabase Realtime warning - ignore expressions in require context
    config.module = config.module || {};
    config.module.exprContextCritical = false;
    
    return config;
  },
}

module.exports = nextConfig 
 
 