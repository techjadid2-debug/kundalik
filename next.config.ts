import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // Muqova rasmlari Vercel Blob'da saqlanadi
    remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }],
  },
}

export default nextConfig
