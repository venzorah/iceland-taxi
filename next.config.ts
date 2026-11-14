import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow verification builds without disturbing a running development server.
  distDir: process.env.NEXT_OUTPUT_DIR || '.next',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'fonts.googleapis.com' },
      { protocol: 'https', hostname: 'fonts.gstatic.com' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

export default nextConfig
