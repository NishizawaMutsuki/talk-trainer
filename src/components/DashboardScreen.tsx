"use client";

import { useState, useCallback } from "react";
import {
  QUESTIONS,
  TOTAL_QUESTIONS,
  DAY_LABELS,
  CHALLENGE_CATEGORY,
} from "@/lib/constants";
import type { HistoryEntry, HabitAnalysis, AIModelKey } from "@/lib/types";
import { getTodayKey, calcStreak, getWeekDates, allQuestionTexts, loadHabitAnalysis, persistHabitAnalysis } from "@/lib/utils";

interface DashboardProps {
  history: HistoryEntry[];
  dailyGoal: number;
  selectedModel: AIModelKey;
  onGoalChange: (goal: number) => void;
  onBack: () => void;
  onStartPractice: () => void;
}

export function DashboardScreen({
  history,
  dailyGoal,
  selectedModel,
  onGoalChange,
  onBack,
  onStartPractice,
}: DashboardProps) {
  const [habitAnalysis, setHabitAnalysis] = useState<HabitAnalysis | null>(() => loadHabitAnalysis());
  const [habitLoading, setHabitLoading] = useState(false);
  const [habitError, setHabitError] = useState<string | null>(null);
  const [showHabitDetail, setShowHabitDetail] = useState(false);

  const runHabitAnalysis = useCallback(async () => {
    const withAnswers = history.filter(h => h.answer?.trim());
    if (withAnswers.length < 5) {
      setHabitError("回答テキスト付きの練習が5回以上必要です");
      return;
    }
    setHabitLoading(true);
    setHabitError(null);
    try {
      const sessions = withAnswers.slice(0, 15).map(h => ({
        question: h.question,
        answer: h.answer,
        improvements: h.improvements,
        score: h.overall_score,
      }));
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessions, aiModel: selectedModel }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data: HabitAnalysis = await res.json();
      setHabitAnalysis(data);
      persistHabitAnalysis(data);
    } catch (e) {
      setHabitError(e instanceof Error ? e.message : "診断に失敗しました");
    } finally {
      setHabitLoading(false);
    }
  }, [history, selectedModel]);
  const today = getTodayKey();
  const todayEntries = history.filter(h => h.date === today);
  const todayCount = todayEntries.length;
  const todayAvg = todayEntries.length
    ? (todayEntries.reduce((a, h) => a + h.overall_score, 0) / todayEntries.length).toFixed(1)
    : "—";
  const streak = calcStreak(history);
  const weekDates = getWeekDates();
  const weekData = weekDates.map(date => {
    const de = history.filter(h => h.date === date);
    return {
      date,
      count: de.length,
      avg: de.length ? Math.round(de.reduce((a, h) => a + h.overall_score, 0) / de.length * 10) / 10 : 0,
    };
  });
  const weekTotal = weekData.reduce((a, d) => a + d.count, 0);
  const weekGoal = dailyGoal * 7;

  // Category coverage (exclude 1分チャレンジ — questions are API-generated)
  const catCounts = Object.keys(QUESTIONS)
    .filter(cat => cat !== CHALLENGE_CATEGORY)
    .map(cat => {
      const allTexts = allQuestionTexts(cat);
      const practiced = new Set(history.filter(h => h.category === cat).map(h => h.question)).size;
      const total = allTexts.length;
      return { cat, practiced, total, pct: total > 0 ? Math.round(practiced / total * 100) : 0 };
    });

  // ── Growth Stage ──
  const totalCount = history.length;
  const stages = [
    { min: 0,   label: "入門", desc: "フレームワークを意識して話す段階", icon: "🌱", next: 10 },
    { min: 10,  label: "基礎", desc: "PREP等の型が使えるようになってきた", icon: "🌿", next: 30 },
    { min: 30,  label: "習得", desc: "構造を意識せず自然に使える段階へ", icon: "🌳", next: 50 },
    { min: 50,  label: "応用", desc: "深掘りにも構造を崩さず対応できる", icon: "🔥", next: 100 },
    { min: 100, label: "達人", desc: "どんな質問にも即座に構造化して回答", icon: "⭐", next: null },
  ];
  const currentStage = [...stages].reverse().find(s => totalCount >= s.min) || stages[0];
  const nextThreshold = currentStage.next;
  const stagePct = nextThreshold
    ? Math.min(((totalCount - currentStage.min) / (nextThreshold - currentStage.min)) * 100, 100)
    : 100;

  // ── Structure score trend (構造スコア推移) ──
  const structureTrend: { label: string; avg: number }[] = [];
  if (history.length >= 5) {
    // 練習を古い順に5分割してバケットごとの構造スコア平均を算出
    const sorted = [...history].reverse();
    const bucketSize = Math.ceil(sorted.length / 5);
    for (let i = 0; i < sorted.length; i += bucketSize) {
      const bucket = sorted.slice(i, i + bucketSize);
      const entries = bucket.filter(h => h.overall_score != null);
      if (entries.length > 0) {
        const avg = Math.round(entries.reduce((a, h) => a + h.overall_score, 0) / entries.length * 10) / 10;
        const start = i + 1;
        const end = Math.min(i + bucketSize, sorted.length);
        structureTrend.push({ label: `${start}-${end}回`, avg });
      }
    }
  }

  // Score trend (last 14 days with data)
  const last14: { date: string; avg: number }[] = [];
  const seen = new Set<string>();
  for (const e of history) {
    if (!seen.has(e.date)) {
      seen.add(e.date);
      const de = history.filter(h => h.date === e.date);
      last14.push({ date: e.date, avg: Math.round(de.reduce((a, h) => a + h.overall_score, 0) / de.length * 10) / 10 });
    }
    if (last14.length >= 14) break;
  }
  last14.reverse();
  const maxAvg = Math.max(...last14.map(d => d.avg), 10);
  const progressPct = Math.min(todayCount / dailyGoal * 100, 100);
  const weekPct = Math.min(weekTotal / weekGoal * 100, 100);

  return (
    <div className="max-w-[520px] mx-auto px-4 pt-8 pb-20">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-white/30 hover:text-white/60 text-sm">← ホーム</button>
        <span className="text-[10px] tracking-widest uppercase text-white/25">ダッシュボード</span>
      </div>

      {/* Streak + Today */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 bg-gradient-to-br from-orange-500/[0.1] to-red-500/[0.1] border border-orange-500/15 rounded-2xl p-4 text-center">
          <p className="text-3xl mb-1">{streak > 0 ? "🔥" : "💤"}</p>
          <p className="text-2xl font-light text-orange-300/90">{streak}</p>
          <p className="text-[10px] text-orange-400/50 tracking-wider uppercase mt-1">日連続</p>
        </div>
        <div className="flex-[2] bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-white/40 text-[11px] tracking-wider uppercase">今日の進捗</p>
            <p className="text-white/60 text-sm">
              <span className="text-cyan-400/80 text-lg font-light">{todayCount}</span> / {dailyGoal}問
            </p>
          </div>
          <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden mb-2">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-500/70 to-blue-500/70 transition-all duration-700"
              style={{ width: `${progressPct}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-white/25">
            <span>平均 {todayAvg}</span>
            <span>{progressPct >= 100 ? "🎉 達成!" : `残り ${dailyGoal - todayCount}問`}</span>
          </div>
        </div>
      </div>

      {/* Weekly Progress */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-white/40 text-[11px] tracking-wider uppercase">今週の進捗</p>
          <p className="text-white/40 text-xs">{weekTotal} / {weekGoal}問</p>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden mb-4">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500/70 to-cyan-500/70 transition-all duration-700"
            style={{ width: `${weekPct}%` }} />
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {weekData.map((d, i) => {
            const isToday = d.date === today;
            const fillPct = Math.min(d.count / dailyGoal * 100, 100);
            return (
              <div key={i} className="text-center">
                <p className={`text-[10px] mb-1 ${isToday ? "text-cyan-400/70" : "text-white/25"}`}>{DAY_LABELS[i]}</p>
                <div className="h-16 rounded-md bg-white/[0.04] relative overflow-hidden mx-auto w-full">
                  <div className={`absolute bottom-0 w-full rounded-md transition-all duration-500 ${
                    isToday ? "bg-cyan-500/40" : d.count > 0 ? "bg-emerald-500/30" : ""
                  }`} style={{ height: `${fillPct}%` }} />
                </div>
                <p className={`text-[10px] mt-1 ${isToday ? "text-cyan-400/60" : "text-white/20"}`}>{d.count || "·"}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Score Trend */}
      {last14.length >= 2 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 mb-6">
          <p className="text-white/40 text-[11px] tracking-wider uppercase mb-3">スコア推移</p>
          <div className="relative h-28">
            <svg viewBox={`0 0 ${(last14.length - 1) * 40 + 20} 110`} className="w-full h-full" preserveAspectRatio="none">
              {[2, 4, 6, 8, 10].map(v => (
                <line key={v} x1="0" y1={100 - (v / maxAvg) * 90} x2={(last14.length - 1) * 40 + 20} y2={100 - (v / maxAvg) * 90}
                  stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              ))}
              <polyline fill="none" stroke="url(#scoreGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                points={last14.map((d, i) => `${i * 40 + 10},${100 - (d.avg / maxAvg) * 90}`).join(" ")} />
              <polygon fill="url(#scoreArea)" opacity="0.3"
                points={`10,100 ${last14.map((d, i) => `${i * 40 + 10},${100 - (d.avg / maxAvg) * 90}`).join(" ")} ${(last14.length - 1) * 40 + 10},100`} />
              {last14.map((d, i) => (
                <circle key={i} cx={i * 40 + 10} cy={100 - (d.avg / maxAvg) * 90} r="3"
                  fill={i === last14.length - 1 ? "#06b6d4" : "rgba(255,255,255,0.3)"} />
              ))}
              <defs>
                <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
                <linearGradient id="scoreArea" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" /><stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="flex justify-between text-[9px] text-white/20 mt-1 px-1">
            <span>{last14[0]?.date.split("/").slice(1).join("/")}</span>
            <span>{last14[last14.length - 1]?.date.split("/").slice(1).join("/")}</span>
          </div>
        </div>
      )}

      {/* Growth Stage */}
      <div className="bg-gradient-to-br from-violet-500/[0.08] to-fuchsia-500/[0.08] border border-violet-500/15 rounded-2xl p-4 mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-white/40 text-[11px] tracking-wider uppercase">成長ステージ</p>
          <p className="text-white/25 text-[10px]">累計 {totalCount}回練習</p>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{currentStage.icon}</span>
          <div>
            <p className="text-white/80 text-sm font-medium">{currentStage.label}</p>
            <p className="text-white/40 text-xs">{currentStage.desc}</p>
          </div>
        </div>
        {nextThreshold && (
          <>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden mb-2">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500/70 to-fuchsia-500/70 transition-all duration-700"
                style={{ width: `${stagePct}%` }} />
            </div>
            <p className="text-white/25 text-[10px] text-right">
              次のステージまで あと {nextThreshold - totalCount}回
            </p>
          </>
        )}
        <div className="flex gap-1.5 mt-3">
          {stages.map((s, i) => (
            <div key={i} className={`flex-1 text-center py-1.5 rounded-lg text-[9px] ${
              s.min <= totalCount
                ? "bg-violet-500/20 text-violet-300/80"
                : "bg-white/[0.03] text-white/20"
            }`}>
              <span className="block text-sm mb-0.5">{s.icon}</span>
              {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* Habit Analysis (癖診断) */}
      <div className="bg-gradient-to-br from-rose-500/[0.08] to-orange-500/[0.08] border border-rose-500/15 rounded-2xl p-4 mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-white/40 text-[11px] tracking-wider uppercase">話し方の癖診断</p>
          {habitAnalysis && (
            <p className="text-white/20 text-[10px]">
              {habitAnalysis.sampleCount}回分のデータで分析
            </p>
          )}
        </div>

        {habitAnalysis ? (
          <>
            {/* Overall impression */}
            <div className="bg-white/[0.04] rounded-xl px-4 py-3 mb-3">
              <p className="text-white/60 text-xs leading-relaxed">{habitAnalysis.overallImpression}</p>
            </div>

            {/* Radar-like dimension scores */}
            <div className="space-y-2 mb-3">
              {habitAnalysis.dimensions.map((dim) => {
                const color = dim.score >= 7 ? "emerald" : dim.score >= 4 ? "amber" : "rose";
                return (
                  <div key={dim.dimension}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white/50 text-[11px]">{dim.dimension}</span>
                      <span className={`text-${color}-400/70 text-[11px] font-medium`}>{dim.score}/10</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${
                        dim.score >= 7 ? "bg-gradient-to-r from-emerald-500/60 to-emerald-400/60"
                          : dim.score >= 4 ? "bg-gradient-to-r from-amber-500/60 to-amber-400/60"
                          : "bg-gradient-to-r from-rose-500/60 to-rose-400/60"
                      }`} style={{ width: `${dim.score * 10}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Biggest habit & strength */}
            <div className="space-y-2 mb-3">
              <div className="bg-rose-500/[0.08] border border-rose-500/15 rounded-xl px-3 py-2.5">
                <p className="text-rose-400/60 text-[9px] tracking-wider uppercase mb-1">最優先で直すべき癖</p>
                <p className="text-white/70 text-xs leading-relaxed">{habitAnalysis.biggestHabit}</p>
              </div>
              <div className="bg-emerald-500/[0.08] border border-emerald-500/15 rounded-xl px-3 py-2.5">
                <p className="text-emerald-400/60 text-[9px] tracking-wider uppercase mb-1">最大の武器</p>
                <p className="text-white/70 text-xs leading-relaxed">{habitAnalysis.biggestStrength}</p>
              </div>
              <div className="bg-cyan-500/[0.08] border border-cyan-500/15 rounded-xl px-3 py-2.5">
                <p className="text-cyan-400/60 text-[9px] tracking-wider uppercase mb-1">次の10回で意識すること</p>
                <p className="text-white/70 text-xs leading-relaxed">{habitAnalysis.nextFocus}</p>
              </div>
            </div>

            {/* Expandable detail */}
            <button
              onClick={() => setShowHabitDetail(!showHabitDetail)}
              className="text-white/25 text-[10px] hover:text-white/50 transition-colors w-full text-center"
            >
              {showHabitDetail ? "△ 詳細を閉じる" : "▽ 各軸の詳細と練習法を見る"}
            </button>

            {showHabitDetail && (
              <div className="mt-3 space-y-3">
                {habitAnalysis.dimensions.map((dim) => (
                  <div key={dim.dimension} className="bg-white/[0.02] border border-white/[0.04] rounded-xl px-3 py-2.5">
                    <p className="text-white/50 text-[11px] font-medium mb-1.5">{dim.dimension}（{dim.score}/10）</p>
                    <p className="text-white/40 text-[10px] leading-relaxed mb-1">
                      <span className="text-rose-400/50">癖:</span> {dim.habit}
                    </p>
                    <p className="text-white/30 text-[10px] leading-relaxed mb-1">
                      <span className="text-white/40">根拠:</span> {dim.evidence}
                    </p>
                    <p className="text-cyan-400/50 text-[10px] leading-relaxed">
                      <span className="text-cyan-400/60">練習法:</span> {dim.exercise}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Re-analyze button */}
            <button
              onClick={runHabitAnalysis}
              disabled={habitLoading}
              className="mt-3 w-full py-2 rounded-lg text-[10px] text-white/25 hover:text-white/50 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] transition-all"
            >
              {habitLoading ? "分析中..." : "再診断する"}
            </button>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-white/30 text-xs mb-3">
              練習データからあなたの話し方の癖を<br />AIが本気で診断します
            </p>
            {habitError && (
              <p className="text-rose-400/60 text-[10px] mb-2">{habitError}</p>
            )}
            <button
              onClick={runHabitAnalysis}
              disabled={habitLoading || history.filter(h => h.answer?.trim()).length < 5}
              className={`px-6 py-2.5 rounded-xl text-xs transition-all ${
                habitLoading || history.filter(h => h.answer?.trim()).length < 5
                  ? "bg-white/[0.04] text-white/20 cursor-not-allowed"
                  : "bg-gradient-to-r from-rose-500/60 to-orange-500/60 text-white hover:shadow-lg hover:shadow-rose-500/10"
              }`}
            >
              {habitLoading ? "分析中..." : history.filter(h => h.answer?.trim()).length < 5 ? `あと${5 - history.filter(h => h.answer?.trim()).length}回練習が必要` : "癖を診断する"}
            </button>
          </div>
        )}
      </div>

      {/* Structure Score Growth */}
      {structureTrend.length >= 2 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 mb-6">
          <p className="text-white/40 text-[11px] tracking-wider uppercase mb-1">構造的な話し方の成長</p>
          <p className="text-white/20 text-[10px] mb-3">練習回数ごとの平均スコア推移</p>
          <div className="flex items-end gap-2 h-24">
            {structureTrend.map((d, i) => {
              const barH = Math.max((d.avg / 10) * 100, 8);
              const isLast = i === structureTrend.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className={`text-[10px] ${isLast ? "text-cyan-400/80" : "text-white/30"}`}>{d.avg}</span>
                  <div className="w-full flex items-end" style={{ height: "72px" }}>
                    <div className={`w-full rounded-t-md transition-all duration-500 ${
                      isLast
                        ? "bg-gradient-to-t from-cyan-500/60 to-cyan-400/40"
                        : "bg-gradient-to-t from-white/10 to-white/[0.06]"
                    }`} style={{ height: `${barH}%` }} />
                  </div>
                  <span className="text-[8px] text-white/20">{d.label}</span>
                </div>
              );
            })}
          </div>
          {structureTrend.length >= 2 && (() => {
            const first = structureTrend[0].avg;
            const last = structureTrend[structureTrend.length - 1].avg;
            const diff = Math.round((last - first) * 10) / 10;
            if (diff > 0) return <p className="text-emerald-400/60 text-[10px] mt-2 text-center">📈 初期から +{diff} ポイント成長しています</p>;
            if (diff === 0) return <p className="text-white/25 text-[10px] mt-2 text-center">安定したスコアを維持しています</p>;
            return null;
          })()}
        </div>
      )}

      {/* Category Coverage */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-white/40 text-[11px] tracking-wider uppercase">カテゴリ別カバー率</p>
          <p className="text-white/25 text-[10px]">全{TOTAL_QUESTIONS}問（面接）</p>
        </div>
        <div className="space-y-2.5">
          {catCounts.map(({ cat, practiced, total, pct }) => (
            <div key={cat}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/50">{cat}</span>
                <span className="text-white/30">{practiced}/{total} ({pct}%)</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-500/60 to-fuchsia-500/60 transition-all duration-500"
                  style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Goal Setting */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 mb-6">
        <p className="text-white/40 text-[11px] tracking-wider uppercase mb-3">🎯 1日の目標</p>
        <div className="flex items-center gap-3">
          {[10, 30, 50, 100].map(g => (
            <button key={g} onClick={() => onGoalChange(g)}
              className={`flex-1 py-2 rounded-lg text-xs transition-all ${
                dailyGoal === g
                  ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-400/80"
                  : "bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white/50"
              }`}>
              {g}問
            </button>
          ))}
        </div>
      </div>

      <button onClick={onStartPractice}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500/80 to-cyan-500/80 text-white text-sm tracking-wider shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-all">
        練習を始める
      </button>
    </div>
  );
}
