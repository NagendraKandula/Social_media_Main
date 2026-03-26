/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL}/:path*`,
      },
    ]
  },

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
