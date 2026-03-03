"use client";

import type { UserStatus } from "@/lib/types";

interface PaywallScreenProps {
  userStatus: UserStatus;
  onError: (msg: string) => void;
  onBack: () => void;
}

export function PaywallScreen({ userStatus, onError, onBack }: PaywallScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-2xl font-light text-white/90 mb-2">無料枠を使い切りました</h2>
          <p className="text-white/40 text-sm">
            {userStatus.limit}回の無料練習が完了しました。<br />
            Proプランで無制限に練習を続けましょう。
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-500/[0.08] to-orange-500/[0.08] border border-amber-500/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white/90 font-medium">Talk Trainer Pro</h3>
              <p className="text-white/40 text-xs mt-1">AIコーチ付き面接練習</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-light text-amber-400/90">¥990</p>
              <p className="text-white/30 text-[10px]">/ 月</p>
            </div>
          </div>
          <div className="space-y-2 mb-5">
            {[
              "練習回数が無制限",
              "深掘り練習も無制限",
              "1分チャレンジも無制限",
              "AIコーチからの詳細フィードバック",
              "Think Mode（高精度分析）",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2">
                <span className="text-emerald-400/80 text-xs">✓</span>
                <span className="text-white/50 text-xs">{f}</span>
              </div>
            ))}
          </div>
          <button
            onClick={async () => {
              try {
                const res = await fetch("/api/checkout", { method: "POST" });
                const data = await res.json();
                if (data.url) window.location.href = data.url;
              } catch {
                onError("決済ページの取得に失敗しました");
              }
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500/80 to-orange-500/80 text-white text-sm tracking-wider shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Proプランに登録する
          </button>
        </div>

        <button onClick={onBack}
          className="w-full text-center text-white/25 text-xs hover:text-white/50 transition-colors">
          ← ホームに戻る
        </button>
      </div>
    </div>
  );
}
