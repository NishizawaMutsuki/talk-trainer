"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

// ─── Shared modules ─────────────────────────────────────────────
import type { Screen, AnalysisResult, HistoryEntry, ChainTurn, FollowupInfo, ChallengeInfo, UserStatus } from "@/lib/types";
import {
  QUESTIONS,
  FRAMEWORKS,
  COACHING_TIPS,
  HISTORY_PER_PAGE,
  CHALLENGE_CATEGORY,
} from "@/lib/constants";
import {
  toDateKey,
  getRecommendedFrameworks,
  loadHistory,
  persistHistory,
  loadDailyGoal,
  persistDailyGoal,
  pickQuestion,
  fwNameToKey,
} from "@/lib/utils";
import {
  Timer,
  WaveformVisualizer,
  FrameworkBadge,
  HistoryList,
} from "@/components/ui";
import { DashboardScreen } from "@/components/DashboardScreen";
import { ResultScreen } from "@/components/ResultScreen";

// ─── Main App ───────────────────────────────────────────────────

export default function TalkTrainer() {
  const { data: session, status: authStatus } = useSession();
  const [userStatus, setUserStatus] = useState<UserStatus>({ loggedIn: false });
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [question, setQuestion] = useState("");
  const [rootQuestion, setRootQuestion] = useState(""); // original question before deep dive
  const [transcript, setTranscript] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [speechStatus, setSpeechStatus] = useState<"idle" | "listening" | "unavailable" | "error">("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dailyGoal, setDailyGoal] = useState(50);

  // Deep dive state
  const [chain, setChain] = useState<ChainTurn[]>([]);
  const [followupInfo, setFollowupInfo] = useState<FollowupInfo | null>(null);

  // 1分チャレンジ state
  const [challengeInfo, setChallengeInfo] = useState<ChallengeInfo | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const transcriptRef = useRef("");
  const historyRef = useRef<HistoryEntry[]>([]);

  // ── Derived ──
  const coachingTip = useMemo(
    () => COACHING_TIPS[Math.floor(Math.random() * COACHING_TIPS.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [question]
  );
  const recommendedFrameworks = useMemo(() => {
    // In deep dive, prefer the AI-recommended framework
    if (followupInfo?.recommended_framework) {
      const key = fwNameToKey(followupInfo.recommended_framework);
      const fallback = getRecommendedFrameworks(question, category);
      if (key) return [key, ...fallback.filter(f => f !== key)].slice(0, 2);
    }
    // In 1分チャレンジ, use AI-recommended framework
    if (challengeInfo?.recommended_framework) {
      const key = fwNameToKey(challengeInfo.recommended_framework);
      if (key) return [key, ...Object.keys(FRAMEWORKS).filter(f => f !== key).slice(0, 1)];
    }
    return getRecommendedFrameworks(question, category);
  }, [question, category, followupInfo, challengeInfo]);

  const isManualInput = speechStatus === "unavailable" || speechStatus === "error";
  const isDeepDive = chain.length > 0;

  const stats = useMemo(() => ({
    total: history.length,
    avg: history.length
      ? (history.reduce((a, h) => a + h.overall_score, 0) / history.length).toFixed(1)
      : "—",
    best: history.length ? Math.max(...history.map(h => h.overall_score)) : "—",
  }), [history]);

  // ── Persistence ──
  useEffect(() => {
    const h = loadHistory();
    setHistory(h);
    historyRef.current = h;
    setDailyGoal(loadDailyGoal());
  }, []);

  // ── Fetch user status ──
  const fetchUserStatus = useCallback(async () => {
    if (authStatus !== "authenticated") {
      setUserStatus({ loggedIn: false });
      return;
    }
    try {
      const res = await fetch("/api/user");
      const data: UserStatus = await res.json();
      setUserStatus(data);
    } catch {
      setUserStatus({ loggedIn: true, plan: "free", usage: 0, limit: 10, canUse: true });
    }
  }, [authStatus]);

  useEffect(() => {
    fetchUserStatus();
  }, [fetchUserStatus]);

  // Handle ?upgraded=true from Stripe success redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "true") {
      window.history.replaceState({}, "", "/");
      fetchUserStatus();
    }
  }, [fetchUserStatus]);

  const saveHistory = useCallback((h: HistoryEntry[]) => {
    setHistory(h);
    historyRef.current = h;
    persistHistory(h);
  }, []);

  const updateDailyGoal = useCallback((g: number) => {
    setDailyGoal(g);
    persistDailyGoal(g);
  }, []);

  // ── Reset helpers ──
  const resetDeepDive = useCallback(() => {
    setChain([]);
    setFollowupInfo(null);
    setRootQuestion("");
  }, []);

  // ── Navigation ──
  const startPractice = useCallback(async (cat: string) => {
    // ログインチェック
    if (!userStatus.loggedIn) {
      signIn("google");
      return;
    }
    // 利用上限チェック
    if (!userStatus.canUse) {
      setScreen("paywall");
      return;
    }

    setCategory(cat);
    setTranscript("");
    setError(null);
    resetDeepDive();
    setChallengeInfo(null);

    if (cat === CHALLENGE_CATEGORY) {
      // 1分チャレンジ: API経由でお題を生成
      setScreen("challenge-generating");
      try {
        const pastTopics = history
          .filter(h => h.category === CHALLENGE_CATEGORY)
          .map(h => h.question)
          .slice(0, 30); // 直近30件を被り防止に送る

        const res = await fetch("/api/challenge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pastTopics }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
        const data: ChallengeInfo = await res.json();
        if (!data.question?.trim()) throw new Error("お題が生成されませんでした");

        setChallengeInfo(data);
        setQuestion(data.question);
        setRootQuestion(data.question);
        setScreen("practice");
      } catch (e) {
        setError("お題の生成に失敗しました: " + (e instanceof Error ? e.message : ""));
        setScreen("home");
      }
    } else {
      // 通常カテゴリ: ローカルの質問リストから選択
      const q = pickQuestion(cat, history);
      setQuestion(q);
      setRootQuestion(q);
      setScreen("practice");
    }
  }, [history, resetDeepDive]);

  // ── Deep Dive ──
  const startDeepDive = useCallback(async () => {
    if (!result || !transcript.trim()) return;

    const newTurn: ChainTurn = {
      question,
      answer: transcript,
      score: result.overall_score,
      feedback: result.one_line_feedback,
      seconds,
    };
    // Build new chain but don't commit to state until API succeeds
    const pendingChain = [...chain, newTurn];
    setScreen("followup-generating");

    try {
      const res = await fetch("/api/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          chain: pendingChain.map(t => ({ question: t.question, answer: t.answer })),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data: FollowupInfo = await res.json();

      // Guard: if API returned empty fields, treat as error
      if (!data.followup_question?.trim()) {
        throw new Error("質問が生成されませんでした");
      }

      // Commit chain only on success
      setChain(pendingChain);
      setFollowupInfo(data);
      setQuestion(data.followup_question);
      setTranscript("");
      setSeconds(0);
      setResult(null);
      setError(null);
      setScreen("practice");
    } catch (e) {
      // Don't modify chain on failure — user can retry
      setError("深掘り質問の生成に失敗しました: " + (e instanceof Error ? e.message : ""));
      setScreen("result");
    }
  }, [result, transcript, question, seconds, chain, category]);

  // ── Media cleanup helper ──
  const cleanupMedia = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
      } catch {}
      mediaRecorderRef.current = null;
    }
  }, []);

  // ── Recording ──
  const startRecording = useCallback(async () => {
    setScreen("recording");
    setSeconds(0);
    setTranscript("");
    transcriptRef.current = "";
    setSpeechStatus("idle");

    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);

    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        const recognition = new SR();
        recognition.lang = "ja-JP";
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onstart = () => setSpeechStatus("listening");
        recognition.onresult = (e: SpeechRecognitionEvent) => {
          let final = "", interim = "";
          for (let i = 0; i < e.results.length; i++) {
            if (e.results[i].isFinal) final += e.results[i][0].transcript;
            else interim += e.results[i][0].transcript;
          }
          transcriptRef.current = final;
          setTranscript(final + interim);
        };
        recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
          if (e.error === "not-allowed" || e.error === "service-not-allowed") setSpeechStatus("unavailable");
          else setSpeechStatus("error");
        };
        recognition.onend = () => {
          if (timerRef.current) {
            try { recognition.start(); } catch { setSpeechStatus("error"); }
          }
        };
        recognition.start();
        recognitionRef.current = recognition;
      } else {
        setSpeechStatus("unavailable");
      }
    } catch { setSpeechStatus("unavailable"); }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mr.start();
      mediaRecorderRef.current = mr;
    } catch {}
  }, []);

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current!);
    timerRef.current = null;
    cleanupMedia();
    setTranscript(t => t || transcriptRef.current);
    setScreen("reviewing");
  }, [cleanupMedia]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cleanupMedia();
    };
  }, [cleanupMedia]);

  // ── Analysis ──
  const analyze = useCallback(async () => {
    if (!transcript.trim()) return;
    setScreen("analyzing");
    try {
      const primaryFw = FRAMEWORKS[recommendedFrameworks[0]];
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          answer: transcript,
          recommended_framework: primaryFw?.name || "PREP法",
          category,
          chain: chain.length > 0
            ? chain.map(t => ({ question: t.question, answer: t.answer }))
            : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        if (res.status === 401) {
          signIn("google");
          return;
        }
        if (res.status === 403 && err.code === "LIMIT_REACHED") {
          await fetchUserStatus();
          setScreen("paywall");
          return;
        }
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data: AnalysisResult = await res.json();
      setResult(data);

      const entry: HistoryEntry = {
        question, category,
        overall_score: data.overall_score,
        feedback: data.one_line_feedback,
        date: toDateKey(new Date()),
        seconds,
        answer: transcript,
        strengths: data.strengths,
        improvements: data.improvements,
        rewrite_suggestion: data.rewrite_suggestion,
        depth: chain.length,
        rootQuestion: chain.length > 0 ? rootQuestion : undefined,
      };
      saveHistory([entry, ...historyRef.current]);
      await fetchUserStatus(); // 利用回数を更新
      setScreen("result");
    } catch (e) {
      setError("分析エラー: " + (e instanceof Error ? e.message : "もう一度お試しください"));
      setScreen("reviewing");
    }
  }, [transcript, recommendedFrameworks, question, category, seconds, saveHistory, chain, rootQuestion, fetchUserStatus]);

  // ── Screen label helper ──
  const screenLabel = isDeepDive ? `${category} — 深掘り ${chain.length}回目` : category;

  // ── Render ──
  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 20% 0%, #0f172a 0%, #030712 50%, #000 100%)" }}>

      {/* ── HOME ── */}
      {screen === "home" && (
        <div className="max-w-[500px] mx-auto px-4 pt-12 pb-20">
          {/* Auth header */}
          <div className="flex justify-end mb-4">
            {authStatus === "loading" ? (
              <div className="w-20 h-8 bg-white/[0.04] rounded-lg animate-pulse" />
            ) : session ? (
              <div className="flex items-center gap-3">
                {userStatus.plan === "pro" ? (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400/80 tracking-wider">
                    PRO
                  </span>
                ) : userStatus.usage !== undefined ? (
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
              <button onClick={() => setError(null)} className="text-red-400/50 hover:text-red-400/80 text-xs ml-3 shrink-0">✕</button>
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
            <button onClick={() => selectedCategory && startPractice(selectedCategory)}
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
              <button onClick={() => setScreen("dashboard")}
                className="text-cyan-400/50 text-xs hover:text-cyan-400/80 transition-colors underline underline-offset-4 decoration-cyan-400/20">
                📊 ダッシュボード
              </button>
              <button onClick={() => setScreen("history")}
                className="text-white/25 text-xs hover:text-white/50 transition-colors underline underline-offset-4 decoration-white/10">
                練習履歴を見る
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── DASHBOARD ── */}
      {screen === "dashboard" && (
        <DashboardScreen
          history={history}
          dailyGoal={dailyGoal}
          onGoalChange={updateDailyGoal}
          onBack={() => setScreen("home")}
          onStartPractice={() => setScreen("home")}
        />
      )}

      {/* ── PRACTICE ── */}
      {screen === "practice" && (
        <div className="min-h-screen flex flex-col px-4 pt-8 pb-20">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => setScreen("home")} className="text-white/30 hover:text-white/60 text-sm">← 戻る</button>
            <span className="text-[10px] tracking-widest uppercase text-white/25">{screenLabel}</span>
          </div>
          <div className="text-center mb-8">
            <div className="inline-block px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] mb-6">
              <span className="text-[10px] tracking-widest uppercase text-white/35">
                {isDeepDive ? "深掘り質問" : "質問"}
              </span>
            </div>
            <h2 className="text-2xl font-light text-white/85 leading-relaxed max-w-lg mx-auto">{question}</h2>
          </div>

          {/* Context cards — varies by mode */}
          {isDeepDive && followupInfo ? (
            /* Deep Dive Context */
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
            /* 1分チャレンジ — AI generated topic tip */
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
            /* Coaching Tip — default */
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
            <button onClick={startRecording}
              className="group w-24 h-24 rounded-full bg-gradient-to-br from-red-500/80 to-rose-600/80 flex items-center justify-center shadow-xl shadow-red-500/20 hover:shadow-red-500/30 hover:scale-105 active:scale-95 transition-all duration-300">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </button>
            <p className="text-white/25 text-xs mt-4">録音して話す</p>
            <button onClick={() => setScreen("reviewing")}
              className="mt-4 text-white/25 text-xs hover:text-white/50 transition-colors underline underline-offset-4 decoration-white/10">
              テキストで入力する
            </button>
          </div>
        </div>
      )}

      {/* ── RECORDING ── */}
      {screen === "recording" && (
        <div className="min-h-screen flex flex-col px-4 pt-8 pb-20">
          <div className="flex items-center justify-between mb-10">
            <button onClick={() => { stopRecording(); setScreen("home"); }} className="text-white/30 hover:text-white/60 text-sm">← やめる</button>
            <span className="text-[10px] tracking-widest uppercase text-white/25">{screenLabel}</span>
          </div>
          <div className="text-center mb-6">
            <h2 className="text-lg font-light text-white/60 leading-relaxed max-w-lg mx-auto">{question}</h2>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 max-w-md mx-auto w-full">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-32 h-32 rounded-full bg-red-500/10 animate-ping" style={{ animationDuration: "2s" }} />
              <div className="absolute w-24 h-24 rounded-full bg-red-500/15 animate-ping" style={{ animationDuration: "1.5s" }} />
              <Timer seconds={seconds} />
            </div>
            <div className="flex items-center justify-center gap-2">
              {speechStatus === "listening" && (
                <><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span className="text-emerald-400/60 text-xs">音声認識中</span></>
              )}
              {speechStatus === "idle" && <span className="text-white/25 text-xs">音声認識を開始しています...</span>}
              {isManualInput && (
                <><div className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-amber-400/60 text-xs">音声認識が利用できません（停止後にテキスト入力可）</span></>
              )}
            </div>
            <WaveformVisualizer isActive={true} />
            {transcript ? (
              <div className="text-left w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05] max-h-32 overflow-y-auto">
                <p className="text-xs text-white/40 leading-relaxed">{transcript}</p>
              </div>
            ) : (
              <div className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-dashed border-white/[0.06]">
                <p className="text-xs text-white/20">
                  {isManualInput ? "停止後にテキストを入力してください" : "話し始めるとテキストが表示されます..."}
                </p>
              </div>
            )}
            <div className="w-full px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[10px] text-white/25 text-center">
                💡 {FRAMEWORKS[recommendedFrameworks[0]]?.structure.join(" → ")}
              </p>
            </div>
            <button onClick={stopRecording}
              className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center hover:bg-white/15 active:scale-95 transition-all">
              <div className="w-6 h-6 rounded-sm bg-white/80" />
            </button>
            <p className="text-white/20 text-[10px]">■ を押して停止</p>
          </div>
        </div>
      )}

      {/* ── REVIEWING ── */}
      {screen === "reviewing" && (
        <div className="min-h-screen flex flex-col px-4 pt-8 pb-20">
          <div className="flex items-center justify-between mb-10">
            <button onClick={() => setScreen("home")} className="text-white/30 hover:text-white/60 text-sm">← 戻る</button>
            <span className="text-[10px] tracking-widest uppercase text-white/25">{screenLabel}</span>
          </div>
          <div className="text-center mb-6">
            <h2 className="text-lg font-light text-white/60 leading-relaxed max-w-lg mx-auto">{question}</h2>
          </div>
          <div className="max-w-lg mx-auto w-full space-y-6">
            <div className="text-center">
              <p className="text-white/40 text-xs tracking-wider uppercase">
                {seconds > 0 ? `録音完了 — ${Math.floor(seconds / 60)}分${seconds % 60}秒` : "テキスト入力モード"}
              </p>
            </div>
            {!transcript.trim() && (
              <div className="bg-amber-500/[0.08] border border-amber-500/20 rounded-xl px-4 py-3">
                <p className="text-amber-300/80 text-xs leading-relaxed">💡 音声認識テキストがありません。話した内容を下のテキストエリアに入力してください。</p>
              </div>
            )}
            {error && (
              <div className="bg-red-500/[0.08] border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-red-300/80 text-xs">{error}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[11px] tracking-wider uppercase text-white/30">
                {!transcript.trim() ? "↓ 話した内容を入力してください" : "テキスト（編集可能）"}
              </label>
              <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)}
                autoFocus={!transcript.trim()}
                placeholder="話した内容をここに入力してください。例：私の強みはリーダーシップです。大学のゼミで..."
                className="w-full h-48 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white/80 text-sm leading-relaxed resize-none focus:outline-none focus:border-cyan-500/30 transition-colors placeholder:text-white/20" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setTranscript(""); setSeconds(0); setScreen("practice"); }}
                className="flex-1 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/40 text-sm hover:bg-white/[0.06] hover:text-white/60 transition-all">
                やり直す
              </button>
              <button onClick={analyze} disabled={!transcript.trim()}
                className={`flex-1 py-3 rounded-xl text-sm tracking-wider transition-all ${
                  transcript.trim()
                    ? "bg-gradient-to-r from-blue-500/80 to-cyan-500/80 text-white shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20"
                    : "bg-white/[0.04] text-white/20 cursor-not-allowed"
                }`}>
                AIに分析してもらう
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ANALYZING ── */}
      {screen === "analyzing" && (
        <div className="min-h-screen flex flex-col items-center justify-center px-4">
          <div className="relative w-16 h-16 mb-8">
            <div className="absolute inset-0 rounded-full border-2 border-white/5" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400/60 animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-blue-400/40 animate-spin"
              style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <p className="text-white/60 text-sm mb-2">{isDeepDive ? `深掘り${chain.length}回目を分析中...` : "分析中..."}</p>
          <p className="text-white/20 text-xs max-w-xs text-center leading-relaxed mt-6">
            {coachingTip.icon} {coachingTip.tip}
          </p>
        </div>
      )}

      {/* ── RESULT (extracted component) ── */}
      {screen === "result" && result && (
        <ResultScreen
          result={result}
          question={question}
          transcript={transcript}
          seconds={seconds}
          chain={chain}
          onDeepDive={startDeepDive}
          onHome={() => { resetDeepDive(); setScreen("home"); }}
          onRetry={() => {
            // Reset to original question, not the deep-dive followup
            setQuestion(rootQuestion);
            setTranscript("");
            setSeconds(0);
            resetDeepDive();
            setScreen("practice");
          }}
        />
      )}

      {/* ── FOLLOWUP GENERATING ── */}
      {screen === "followup-generating" && (
        <div className="min-h-screen flex flex-col items-center justify-center px-4">
          <div className="relative w-16 h-16 mb-8">
            <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-400/60 animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-fuchsia-400/40 animate-spin"
              style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <p className="text-white/60 text-sm mb-2">面接官が次の質問を考えています...</p>
          <p className="text-white/20 text-xs max-w-xs text-center leading-relaxed mt-4">
            🔍 深掘り {chain.length}回目 — あなたの回答をもとに追加質問を生成中
          </p>
        </div>
      )}

      {/* ── CHALLENGE GENERATING ── */}
      {screen === "challenge-generating" && (
        <div className="min-h-screen flex flex-col items-center justify-center px-4">
          <div className="relative w-16 h-16 mb-8">
            <div className="absolute inset-0 rounded-full border-2 border-amber-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-400/60 animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-orange-400/40 animate-spin"
              style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <p className="text-white/60 text-sm mb-2">お題を考えています...</p>
          <p className="text-white/20 text-xs max-w-xs text-center leading-relaxed mt-4">
            🎲 AIがあなたにぴったりのお題を生成中
          </p>
        </div>
      )}

      {/* ── PAYWALL ── */}
      {screen === "paywall" && (
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
                    setError("決済ページの取得に失敗しました");
                  }
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500/80 to-orange-500/80 text-white text-sm tracking-wider shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Proプランに登録する
              </button>
            </div>

            <button onClick={() => setScreen("home")}
              className="w-full text-center text-white/25 text-xs hover:text-white/50 transition-colors">
              ← ホームに戻る
            </button>
          </div>
        </div>
      )}

      {/* ── HISTORY ── */}
      {screen === "history" && (
        <div className="max-w-[520px] mx-auto px-4 pt-8 pb-20">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => setScreen("home")} className="text-white/30 hover:text-white/60 text-sm">← 戻る</button>
            <span className="text-[10px] tracking-widest uppercase text-white/25">練習履歴（{history.length}件）</span>
          </div>
          {history.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-white/30 text-sm mb-4">まだ練習履歴がありません</p>
              <button onClick={() => setScreen("home")} className="text-cyan-400/60 text-sm hover:text-cyan-400/80">
                練習を始める →
              </button>
            </div>
          ) : (
            <HistoryList entries={history} perPage={HISTORY_PER_PAGE} />
          )}
        </div>
      )}
    </div>
  );
}
