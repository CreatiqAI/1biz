import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@1biz/shared'],
  images: {
    remotePatterns: [
      { hostname: '*.r2.dev' }, // Cloudflare R2
      { hostname: 'lh3.googleusercontent.com' }, // Google avatars
    ],
  },
  // Proxy /api/v1/* to the backend API.
  // In Docker: API_INTERNAL_URL=http://api:3001 (internal Docker network).
  // In dev: falls back to http://localhost:3001 automatically.
  async rewrites() {
    const apiBase = process.env.API_INTERNAL_URL || 'http://localhost:3001'
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiBase}/api/v1/:path*`,
      },
    ]
  },
}

export default nextConfig
