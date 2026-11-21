import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Produce Linux server releases in CI; use standard output for local Windows checks.
  output: process.platform === 'win32' ? undefined : 'standalone',
  poweredByHeader: false,
  experimental: { cpus: 2, workerThreads: process.platform === 'win32' },
}

export default nextConfig
