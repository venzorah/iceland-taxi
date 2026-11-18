import type { NextConfig } from 'next'
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() { return [{ source: '/:path*', headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'" },
    ...(process.env.NODE_ENV === 'production' ? [{ key: 'Strict-Transport-Security', value: 'max-age=15552000' }] : []),
  ] }] },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'fonts.googleapis.com' },
      { protocol: 'https', hostname: 'fonts.gstatic.com' },
    ],
  },
  experimental: {
    ...(process.env.VPS_BUILD_CPUS === '1' ? { cpus: 1 } : {}),
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

export default function config(phase: string): NextConfig {
  return {
    ...nextConfig,
    // Dev and production never share generated chunks. Explicit verification-build overrides still work.
    distDir: process.env.NEXT_OUTPUT_DIR || (phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next'),
  }
}
