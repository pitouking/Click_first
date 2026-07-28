import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@click-first/shared-types"],
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
