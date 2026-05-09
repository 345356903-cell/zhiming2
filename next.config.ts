import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  reactStrictMode: false,
  serverExternalPackages: ['lunar-javascript'],
  allowedDevOrigins: process.env.NODE_ENV === 'production'
    ? []
    : [
        '.space.z.ai',
        '.space-z.ai',
        '.netlify.app',
      ],
};

export default nextConfig;
