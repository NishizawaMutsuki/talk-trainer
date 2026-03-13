import type { Metadata } from "next";
import Providers from "@/components/Providers";
import { WebViewBanner } from "@/components/WebViewBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Talk Trainer — AIで面接練習",
  description: "PREP法・STAR法で面接回答の構造を分析し、伝えるスキルを磨くアプリ",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@200;300;400;500;700&family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased text-white">
        {/* Ambient background layers */}
        <div className="bg-ambient" />
        <div className="bg-grid" />
        <div className="noise-overlay" />
        {/* Main content */}
        <WebViewBanner />
        <div className="screen-content">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
