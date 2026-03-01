"use client";

import { useState, useRef, useEffect } from "react";
import { FRAMEWORKS } from "@/lib/constants";
import type { HistoryEntry } from "@/lib/types";

// ─── Score Ring ─────────────────────────────────────────────────

export function ScoreRing({
  score,
  size = 80,
  label,
  color,
}: {
  score: number;
  size?: number;
  label: string;
  color: string;
}) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (score / 10) * c;
  // Use label + color to avoid SVG gradient ID collisions
  const gid = `grad-${label}-${color.replace("#", "")}`;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${gid})`} strokeWidth="5"
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
            className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
      <span className="text-[11px] tracking-wide text-white/50 uppercase">{label}</span>
    </div>
  );
}

// ─── Timer ──────────────────────────────────────────────────────

export function Timer({ seconds }: { seconds: number }) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return (
    <span className="font-mono text-5xl font-extralight tracking-wider text-white/90">
      {String(m).padStart(2, "0")}
      <span className="animate-pulse text-white/40">:</span>
      {String(s).padStart(2, "0")}
    </span>
  );
}

// ─── Waveform Visualizer ────────────────────────────────────────

export function WaveformVisualizer({ isActive }: { isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const barsRef = useRef(Array.from({ length: 48 }, () => Math.random() * 0.15));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const bars = barsRef.current;
      const bw = W / bars.length;
      for (let i = 0; i < bars.length; i++) {
        if (isActive) {
          bars[i] += (Math.random() - 0.5) * 0.18;
          bars[i] = Math.max(0.05, Math.min(1, bars[i]));
        } else {
          bars[i] *= 0.94;
        }
        const h = bars[i] * H * 0.8;
        const hue = 200 + (i / bars.length) * 60;
        ctx.fillStyle = `hsla(${hue}, 70%, 65%, ${0.3 + bars[i] * 0.6})`;
        ctx.beginPath();
        ctx.roundRect(i * bw + 1, (H - h) / 2, bw - 2, h, 2);
        ctx.fill();
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [isActive]);

  return <canvas ref={canvasRef} width={384} height={64} className="w-full h-16 opacity-80" />;
}

// ─── Framework Badge ────────────────────────────────────────────

export function FrameworkBadge({ fwKey }: { fwKey: string }) {
  const fw = FRAMEWORKS[fwKey];
  if (!fw) return null;
  return (
    <div className="rounded-xl border px-4 py-3 bg-white/[0.03]" style={{ borderColor: fw.color + "40" }}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: fw.color }} />
        <span className="text-xs font-medium" style={{ color: fw.color }}>{fw.name}</span>
      </div>
      <p className="text-white/40 text-[11px] leading-relaxed mb-2">{fw.description}</p>
      <div className="flex gap-1.5 flex-wrap">
        {fw.structure.map((s, i) => (
          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/50">
            {i > 0 && "→ "}{s}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── History List ───────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function HistoryList({
  entries,
  perPage,
}: {
  entries: HistoryEntry[];
  perPage: number;
}) {
  const [shown, setShown] = useState(perPage);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const visible = entries.slice(0, shown);
  const remaining = entries.length - shown;

  return (
    <div className="space-y-3">
      {visible.map((h, i) => {
        const isExpanded = expandedIdx === i;
        const hasDetail = !!(h.answer || h.strengths?.length || h.improvements?.length);
        return (
          <div key={i}
            className={`bg-white/[0.02] border rounded-xl transition-all ${
              isExpanded ? "border-cyan-500/20 bg-white/[0.04]" : "border-white/[0.05] hover:bg-white/[0.04]"
            }`}>
            {/* Header — always visible */}
            <button
              className="w-full text-left p-4"
              onClick={() => hasDetail && setExpandedIdx(isExpanded ? null : i)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-white/60 text-sm truncate">{h.question}</p>
                    {(h.depth ?? 0) > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400/70 shrink-0">
                        深掘り{h.depth}
                      </span>
                    )}
                  </div>
                  <p className="text-white/20 text-[10px] mt-1">
                    {h.category} | {h.date}
                    {h.seconds > 0 && ` | ${formatDuration(h.seconds)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-cyan-400/80 text-lg font-light">{h.overall_score}</span>
                    <span className="text-white/20 text-xs">/10</span>
                  </div>
                  {hasDetail && (
                    <span className={`text-white/20 text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                  )}
                </div>
              </div>
              <p className="text-white/25 text-xs">{h.feedback}</p>
            </button>

            {/* Expandable detail */}
            {isExpanded && hasDetail && (
              <div className="px-4 pb-4 space-y-3 border-t border-white/[0.04] pt-3">
                {/* Answer */}
                {h.answer && (
                  <div>
                    <p className="text-white/30 text-[10px] tracking-wider uppercase mb-1.5">回答内容</p>
                    <p className="text-white/50 text-xs leading-relaxed whitespace-pre-wrap bg-white/[0.02] rounded-lg px-3 py-2">{h.answer}</p>
                  </div>
                )}

                {/* Strengths & Improvements side by side */}
                {(h.strengths?.length || h.improvements?.length) ? (
                  <div className="grid grid-cols-2 gap-3">
                    {h.strengths?.length ? (
                      <div>
                        <p className="text-emerald-400/60 text-[10px] tracking-wider uppercase mb-1.5">良い点</p>
                        {h.strengths.map((s, j) => (
                          <p key={j} className="text-white/40 text-[11px] leading-relaxed mb-1">• {s}</p>
                        ))}
                      </div>
                    ) : <div />}
                    {h.improvements?.length ? (
                      <div>
                        <p className="text-amber-400/60 text-[10px] tracking-wider uppercase mb-1.5">改善点</p>
                        {h.improvements.map((s, j) => (
                          <p key={j} className="text-white/40 text-[11px] leading-relaxed mb-1">• {s}</p>
                        ))}
                      </div>
                    ) : <div />}
                  </div>
                ) : null}

                {/* Rewrite suggestion */}
                {h.rewrite_suggestion && (
                  <details className="group">
                    <summary className="text-blue-400/50 text-[10px] tracking-wider uppercase cursor-pointer hover:text-blue-400/70">
                      💡 構造改善の提案を見る
                    </summary>
                    <p className="mt-2 text-white/40 text-[11px] leading-relaxed bg-blue-500/[0.04] rounded-lg px-3 py-2">
                      {h.rewrite_suggestion}
                    </p>
                  </details>
                )}
              </div>
            )}
          </div>
        );
      })}
      {remaining > 0 && (
        <button
          onClick={() => setShown(s => s + perPage)}
          className="w-full py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/30 text-xs hover:bg-white/[0.06] hover:text-white/50 transition-all"
        >
          さらに{Math.min(perPage, remaining)}件を表示（残り{remaining}件）
        </button>
      )}
    </div>
  );
}
