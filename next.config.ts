import type { NextConfig } from "next";

const basePath =
  process.env.BASE_PATH || process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  basePath,
  experimental: {
    turbopackFileSystemCacheForBuild: true,
    turbopackRustReactCompiler: true,
  },
  images: {
    unoptimized: true,
  },
  output: "export",
  reactCompiler: true,
};

export default nextConfig;
