/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
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
      // RSS 新聞圖片
      { protocol: 'https', hostname: '*.ettoday.net' },
      { protocol: 'https', hostname: '*.ltn.com.tw' },
      { protocol: 'https', hostname: '*.cna.com.tw' },
      { protocol: 'https', hostname: '*.pts.org.tw' },
      { protocol: 'https', hostname: '*.setn.com' },
      { protocol: 'https', hostname: '*.udn.com' },
      { protocol: 'https', hostname: '*.chinatimes.com' },
      { protocol: 'https', hostname: '*.tvbs.com.tw' },
    ],
  },
  // 本地開發：/uploads/** 代理到後端（R2 模式不需要，圖片直接走 CDN URL）
  async rewrites() {
    const apiBase = process.env.API_BASE_URL ?? 'http://localhost:8080';
    return [
      {
        source: '/uploads/:path*',
        destination: `${apiBase}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
