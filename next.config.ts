import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Peta & PDF dirender di client; tidak ada back-end berat selain route API vektor.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
