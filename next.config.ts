import type { NextConfig } from 'next';

// 使用标准 Next.js 输出，兼容宝塔 Node 项目管理器和 Docker。
const nextConfig: NextConfig = {
  // 生产容器使用同一份独立构建产物，避免页面与 CSS/JS 静态资源版本错配。
  output: 'standalone',
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      ],
    }];
  },
};

export default nextConfig;
