"use client";

import { useState, useEffect } from "react";

type BannerType = "webview" | "ios-chrome" | null;

export function WebViewBanner() {
  const [banner, setBanner] = useState<BannerType>(null);

  useEffect(() => {
    const ua = navigator.userAgent;

    // LINE, Facebook, Instagram, Twitter 等のアプリ内ブラウザ
    if (/Line\/|FBAV|FBAN|Instagram|Twitter/i.test(ua)) {
      setBanner("webview");
      return;
    }

    // iOS かつ Safari 以外（Chrome, Firefox, Edge等）→ 音声認識が使えない
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
    if (isIOS && !isSafari) {
      setBanner("ios-chrome");
      return;
    }
  }, []);

  if (!banner) return null;

  if (banner === "webview") {
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

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-blue-500/95 text-white px-4 py-3 text-center text-sm leading-relaxed shadow-lg">
      <p className="font-medium">音声認識を使うにはSafariで開いてください</p>
      <p className="text-xs mt-1 opacity-80">
        iOSではSafariのみ音声認識に対応しています。
        右上の「…」→「Safariで開く」をタップしてください
      </p>
    </div>
  );
}
