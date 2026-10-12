import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['localhost:3000', '10.5.228.67:3000', '10.5.228.67'],
  serverExternalPackages: ['firebase-admin'],
};

export default nextConfig;
