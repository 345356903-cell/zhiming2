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
  themeColor: "#0B0B0F",
};

export const metadata: Metadata = {
  title: "名鉴 · NameVibe — 你的网名值几分？",
  description: "AI玄学分析你的网名！易学评分、踩雷检测、传播力分析，还能智能起名。快来算一卦！",
  keywords: ["网名评测", "起名", "AI算名", "易学", "八字", "name rating", "name generator"],
  authors: [{ name: "NameVibe" }],
  icons: {
    icon: "/logo-v4.png",
  },
  openGraph: {
    title: "名鉴 · NameVibe — 你的网名值几分？",
    description: "AI玄学分析你的网名！易学评分、踩雷检测、传播力分析",
    siteName: "名鉴 NameVibe",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "名鉴 · NameVibe",
    description: "AI玄学分析你的网名！快来算一卦",
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
