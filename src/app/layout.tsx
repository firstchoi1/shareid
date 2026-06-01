import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";

import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";
import "./showcase-brand.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "苹果ID",
  description: "各地区账号信息展示（数据来自托管站，仅供参考）",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#eef1f8] font-sans text-foreground">
        <ThemeProvider forcedTheme="light">
          <div className="showcase-page-shell">{children}</div>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
