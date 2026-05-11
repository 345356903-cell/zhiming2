import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  reactStrictMode: false,
  serverExternalPackages: ['lunar-javascript'],
};

export default nextConfig;
