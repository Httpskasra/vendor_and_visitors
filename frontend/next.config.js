/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*',
        // destination: 'http://backend:4000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
