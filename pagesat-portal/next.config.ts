import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },

  // serve under /pagesat
  basePath: "/pagesat",
  assetPrefix: "/pagesat/",

  // generate folders with index.html
  trailingSlash: true,
};

export default nextConfig;