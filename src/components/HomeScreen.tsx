"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { QUESTIONS, CHALLENGE_CATEGORY } from "@/lib/constants";
import type { HistoryEntry, UserStatus, AIModelKey } from "@/lib/types";
import { useMemo, useState } from "react";

const MODEL_LABELS: Record<AIModelKey, { label: string; desc: string; badge?: string }> = {
  "gemini-flash": { label: "Standard", desc: "高速", badge: undefined },
  "gemini-pro":   { label: "Think Mode", desc: "高精度", badge: "PRO" },
  "claude-haiku": { label: "Claude Haiku", desc: "高速・高品質", badge: "PRO" },
  "claude-sonnet":{ label: "Claude Sonnet", desc: "最高品質", badge: "PRO" },
  "claude-opus":  { label: "Claude Opus", desc: "最高知能", badge: "PRO" },
};

const CATEGORY_ICONS: Record<string, string> = {
  "自己PR": "✦",
  "ガクチカ": "◆",
  "志望動機": "▲",
  "長所・短所": "◎",
  "挫折経験": "◇",
  "将来のビジョン": "→",
  "チームワーク": "⬡",
  "1分チャレンジ": "🎲",
};

function AscentLogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 48 48" fill="none" className="opacity-60">
      <circle cx="24" cy="24" r="14" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" fill="none"/>
      <path d="M24 34V14" stroke="url(#hmOrbitG)" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M19 19L24 14L29 19" stroke="url(#hmOrbitG)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <ellipse cx="24" cy="24" rx="18" ry="7" stroke="url(#hmOrbitG)" strokeWidth="1" fill="none" opacity="0.3" transform="rotate(-20 24 24)"/>
      <defs>
        <linearGradient id="hmOrbitG" x1="24" y1="34" x2="24" y2="14">
          <stop offset="0%" stopColor="#38bdf8"/>
          <stop offset="100%" stopColor="#a78bfa"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

interface HomeScreenProps {
  userStatus: UserStatus;
  history: HistoryEntry[];
  error: string | null;
  selectedModel: AIModelKey;
  onModelChange: (model: AIModelKey) => void;
  onClearError: () => void;
  onStartPractice: (category: string) => void;
  onNavigate: (screen: "dashboard" | "history") => void;
}

export function HomeScreen({
  userStatus,
  history,
  error,
  selectedModel,
  onModelChange,
  onClearError,
  onStartPractice,
  onNavigate,
}: HomeScreenProps) {
  const { data: session, status: authStatus } = useSession();
  const role = (session?.user as Record<string, unknown> | undefined)?.role as string | undefined;
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const availableModels = userStatus.availableModels || ["gemini-flash"];

  const stats = useMemo(() => ({
    total: history.length,
    avg: history.length
      ? (history.reduce((a, h) => a + h.overall_score, 0) / history.length).toFixed(1)
      : "—",
    best: history.length ? Math.max(...history.map(h => h.overall_score)) : "—",
  }), [history]);

  return (
    <div className="max-w-[520px] mx-auto px-5 pt-10 pb-24">
      {/* ── Nav bar ── */}
      <div className="flex items-center justify-between mb-12 anim-fade-in">
        <AscentLogoMark />
        <div className="flex items-center gap-3">
          {authStatus === "loading" ? (
            <div className="w-20 h-8 bg-white/[0.04] rounded-lg animate-pulse" />
          ) : session ? (
            <>
              {userStatus.unlimited && (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400/70 tracking-wider font-medium">
                  ∞ ADMIN
                </span>
              )}
              {userStatus.plan === "pro" && !userStatus.unlimited && (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400/70 tracking-wider font-medium">
                  PRO
                </span>
              )}
              {!userStatus.unlimited && userStatus.usage !== undefined && userStatus.plan !== "pro" && (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-white/30">
                  {userStatus.usage}/{userStatus.limit}
                </span>
              )}
              <button onClick={() => signOut()} className="text-white/25 text-[11px] hover:text-white/50 transition-colors">
                ログアウト
              </button>
            </>
          ) : (
            <button onClick={() => signIn("google")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/50 text-xs hover:bg-white/[0.08] hover:border-white/[0.1] hover:text-white/70 transition-all duration-300">
              <svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Googleでログイン
            </button>
          )}
        </div>
      </div>

      {/* ── Error toast ── */}
      {error && (
        <div className="mb-6 glass-card-static px-4 py-3 flex items-center justify-between border-red-500/20 anim-scale-in">
          <p className="text-red-300/80 text-xs">{error}</p>
          <button onClick={onClearError} className="text-red-400/50 hover:text-red-400/80 text-xs ml-3 shrink-0">✕</button>
        </div>
      )}

      {/* ── Hero ── */}
      <div className="text-center mb-16 anim-fade-in-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] tracking-[0.2em] uppercase text-white/35" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Talk Trainer
          </span>
        </div>
        <h1 className="text-[clamp(2.5rem,8vw,3.2rem)] font-extralight tracking-tight text-white/90 mb-5 leading-[1.15]" style={{ fontFamily: "'Outfit', 'Noto Sans JP', sans-serif" }}>
          伝わる話し方を<br />
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent font-light">
            体で覚える
          </span>
        </h1>
        <p className="text-white/30 text-[13px] max-w-[340px] mx-auto leading-[1.9]">
          Think Fast, Talk Smartメソッドで<br />
          話の構造を分析し、伝えるスキルを磨きましょう
        </p>
      </div>

      {/* ── Stats ── */}
      {history.length > 0 && (
        <div className="glass-card px-6 py-5 mb-12 anim-fade-in-up anim-d2" style={{ cursor: "default" }}>
          <div className="flex justify-center gap-10">
            {([["練習回数", stats.total, ""], ["平均スコア", stats.avg, "/10"], ["最高スコア", stats.best, "/10"]] as const).map(([l, v, suffix]) => (
              <div key={l} className="text-center">
                <div className="text-2xl font-light text-white/80 tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {v}<span className="text-sm text-white/20 ml-0.5">{suffix}</span>
                </div>
                <div className="text-[9px] tracking-[0.15em] uppercase text-white/25 mt-1.5">{l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Model Selector ── */}
      {availableModels.length > 1 && (
        <div className="mb-10 anim-fade-in-up anim-d3">
          <button
            onClick={() => setShowModelPicker(!showModelPicker)}
            className="mx-auto flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-300"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/60" />
            <span className="text-[10px] text-white/35">AI:</span>
            <span className="text-[11px] text-white/65 font-medium">{MODEL_LABELS[selectedModel].label}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" className={`text-white/20 transition-transform duration-200 ${showModelPicker ? "rotate-180" : ""}`}>
              <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          </button>
          {showModelPicker && (
            <div className="mt-3 grid gap-1.5 max-w-[400px] mx-auto anim-scale-in">
              {availableModels.map((m) => {
                const info = MODEL_LABELS[m];
                const isSelected = selectedModel === m;
                return (
                  <button
                    key={m}
                    onClick={() => { onModelChange(m); setShowModelPicker(false); }}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 ${
                      isSelected
                        ? "bg-white/[0.06] border-cyan-500/25"
                        : "bg-white/[0.01] border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full transition-colors ${isSelected ? "bg-cyan-400" : "bg-white/10"}`} />
                      <span className={`text-xs ${isSelected ? "text-white/85" : "text-white/45"}`}>{info.label}</span>
                      {info.badge && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400/60 font-medium">{info.badge}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-white/20">{info.desc}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Category Grid ── */}
      <div className="anim-fade-in-up anim-d4">
        <p className="text-[10px] tracking-[0.2em] uppercase text-white/25 mb-4 text-center" style={{ fontFamily: "'Outfit', sans-serif" }}>
          カテゴリを選択
        </p>
        <div className="grid grid-cols-2 gap-3 mb-10">
          {Object.keys(QUESTIONS).map((cat, i) => {
            const isSelected = selectedCategory === cat;
            const icon = CATEGORY_ICONS[cat] || "●";
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(isSelected ? null : cat)}
                className={`group relative px-5 py-4 rounded-xl text-left transition-all duration-300 border overflow-hidden anim-fade-in-up anim-d${Math.min(i + 4, 8)} ${
                  isSelected
                    ? "bg-white/[0.06] border-cyan-500/25 shadow-lg shadow-cyan-500/5"
                    : "bg-white/[0.015] border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08]"
                }`}
              >
                {isSelected && (
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.06] to-violet-500/[0.04] pointer-events-none" />
                )}
                <div className="relative">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs transition-colors ${isSelected ? "text-cyan-400/70" : "text-white/20"}`}>{icon}</span>
                    <span className={`text-[13px] font-medium transition-colors ${isSelected ? "text-white/90" : "text-white/50"}`}>{cat}</span>
                  </div>
                  <div className="text-[10px] text-white/20 ml-5">
                    {cat === CHALLENGE_CATEGORY ? (
                      <span className="text-amber-400/40">AIがお題を生成</span>
                    ) : (
                      <>
                        {QUESTIONS[cat].filter(q => q.standalone).length}問
                        {QUESTIONS[cat].some(q => !q.standalone) && (
                          <span className="text-white/12"> +深掘り{QUESTIONS[cat].filter(q => !q.standalone).length}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {isSelected && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-cyan-400 glow-ring" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="text-center anim-fade-in-up anim-d6">
        <button
          onClick={() => selectedCategory && onStartPractice(selectedCategory)}
          disabled={!selectedCategory}
          className="btn-primary"
        >
          <span>練習を始める</span>
        </button>
      </div>

      {/* ── Footer links ── */}
      {history.length > 0 && (
        <div className="flex justify-center gap-6 mt-8 anim-fade-in anim-d7">
          <button onClick={() => onNavigate("dashboard")}
            className="text-cyan-400/40 text-xs hover:text-cyan-400/70 transition-colors">
            📊 ダッシュボード
          </button>
          <button onClick={() => onNavigate("history")}
            className="text-white/20 text-xs hover:text-white/50 transition-colors">
            練習履歴を見る
          </button>
        </div>
      )}

      {role === "admin" && (
        <div className="text-center mt-10 anim-fade-in anim-d8">
          <a href="/admin" className="text-white/10 text-[10px] hover:text-white/30 transition-colors">
            管理画面
          </a>
        </div>
      )}
    </div>
  );
}
