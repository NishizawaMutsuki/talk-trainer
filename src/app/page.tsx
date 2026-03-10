"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSession, signIn } from "next-auth/react";

// ─── Shared modules ─────────────────────────────────────────────
import type { Screen, AnalysisResult, HistoryEntry, ChainTurn, FollowupInfo, ChallengeInfo, UserStatus, AIModelKey } from "@/lib/types";
import {
  FRAMEWORKS,
  COACHING_TIPS,
  HISTORY_PER_PAGE,
  CHALLENGE_CATEGORY,
  DAILY_GOAL_DEFAULT,
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
import { HistoryList } from "@/components/ui";
import { HomeScreen } from "@/components/HomeScreen";
import { PracticeScreen } from "@/components/PracticeScreen";
import { RecordingScreen } from "@/components/RecordingScreen";
import { ReviewingScreen } from "@/components/ReviewingScreen";
import { DashboardScreen } from "@/components/DashboardScreen";
import { ResultScreen } from "@/components/ResultScreen";
import { PaywallScreen } from "@/components/PaywallScreen";
import { LoadingScreen } from "@/components/LoadingScreen";

// ─── Main App ───────────────────────────────────────────────────

export default function TalkTrainer() {
  const { status: authStatus } = useSession();
  const [userStatus, setUserStatus] = useState<UserStatus>({ loggedIn: false });
  const [screen, setScreen] = useState<Screen>("home");
  const [category, setCategory] = useState("");
  const [question, setQuestion] = useState("");
  const [rootQuestion, setRootQuestion] = useState("");
  const [transcript, setTranscript] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [speechStatus, setSpeechStatus] = useState<"idle" | "listening" | "unavailable" | "error">("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dailyGoal, setDailyGoal] = useState(DAILY_GOAL_DEFAULT);
  const [selectedModel, setSelectedModel] = useState<AIModelKey>("gemini-flash");

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
    if (followupInfo?.recommended_framework) {
      const key = fwNameToKey(followupInfo.recommended_framework);
      const fallback = getRecommendedFrameworks(question, category);
      if (key) return [key, ...fallback.filter(f => f !== key)].slice(0, 2);
    }
    if (challengeInfo?.recommended_framework) {
      const key = fwNameToKey(challengeInfo.recommended_framework);
      if (key) return [key, ...Object.keys(FRAMEWORKS).filter(f => f !== key).slice(0, 1)];
    }
    return getRecommendedFrameworks(question, category);
  }, [question, category, followupInfo, challengeInfo]);

  const isDeepDive = chain.length > 0;

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
    if (!userStatus.loggedIn) {
      signIn("google");
      return;
    }
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
      setScreen("challenge-generating");
      try {
        const pastTopics = history
          .filter(h => h.category === CHALLENGE_CATEGORY)
          .map(h => h.question)
          .slice(0, 30);

        const res = await fetch("/api/challenge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pastTopics, aiModel: selectedModel }),
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
      const q = pickQuestion(cat, history);
      setQuestion(q);
      setRootQuestion(q);
      setScreen("practice");
    }
  }, [history, resetDeepDive, userStatus, selectedModel]);

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
    const pendingChain = [...chain, newTurn];
    setScreen("followup-generating");

    try {
      const res = await fetch("/api/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          chain: pendingChain.map(t => ({ question: t.question, answer: t.answer })),
          aiModel: selectedModel,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data: FollowupInfo = await res.json();

      if (!data.followup_question?.trim()) {
        throw new Error("質問が生成されませんでした");
      }

      setChain(pendingChain);
      setFollowupInfo(data);
      setQuestion(data.followup_question);
      setTranscript("");
      setSeconds(0);
      setResult(null);
      setError(null);
      setScreen("practice");
    } catch (e) {
      setError("深掘り質問の生成に失敗しました: " + (e instanceof Error ? e.message : ""));
      setScreen("result");
    }
  }, [result, transcript, question, seconds, chain, category, selectedModel]);

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
  const accumulatedRef = useRef("");

  const startRecording = useCallback(async () => {
    setScreen("recording");
    setSeconds(0);
    setTranscript("");
    transcriptRef.current = "";
    accumulatedRef.current = "";
    setSpeechStatus("idle");

    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);

    // マイク許可を先に取得（モバイルで必要）
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      try {
        const mr = new MediaRecorder(stream);
        mr.start();
        mediaRecorderRef.current = mr;
      } catch {}
    } catch {}

    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        const startNewSession = () => {
          const rec = new SR();
          rec.lang = "ja-JP";
          rec.continuous = true;
          rec.interimResults = true;

          rec.onstart = () => setSpeechStatus("listening");

          rec.onresult = (e: SpeechRecognitionEvent) => {
            let final = "", interim = "";
            for (let i = 0; i < e.results.length; i++) {
              if (e.results[i].isFinal) final += e.results[i][0].transcript;
              else interim += e.results[i][0].transcript;
            }
            // 前セッションの蓄積に加算
            const fullFinal = accumulatedRef.current + final;
            transcriptRef.current = fullFinal;
            setTranscript(fullFinal + interim);
          };

          rec.onerror = (e: SpeechRecognitionErrorEvent) => {
            // モバイルで頻発する無害なエラーは無視
            if (e.error === "no-speech" || e.error === "aborted") return;
            if (e.error === "not-allowed" || e.error === "service-not-allowed") {
              setSpeechStatus("unavailable");
            } else {
              setSpeechStatus("error");
            }
          };

          rec.onend = () => {
            // 現セッションの確定テキストを蓄積
            accumulatedRef.current = transcriptRef.current;
            // 録音中なら新しいインスタンスで再開（iOSでは同一インスタンスの再起動が失敗するため）
            if (timerRef.current) {
              try {
                const newRec = startNewSession();
                newRec.start();
                recognitionRef.current = newRec;
              } catch {
                setSpeechStatus("error");
              }
            }
          };

          return rec;
        };

        const recognition = startNewSession();
        recognition.start();
        recognitionRef.current = recognition;
      } else {
        setSpeechStatus("unavailable");
      }
    } catch { setSpeechStatus("unavailable"); }
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
          aiModel: selectedModel,
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
      await fetchUserStatus();
      setScreen("result");
    } catch (e) {
      setError("分析エラー: " + (e instanceof Error ? e.message : "もう一度お試しください"));
      setScreen("reviewing");
    }
  }, [transcript, recommendedFrameworks, question, category, seconds, saveHistory, chain, rootQuestion, fetchUserStatus, selectedModel]);

  // ── Screen label helper ──
  const screenLabel = isDeepDive ? `${category} — 深掘り ${chain.length}回目` : category;

  // ── Render ──
  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 20% 0%, #0f172a 0%, #030712 50%, #000 100%)" }}>

      {screen === "home" && (
        <HomeScreen
          userStatus={userStatus}
          history={history}
          error={error}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          onClearError={() => setError(null)}
          onStartPractice={startPractice}
          onNavigate={setScreen}
        />
      )}

      {screen === "dashboard" && (
        <DashboardScreen
          history={history}
          dailyGoal={dailyGoal}
          onGoalChange={updateDailyGoal}
          onBack={() => setScreen("home")}
          onStartPractice={() => setScreen("home")}
        />
      )}

      {screen === "practice" && (
        <PracticeScreen
          screenLabel={screenLabel}
          question={question}
          isDeepDive={isDeepDive}
          chain={chain}
          followupInfo={followupInfo}
          challengeInfo={challengeInfo}
          coachingTip={coachingTip}
          recommendedFrameworks={recommendedFrameworks}
          onStartRecording={startRecording}
          onTextInput={() => setScreen("reviewing")}
          onBack={() => setScreen("home")}
        />
      )}

      {screen === "recording" && (
        <RecordingScreen
          screenLabel={screenLabel}
          question={question}
          seconds={seconds}
          speechStatus={speechStatus}
          transcript={transcript}
          recommendedFrameworks={recommendedFrameworks}
          onStop={stopRecording}
          onCancel={() => { stopRecording(); setScreen("home"); }}
        />
      )}

      {screen === "reviewing" && (
        <ReviewingScreen
          screenLabel={screenLabel}
          question={question}
          seconds={seconds}
          transcript={transcript}
          error={error}
          onTranscriptChange={setTranscript}
          onAnalyze={analyze}
          onRetry={() => { setTranscript(""); setSeconds(0); setScreen("practice"); }}
          onBack={() => setScreen("home")}
        />
      )}

      {screen === "analyzing" && (
        <LoadingScreen variant="analyzing" chainLength={chain.length} isDeepDive={isDeepDive} coachingTip={coachingTip} />
      )}

      {screen === "result" && result && (
        <ResultScreen
          result={result}
          question={question}
          transcript={transcript}
          seconds={seconds}
          chain={chain}
          isChallenge={category === CHALLENGE_CATEGORY}
          onDeepDive={startDeepDive}
          onNextChallenge={() => startPractice(CHALLENGE_CATEGORY)}
          onHome={() => { resetDeepDive(); setScreen("home"); }}
          onRetry={() => {
            setQuestion(rootQuestion);
            setTranscript("");
            setSeconds(0);
            resetDeepDive();
            setScreen("practice");
          }}
        />
      )}

      {screen === "followup-generating" && (
        <LoadingScreen variant="followup" chainLength={chain.length} isDeepDive={isDeepDive} coachingTip={coachingTip} />
      )}

      {screen === "challenge-generating" && (
        <LoadingScreen variant="challenge" chainLength={chain.length} isDeepDive={isDeepDive} coachingTip={coachingTip} />
      )}

      {screen === "paywall" && (
        <PaywallScreen
          userStatus={userStatus}
          onError={(msg) => setError(msg)}
          onBack={() => setScreen("home")}
        />
      )}

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
