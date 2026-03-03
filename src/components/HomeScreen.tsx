"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { QUESTIONS, CHALLENGE_CATEGORY } from "@/lib/constants";
import type { HistoryEntry, UserStatus, AIModelKey } from "@/lib/types";
import { useMemo, useState } from "react";

const MODEL_LABELS: Record<AIModelKey, { label: string; desc: string; badge?: string }> = {
  "gemini-flash": { label: "Standard", desc: "Gemini Flash · 高速" },
  "gemini-pro":   { label: "Think Mode", desc: "Gemini Pro · 高精度", badge: "PRO" },
  "claude-haiku": { label: "Claude Haiku", desc: "Anthropic · 高速・高品質", badge: "PRO" },
  "claude-sonnet":{ label: "Claude Sonnet", desc: "Anthropic · 最高品質", badge: "PRO" },
  "claude-opus":  { label: "Claude Opus", desc: "Anthropic · 最高知能", badge: "PRO" },
};

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
    <div className="max-w-[500px] mx-auto px-4 pt-12 pb-20">
      {/* Auth header */}
      <div className="flex justify-end mb-4">
        {authStatus === "loading" ? (
          <div className="w-20 h-8 bg-white/[0.04] rounded-lg animate-pulse" />
        ) : session ? (
          <div className="flex items-center gap-3">
            {userStatus.unlimited && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30 text-violet-400/80 tracking-wider">
                ∞ ADMIN
              </span>
            )}
            {userStatus.plan === "pro" && !userStatus.unlimited ? (
              <span className="text-[10px] px-2 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400/80 tracking-wider">
                PRO
              </span>
            ) : !userStatus.unlimited && userStatus.usage !== undefined ? (
              <span className="text-[10px] px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/30">
                {userStatus.usage}/{userStatus.limit}回
              </span>
            ) : null}
            <button onClick={() => signOut()} className="text-white/30 text-xs hover:text-white/50 transition-colors">
              ログアウト
            </button>
          </div>
        ) : (
          <button onClick={() => signIn("google")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/60 text-xs hover:bg-white/[0.1] hover:text-white/80 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Googleでログイン
          </button>
        )}
      </div>

      {/* Error toast */}
      {error && (
        <div className="mb-6 bg-red-500/[0.08] border border-red-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-red-300/80 text-xs">{error}</p>
          <button onClick={onClearError} className="text-red-400/50 hover:text-red-400/80 text-xs ml-3 shrink-0">✕</button>
        </div>
      )}

      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] tracking-widest uppercase text-white/40">Talk Trainer</span>
        </div>
        <h1 className="text-5xl font-extralight tracking-tight text-white/90 mb-4">
          伝わる話し方を<br />
          <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent font-light">
            体で覚える
          </span>
        </h1>
        <p className="text-white/35 text-sm max-w-[320px] mx-auto leading-relaxed">
          Think Fast, Talk Smartメソッドで話の構造を分析し、伝えるスキルを磨きましょう
        </p>
      </div>

      {history.length > 0 && (
        <div className="flex justify-center gap-8 mb-12 px-6 py-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
          {[["練習回数", stats.total], ["平均スコア", stats.avg], ["最高スコア", stats.best]].map(([l, v]) => (
            <div key={String(l)} className="text-center">
              <div className="text-2xl font-light text-white/80">{v}</div>
              <div className="text-[10px] tracking-wider uppercase text-white/30 mt-1">{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Model selector — shown when multiple models available */}
      {availableModels.length > 1 && (
        <div className="mb-8">
          <button
            onClick={() => setShowModelPicker(!showModelPicker)}
            className="mx-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all"
          >
            <span className="text-[10px] text-white/40">AIモデル:</span>
            <span className="text-[11px] text-white/70 font-medium">{MODEL_LABELS[selectedModel].label}</span>
            <span className="text-[10px] text-white/20">{showModelPicker ? "▲" : "▼"}</span>
          </button>
          {showModelPicker && (
            <div className="mt-2 grid gap-1.5 max-w-[400px] mx-auto">
              {availableModels.map((m) => {
                const info = MODEL_LABELS[m];
                const isSelected = selectedModel === m;
                return (
                  <button
                    key={m}
                    onClick={() => { onModelChange(m); setShowModelPicker(false); }}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-lg border transition-all ${
                      isSelected
                        ? "bg-white/[0.08] border-cyan-500/30 shadow-sm"
                        : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isSelected ? "bg-cyan-400" : "bg-white/10"}`} />
                      <span className={`text-xs ${isSelected ? "text-white/90" : "text-white/50"}`}>{info.label}</span>
                      {info.badge && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400/70">{info.badge}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-white/25">{info.desc}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] tracking-widest uppercase text-white/30 mb-4 text-center">カテゴリを選択</p>
      <div className="grid grid-cols-2 gap-3 mb-10">
        {Object.keys(QUESTIONS).map((cat) => (
          <button key={cat}
            onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            className={`group relative px-5 py-4 rounded-xl text-left transition-all duration-300 border ${
              selectedCategory === cat
                ? "bg-white/[0.08] border-white/20 shadow-lg"
                : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.05] hover:border-white/10"
            }`}>
            <span className={`text-sm ${selectedCategory === cat ? "text-white/90" : "text-white/50"}`}>{cat}</span>
            <div className="text-[10px] text-white/25 mt-1">
              {cat === CHALLENGE_CATEGORY ? (
                <span className="text-amber-400/50">🎲 AIがお題を生成</span>
              ) : (
                <>
                  {QUESTIONS[cat].filter(q => q.standalone).length}問
                  {QUESTIONS[cat].some(q => !q.standalone) && (
                    <span className="text-white/15"> +深掘り{QUESTIONS[cat].filter(q => !q.standalone).length}</span>
                  )}
                </>
              )}
            </div>
            {selectedCategory === cat && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-cyan-400" />}
          </button>
        ))}
      </div>

      <div className="text-center">
        <button onClick={() => selectedCategory && onStartPractice(selectedCategory)}
          disabled={!selectedCategory}
          className={`px-10 py-4 rounded-2xl text-sm tracking-wider uppercase transition-all duration-500 ${
            selectedCategory
              ? "bg-gradient-to-r from-blue-500/80 to-cyan-500/80 text-white shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]"
              : "bg-white/[0.04] text-white/20 cursor-not-allowed"
          }`}>
          練習を始める
        </button>
      </div>

      {history.length > 0 && (
        <div className="flex justify-center gap-4 mt-6">
          <button onClick={() => onNavigate("dashboard")}
            className="text-cyan-400/50 text-xs hover:text-cyan-400/80 transition-colors underline underline-offset-4 decoration-cyan-400/20">
            📊 ダッシュボード
          </button>
          <button onClick={() => onNavigate("history")}
            className="text-white/25 text-xs hover:text-white/50 transition-colors underline underline-offset-4 decoration-white/10">
            練習履歴を見る
          </button>
        </div>
      )}

      {/* Admin link — only shown for admins */}
      {role === "admin" && (
        <div className="text-center mt-8">
          <a href="/admin"
            className="text-white/15 text-[10px] hover:text-white/40 transition-colors">
            🔧 管理画面
          </a>
        </div>
      )}
    </div>
  );
}
