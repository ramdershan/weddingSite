/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove static export for now to allow API routes to work
  // output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;