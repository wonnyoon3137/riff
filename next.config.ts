import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // KOPIS 포스터/소개 이미지 도메인 허용
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "www.kopis.or.kr",
        pathname: "/upload/**",
      },
    ],
  },
};

export default nextConfig;
