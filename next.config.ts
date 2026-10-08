import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Keep local-only data out of the standalone trace (it lives in the
  // packaged app's writable userData dir instead, via BROWSER_DATA_DIR).
  outputFileTracingExcludes: {
    "/*": ["./data/**", "./scratch/**", "./docs/**", "./snapshots/**", "./release/**"],
  },
};

export default nextConfig;
