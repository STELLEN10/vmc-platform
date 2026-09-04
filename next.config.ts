import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Keep project discovery inside this repository when a parent directory has a lockfile.
    root: process.cwd(),
  },
};

export default nextConfig;
