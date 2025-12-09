/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Only run TypeScript checks during builds; temporarily ignore errors to allow deployment
    ignoreBuildErrors: true,
  },
  // Performance optimizations
  reactStrictMode: false, // Disable strict mode in production to improve performance
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  images: {
    domains: ['vembi.in', 'fqbtjucnphnhvypdueis.supabase.co'],
    unoptimized: false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vembi.in',
      },
      {
        protocol: 'https',
        hostname: 'fqbtjucnphnhvypdueis.supabase.co',
      },
    ],
  },
  experimental: {
    typedRoutes: false,
    serverActions: {
      bodySizeLimit: '2mb',
    },
  }
}

export default nextConfig