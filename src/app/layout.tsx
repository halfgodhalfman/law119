import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "美国华人119找律师网 Law119 - 全美华人法律服务撮合平台",
  description: "有法律问题，找119。美国华人119找律师网——全美唯一专注华人客户与华人律师精准对接的法律服务平台。发布案件、律师竞价、透明对比、安全履约。移民、刑事、离婚、房产、商业等10大专业领域。",
  keywords: "美国华人119找律师网, Law119, 华人律师, Chinese attorney, 移民律师, immigration lawyer, 刑事律师, 离婚律师, 华人法律服务, legal services Chinese",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hans">
      <body className="antialiased">{children}</body>
    </html>
  );
}
