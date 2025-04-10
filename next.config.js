/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove static export for now to allow API routes to work
  // output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  
  // Disable webpack caching in development to prevent ENOENT errors
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

module.exports = nextConfig;