import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only enable standalone output when explicitly requested (e.g. in custom Docker builds).
  // Leaving output undefined allows Vercel to manage serverless artifact tracing natively,
  // preventing the "ENOENT: no such file or directory, open '.next/next-server.js.nft.json'" error.
  output: process.env.OUTPUT_STANDALONE === "true" ? "standalone" : undefined,
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

