import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  // Output standalone for Docker deployment
  output: 'standalone',

  // Performance optimizations
  compress: true,

  // Reduce build memory and optimize package imports
  experimental: {
    optimizePackageImports: [
      'date-fns',
      'lucide-react',
      // Phase 2: Add heavy libraries for optimization
      'framer-motion',
      'recharts',
      'react-chartjs-2',
      '@react-google-maps/api',
    ],
  },

  // ✅ ADD THIS (THIS IS THE FIX for cross origin issues)
  allowedDevOrigins: [
    "ottimodirect.devixsol.com",
  ],

  // =====================================================
  // COMPILATION SPEED OPTIMIZATIONS
  // =====================================================

  webpack: (config, { dev }) => {
    // Speed up development builds
    if (dev) {
      // Reduce build noise
      config.stats = 'errors-warnings';
      // Faster source maps in development
      config.devtool = 'eval-cheap-module-source-map';
    }
    return config;
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lumistorageacc.blob.core.windows.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn-icons-png.flaticon.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.example.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'example.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'randomuser.me',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
