
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "172.17.9.238",
    "localhost",
    "127.0.0.1",
    "gudang.ym-marketing-online.sbs",
  ],

  experimental: {
    agentFeedback: true,
  },

  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
