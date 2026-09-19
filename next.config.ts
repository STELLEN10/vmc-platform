import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output is for self-hosted container environments and conflicts with Vercel's native serverless packaging
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  turbopack: {
    // Keep project discovery inside this repository when a parent directory has a lockfile.
    root: process.cwd(),
  },
};

export default nextConfig;
