"use client";

import type { AnalysisResult, ChainTurn } from "@/lib/types";
import { SEG_COLORS, MAX_CHAIN_DEPTH } from "@/lib/constants";
import { ScoreRing } from "@/components/ui";

interface ResultScreenProps {
  result: AnalysisResult;
  question: string;
  transcript: string;
  seconds: number;
  chain: ChainTurn[];
  onDeepDive: () => void;
  onHome: () => void;
  onRetry: () => void;
}

export function ResultScreen({
  result,
  question,
  transcript,
  seconds,
  chain,
  onDeepDive,
  onHome,
  onRetry,
}: ResultScreenProps) {
  const isDeepDive = chain.length > 0;

  return (
    <div className="max-w-[520px] mx-auto px-4 pt-8 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={onHome} className="text-white/30 hover:text-white/60 text-sm">← ホームへ</button>
        <span className="text-[10px] tracking-widest uppercase text-white/25">
          {isDeepDive ? `深掘り ${chain.length}回目` : "分析結果"}
        </span>
      </div>

      {/* Chain Progress */}
      {isDeepDive && (
        <div className="mb-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {chain.map((t, i) => (
              <div key={i} className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    t.score >= 7 ? "bg-emerald-500/20 text-emerald-400/80"
                    : t.score >= 4 ? "bg-amber-500/20 text-amber-400/80"
                    : "bg-red-500/20 text-red-400/80"
                  }`}>
                    {t.score}
                  </div>
                  <p className="text-[8px] text-white/20 mt-0.5 max-w-[60px] truncate">
                    {i === 0 ? "元の質問" : `深掘り${i}`}
                  </p>
                </div>
                <div className="w-6 h-px bg-white/10" />
              </div>
            ))}
            <div className="flex flex-col items-center shrink-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium bg-cyan-500/20 text-cyan-400/80 ring-2 ring-cyan-500/30">
                {result.overall_score}
              </div>
              <p className="text-[8px] text-cyan-400/50 mt-0.5">今回</p>
            </div>
          </div>
        </div>
      )}

      {/* One-line Feedback */}
      <div className="text-center mb-10">
        <p className="text-lg font-light text-white/80 mb-2">{result.one_line_feedback}</p>
        <p className="text-white/25 text-xs">
          {seconds > 0 && `${Math.floor(seconds / 60)}分${seconds % 60}秒 | `}
          検出: {result.detected_framework || "なし"}
        </p>
      </div>

      {/* Score Rings */}
      <div className="flex justify-center gap-4 mb-12 flex-wrap">
        <ScoreRing score={result.overall_score} size={100} label="総合" color="#06b6d4" />
        <ScoreRing score={result.structure_score} size={80} label="構造" color="#3b82f6" />
        <ScoreRing score={result.specificity_score} size={80} label="具体性" color="#10b981" />
        <ScoreRing score={result.time_balance_score} size={80} label="バランス" color="#f59e0b" />
        {result.framework_match != null && (
          <ScoreRing score={result.framework_match} size={80} label="FW一致" color="#8b5cf6" />
        )}
      </div>

      {/* Coach Tip */}
      {result.coach_tip && (
        <div className="bg-gradient-to-r from-violet-500/[0.08] to-fuchsia-500/[0.08] border border-violet-500/15 rounded-xl px-4 py-4 mb-8">
          <p className="text-violet-400/70 text-[10px] tracking-wider uppercase mb-2">🎓 コーチからのアドバイス</p>
          <p className="text-white/60 text-sm leading-relaxed">{result.coach_tip}</p>
        </div>
      )}

      {/* Perceived Abilities */}
      {result.perceived_abilities && result.perceived_abilities.length > 0 && (
        <div className="mb-10">
          <p className="text-[11px] tracking-widest uppercase text-white/30 mb-1">👤 面接官が感じたあなたの能力</p>
          <p className="text-[10px] text-white/20 mb-4">この回答から面接官が読み取る資質・能力</p>
          <div className="space-y-2">
            {result.perceived_abilities.map((ab, i) => {
              const levelConfig = {
                strong:   { bar: "bg-emerald-500", barW: "w-full",  badge: "text-emerald-400/80 bg-emerald-500/15", label: "明確" },
                moderate: { bar: "bg-amber-500",   barW: "w-2/3",   badge: "text-amber-400/80 bg-amber-500/15",   label: "やや" },
                weak:     { bar: "bg-red-400",     barW: "w-1/3",   badge: "text-red-400/80 bg-red-500/15",       label: "弱い" },
              }[ab.level] || { bar: "bg-white/20", barW: "w-1/3", badge: "text-white/40 bg-white/10", label: "?" };

              return (
                <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-white/70 text-sm font-medium">{ab.ability}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full ${levelConfig.badge}`}>
                      {levelConfig.label}
                    </span>
                  </div>
                  {/* Strength bar */}
                  <div className="h-1 bg-white/[0.06] rounded-full mb-2">
                    <div className={`h-full rounded-full ${levelConfig.bar} ${levelConfig.barW} transition-all`} />
                  </div>
                  <p className="text-white/40 text-[11px] leading-relaxed">{ab.evidence}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Segments */}
      <div className="mb-10">
        <p className="text-[11px] tracking-widest uppercase text-white/30 mb-4">話の構造マップ</p>
        <div className="space-y-2">
          {result.segments.map((seg, i) => {
            const colors = SEG_COLORS[seg.label] || SEG_COLORS["その他"];
            return (
              <div key={i} className={`${colors.bg} border-l-2 ${colors.border} px-4 py-3 rounded-r-lg`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                  <span className={`text-xs font-medium ${colors.text}`}>{seg.label}</span>
                  {seg.quality === "good" && <span className="text-[9px] text-emerald-400/60 ml-auto">✓ Good</span>}
                  {seg.quality === "needs_improvement" && <span className="text-[9px] text-amber-400/60 ml-auto">⚠ 改善余地</span>}
                </div>
                <p className="text-white/50 text-xs leading-relaxed">{seg.text}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strengths & Improvements */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="bg-emerald-500/[0.06] border border-emerald-500/10 rounded-xl p-4">
          <p className="text-emerald-400/70 text-[11px] tracking-wider uppercase mb-3">良い点</p>
          {result.strengths.map((s, i) => <p key={i} className="text-white/50 text-xs leading-relaxed mb-2">• {s}</p>)}
        </div>
        <div className="bg-amber-500/[0.06] border border-amber-500/10 rounded-xl p-4">
          <p className="text-amber-400/70 text-[11px] tracking-wider uppercase mb-3">改善点</p>
          {result.improvements.map((s, i) => <p key={i} className="text-white/50 text-xs leading-relaxed mb-2">• {s}</p>)}
        </div>
      </div>

      {/* Rewrite Suggestion */}
      {result.rewrite_suggestion && (
        <div className="bg-blue-500/[0.05] border border-blue-500/10 rounded-xl p-5 mb-10">
          <p className="text-blue-400/70 text-[11px] tracking-wider uppercase mb-3">💡 構造改善の提案</p>
          <p className="text-white/60 text-sm leading-relaxed">{result.rewrite_suggestion}</p>
        </div>
      )}

      {/* Conversation History */}
      <details className="mb-10 group">
        <summary className="text-[11px] tracking-wider uppercase text-white/25 cursor-pointer hover:text-white/40">
          {isDeepDive ? `会話の全体を見る（${chain.length + 1}ターン）` : "元の回答テキストを見る"}
        </summary>
        <div className="mt-3 space-y-3">
          {chain.map((t, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
              <p className="text-violet-400/40 text-[10px] mb-1">{i === 0 ? "元の質問" : `深掘り${i}`}</p>
              <p className="text-white/30 text-xs mb-2 italic">Q: {t.question}</p>
              <p className="text-white/50 text-xs leading-relaxed whitespace-pre-wrap">{t.answer}</p>
              <p className="text-cyan-400/30 text-[9px] mt-2">スコア: {t.score}/10</p>
            </div>
          ))}
          <div className="bg-cyan-500/[0.04] border border-cyan-500/10 rounded-xl p-4">
            <p className="text-cyan-400/40 text-[10px] mb-1">{isDeepDive ? `深掘り${chain.length}（今回）` : "回答"}</p>
            <p className="text-white/30 text-xs mb-2 italic">Q: {question}</p>
            <p className="text-white/50 text-xs leading-relaxed whitespace-pre-wrap">{transcript}</p>
          </div>
        </div>
      </details>

      {/* Actions */}
      <div className="space-y-3">
        {chain.length < MAX_CHAIN_DEPTH && (
          <button onClick={onDeepDive}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-500/70 to-fuchsia-500/70 text-white text-sm tracking-wider shadow-lg shadow-violet-500/10 hover:shadow-violet-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all">
            🔍 この回答を深掘りする（面接官が追加質問）
          </button>
        )}
        <div className="flex gap-3">
          <button onClick={onHome}
            className="flex-1 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/40 text-sm hover:bg-white/[0.06] hover:text-white/60 transition-all">
            ホームへ
          </button>
          <button onClick={onRetry}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500/70 to-cyan-500/70 text-white text-sm shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-all">
            {isDeepDive ? "最初の質問からやり直す" : "同じ質問でもう一度"}
          </button>
        </div>
      </div>
    </div>
  );
}
