import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" es para Docker/Railway — en Vercel no se usa
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
