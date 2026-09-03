import type { NextConfig } from 'next';

// 使用标准 Next.js 输出，兼容宝塔 Node 项目管理器和 Docker。
const nextConfig: NextConfig = {
  // 生产容器使用同一份独立构建产物，避免页面与 CSS/JS 静态资源版本错配。
  output: 'standalone',
};

export default nextConfig;
