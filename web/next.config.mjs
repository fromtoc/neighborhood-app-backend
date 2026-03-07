/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Google / Firebase 頭像
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      // Facebook 頭像
      { protocol: 'https', hostname: 'graph.facebook.com' },
      // LINE 頭像
      { protocol: 'https', hostname: 'profile.line-scdn.net' },
      { protocol: 'https', hostname: '*.line-scdn.net' },
    ],
  },
  // 讓 Server Component fetch 可打到 backend（dev 時通常是 localhost:8080）
  // 若需要 rewrite 代理，取消下方註解
  // async rewrites() {
  //   return [
  //     {
  //       source: '/api/:path*',
  //       destination: `${process.env.API_BASE_URL}/api/:path*`,
  //     },
  //   ];
  // },
};

export default nextConfig;
