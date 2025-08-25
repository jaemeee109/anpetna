/** @type {import('next').NextConfig} */
const nextConfig = {};

export default {
  async rewrites() {
    return [
      {
        source: '/anpetna/:path*',
        destination: 'http://192.168.0.160:8000/anpetna/:path*', // ← 백엔드
      },
    ];
  },
};