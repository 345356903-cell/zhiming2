import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "名鉴 · 网名评测系统 - 探寻网名背后的玄机与命理",
  description: "网名评测、命理起名、天机解读。通过易学分析、歧义检查、网红指数、爆火预测等多维度评测您的网名，或依据八字命理为您量身定制吉名。",
  keywords: ["网名评测", "起名", "命理", "易学", "网名评分", "八字起名", "网名分析"],
  authors: [{ name: "名鉴" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "名鉴 · 网名评测系统",
    description: "探寻网名背后的玄机与命理 - 网名评测·命理起名·天机解读",
    url: "https://chat.z.ai",
    siteName: "名鉴",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "名鉴 · 网名评测系统",
    description: "探寻网名背后的玄机与命理",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
