import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ['lunar-javascript'],
  allowedDevOrigins: [
    '.space.z.ai',
    '.space-z.ai',
  ],
};

export default nextConfig;
