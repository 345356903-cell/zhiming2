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
  title: "NameVibe · Decode Your Online Name",
  description: "AI-powered name rating & generation system. Decode the hidden energy behind any online name with Yi-Xue analysis, red flag checks, and viral potential scoring.",
  keywords: ["name rating", "online name", "name generator", "yi-xue", "bazi", "name analysis", "网名评测", "起名"],
  authors: [{ name: "NameVibe" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "NameVibe · Decode Your Online Name",
    description: "Your Name, Your Vibe — AI-powered name rating & generation",
    url: "https://chat.z.ai",
    siteName: "NameVibe",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NameVibe · Decode Your Online Name",
    description: "Your Name, Your Vibe — AI-powered name rating & generation",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
