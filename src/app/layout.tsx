import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "話し方構造化トレーナー",
  description: "PREP法・STAR法で面接回答の構造を分析し、伝えるスキルを磨くアプリ",
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
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@200;300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased text-white">
        {children}
      </body>
    </html>
  );
}
