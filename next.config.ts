import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  turbopack: {
    // Keep project discovery inside this repository when a parent directory has a lockfile.
    root: process.cwd(),
  },
};

export default nextConfig;
