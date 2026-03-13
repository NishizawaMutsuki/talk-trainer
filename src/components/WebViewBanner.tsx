"use client";

import { useState, useEffect } from "react";

export function WebViewBanner() {
  const [isWebView, setIsWebView] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    // LINE, Facebook, Instagram, Twitter 等のアプリ内ブラウザを検知
    const inApp = /Line\/|FBAV|FBAN|Instagram|Twitter/i.test(ua);
    setIsWebView(inApp);
  }, []);

  if (!isWebView) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-amber-500/95 text-black px-4 py-3 text-center text-sm leading-relaxed shadow-lg">
      <p className="font-medium">アプリ内ブラウザではログインできません</p>
      <p className="text-xs mt-1 opacity-80">
        画面右下の「…」メニューから「ブラウザで開く」を選ぶか、
        URLをSafari / Chromeにコピーしてください
      </p>
    </div>
  );
}
