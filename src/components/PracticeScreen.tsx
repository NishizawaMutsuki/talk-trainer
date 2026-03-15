"use client";

import type { ChainTurn, FollowupInfo, ChallengeInfo, CoachingTip } from "@/lib/types";
import { FrameworkBadge } from "@/components/ui";

interface PracticeScreenProps {
  screenLabel: string;
  question: string;
  isDeepDive: boolean;
  chain: ChainTurn[];
  followupInfo: FollowupInfo | null;
  challengeInfo: ChallengeInfo | null;
  coachingTip: CoachingTip;
  recommendedFrameworks: string[];
  onStartRecording: () => void;
  onTextInput: () => void;
  onBack: () => void;
}

export function PracticeScreen({
  screenLabel,
  question,
  isDeepDive,
  chain,
  followupInfo,
  challengeInfo,
  coachingTip,
  recommendedFrameworks,
  onStartRecording,
  onTextInput,
  onBack,
}: PracticeScreenProps) {
  return (
    <div className="min-h-screen flex flex-col px-4 pt-8 pb-20">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-white/30 hover:text-white/60 text-sm">← 戻る</button>
        <span className="text-[10px] tracking-widest uppercase text-white/25">{screenLabel}</span>
      </div>
      <div className="text-center mb-8">
        <div className="inline-block px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] mb-6">
          <span className="text-[10px] tracking-widest uppercase text-white/35">
            {isDeepDive ? "深掘り質問" : "質問"}
          </span>
        </div>
        <h2 className="text-2xl font-light text-white/85 leading-relaxed max-w-lg mx-auto">{question || challengeInfo?.question || "質問を読み込み中..."}</h2>
      </div>

      {/* Context cards — varies by mode */}
      {isDeepDive && followupInfo ? (
        <div className="max-w-md mx-auto w-full mb-6 space-y-3">
          <div className="bg-gradient-to-r from-violet-500/[0.08] to-fuchsia-500/[0.08] border border-violet-500/15 rounded-xl px-4 py-3">
            <div className="flex items-start gap-2">
              <span className="text-lg">🔍</span>
              <div>
                <p className="text-violet-400/60 text-[10px] tracking-wider uppercase mb-1">面接官の意図</p>
                <p className="text-white/50 text-xs leading-relaxed">{followupInfo.intent}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-emerald-500/[0.06] to-cyan-500/[0.06] border border-emerald-500/15 rounded-xl px-4 py-3">
            <div className="flex items-start gap-2">
              <span className="text-lg">💡</span>
              <div>
                <p className="text-emerald-400/60 text-[10px] tracking-wider uppercase mb-1">
                  回答のコツ — {followupInfo.recommended_framework}がおすすめ
                </p>
                <p className="text-white/50 text-xs leading-relaxed">{followupInfo.tip}</p>
              </div>
            </div>
          </div>
          <details className="group">
            <summary className="text-[10px] text-white/25 cursor-pointer hover:text-white/40">
              これまでの会話を見る（{chain.length}ターン）
            </summary>
            <div className="mt-2 space-y-2">
              {chain.map((t, i) => (
                <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-2">
                  <p className="text-white/30 text-[10px] mb-1">Q{i + 1}: {t.question}</p>
                  <p className="text-white/40 text-[10px] leading-relaxed line-clamp-3">{t.answer}</p>
                  <p className="text-cyan-400/40 text-[9px] mt-1">スコア: {t.score}/10</p>
                </div>
              ))}
            </div>
          </details>
        </div>
      ) : challengeInfo ? (
        <div className="max-w-md mx-auto w-full mb-6">
          <div className="bg-gradient-to-r from-amber-500/[0.08] to-orange-500/[0.08] border border-amber-500/15 rounded-xl px-4 py-3">
            <div className="flex items-start gap-2">
              <span className="text-lg">🎲</span>
              <div>
                <p className="text-amber-400/60 text-[10px] tracking-wider uppercase mb-1">
                  {challengeInfo.category_hint} — {challengeInfo.recommended_framework}がおすすめ
                </p>
                <p className="text-white/50 text-xs leading-relaxed">{challengeInfo.tip}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto w-full mb-6">
          <div className="bg-gradient-to-r from-cyan-500/[0.08] to-blue-500/[0.08] border border-cyan-500/15 rounded-xl px-4 py-3">
            <div className="flex items-start gap-2">
              <span className="text-lg">{coachingTip.icon}</span>
              <div>
                <p className="text-cyan-400/60 text-[10px] tracking-wider uppercase mb-1">{coachingTip.category} — Think Fast, Talk Smart</p>
                <p className="text-white/50 text-xs leading-relaxed">{coachingTip.tip}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommended Frameworks */}
      <div className="max-w-md mx-auto w-full mb-8">
        <p className="text-[10px] tracking-widest uppercase text-white/25 mb-3">📐 この質問におすすめの構造</p>
        <div className="space-y-2">
          {recommendedFrameworks.map((fwKey, i) => (
            <div key={fwKey} className="flex items-center gap-2">
              {i === 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400/70">推奨</span>}
              {i > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/30">代替</span>}
              <FrameworkBadge fwKey={fwKey} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <button onClick={onStartRecording}
          className="group w-24 h-24 rounded-full bg-gradient-to-br from-red-500/80 to-rose-600/80 flex items-center justify-center shadow-xl shadow-red-500/20 hover:shadow-red-500/30 hover:scale-105 active:scale-95 transition-all duration-300">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        </button>
        <p className="text-white/25 text-xs mt-4">録音して話す</p>
        <button onClick={onTextInput}
          className="mt-4 text-white/25 text-xs hover:text-white/50 transition-colors underline underline-offset-4 decoration-white/10">
          テキストで入力する
        </button>
      </div>
    </div>
  );
}
