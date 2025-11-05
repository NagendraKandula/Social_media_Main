/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.fbcdn.net', // ✅ Correct single-star wildcard
      },
      {
        protocol: 'https',
        hostname: '*.facebook.com', // optional (covers lookaside, etc.)
      },
    ],
  },
};

module.exports = nextConfig;
