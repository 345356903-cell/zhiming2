import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F5F7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export const metadata: Metadata = {
  title: "知名 · ZhiMing — 鉴名识运，一字见乾坤",
  description: "AI命理精算，确定性评分。基于传统八字命理，为你的网名打分，还能智能起名。相同名字+相同八字=相同结果！",
  keywords: ["网名评测", "起名", "AI算名", "命理", "八字", "确定性评分", "name rating", "name generator"],
  authors: [{ name: "ZhiMing" }],
  icons: {
    icon: "/logo-v11.png",
  },
  openGraph: {
    title: "知名 · ZhiMing — 鉴名识运，一字见乾坤",
    description: "AI命理精算，确定性评分。基于传统八字命理，相同输入永远相同结果",
    siteName: "知名 ZhiMing",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "知名 · ZhiMing",
    description: "AI命理精算，确定性评分。鉴名识运，一字见乾坤",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
