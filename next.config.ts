import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vendor portfolio photos are uploaded through a server action.
  experimental: { serverActions: { bodySizeLimit: "20mb" } },
};

export default nextConfig;
