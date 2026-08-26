import type { NextConfig } from "next";

// GitHub Pages 프로젝트 페이지로 배포할 때:
//   NEXT_PUBLIC_BASE_PATH=/explorer npm run build
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
