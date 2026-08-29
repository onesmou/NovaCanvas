import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || 'http://localhost:3000'),
  title: 'NovaCanvas｜跨境电商 AI 设计工作台',
  description: '面向 Amazon、TikTok Shop、Shopee、Lazada 与独立站卖家的 AI 商品图、智能套图与品牌视觉设计平台。',
  openGraph: { title: 'NovaCanvas｜一张商品图，卖向全世界', description: '跨境电商 AI 商品图、场景图与全平台套图设计工作台。', images: ['/og.png'] },
  twitter: { card: 'summary_large_image', title: 'NovaCanvas｜一张商品图，卖向全世界', description: '跨境电商 AI 商品图、场景图与全平台套图设计工作台。', images: ['/og.png'] },
};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-CN"><body className={geist.variable}>{children}</body></html>}
