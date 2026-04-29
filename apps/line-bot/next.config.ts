import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@malachi/tarot', '@malachi/prompt', '@malachi/database'],
}

export default nextConfig
