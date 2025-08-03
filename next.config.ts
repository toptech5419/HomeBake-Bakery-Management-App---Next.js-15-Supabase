import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Fix for Supabase realtime client dependency warning
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };

    // Suppress critical dependency warnings for @supabase/realtime-js
    config.module.exprContextCritical = false;
    config.module.unknownContextCritical = false;

    // Handle WebSocket polyfill for client-side
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        ws: false,
      };
    }

    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['@supabase/ssr'],
  },
};

export default nextConfig;
