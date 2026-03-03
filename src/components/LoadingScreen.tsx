"use client";

import type { CoachingTip } from "@/lib/types";

interface LoadingScreenProps {
  variant: "analyzing" | "followup" | "challenge";
  chainLength: number;
  isDeepDive: boolean;
  coachingTip: CoachingTip;
}

const VARIANTS = {
  analyzing: {
    outerBorder: "border-white/5",
    spinA: "border-t-cyan-400/60",
    spinB: "border-b-blue-400/40",
  },
  followup: {
    outerBorder: "border-violet-500/20",
    spinA: "border-t-violet-400/60",
    spinB: "border-b-fuchsia-400/40",
  },
  challenge: {
    outerBorder: "border-amber-500/20",
    spinA: "border-t-amber-400/60",
    spinB: "border-b-orange-400/40",
  },
};

export function LoadingScreen({ variant, chainLength, isDeepDive, coachingTip }: LoadingScreenProps) {
  const v = VARIANTS[variant];

  const title = variant === "analyzing"
    ? (isDeepDive ? `深掘り${chainLength}回目を分析中...` : "分析中...")
    : variant === "followup"
    ? "面接官が次の質問を考えています..."
    : "お題を考えています...";

  const subtitle = variant === "analyzing"
    ? `${coachingTip.icon} ${coachingTip.tip}`
    : variant === "followup"
    ? `🔍 深掘り ${chainLength}回目 — あなたの回答をもとに追加質問を生成中`
    : "🎲 AIがあなたにぴったりのお題を生成中";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="relative w-16 h-16 mb-8">
        <div className={`absolute inset-0 rounded-full border-2 ${v.outerBorder}`} />
        <div className={`absolute inset-0 rounded-full border-2 border-transparent ${v.spinA} animate-spin`} />
        <div className={`absolute inset-2 rounded-full border-2 border-transparent ${v.spinB} animate-spin`}
          style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
      </div>
      <p className="text-white/60 text-sm mb-2">{title}</p>
      <p className="text-white/20 text-xs max-w-xs text-center leading-relaxed mt-4">
        {subtitle}
      </p>
    </div>
  );
}
