"use client";

import { FRAMEWORKS } from "@/lib/constants";
import { Timer, WaveformVisualizer } from "@/components/ui";

interface RecordingScreenProps {
  screenLabel: string;
  question: string;
  seconds: number;
  speechStatus: "idle" | "listening" | "unavailable" | "error";
  transcript: string;
  recommendedFrameworks: string[];
  onStop: () => void;
  onCancel: () => void;
}

export function RecordingScreen({
  screenLabel,
  question,
  seconds,
  speechStatus,
  transcript,
  recommendedFrameworks,
  onStop,
  onCancel,
}: RecordingScreenProps) {
  const isManualInput = speechStatus === "unavailable" || speechStatus === "error";

  return (
    <div className="min-h-screen flex flex-col px-4 pt-8 pb-20">
      <div className="flex items-center justify-between mb-10">
        <button onClick={onCancel} className="text-white/30 hover:text-white/60 text-sm">← やめる</button>
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
        <button onClick={onStop}
          className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center hover:bg-white/15 active:scale-95 transition-all">
          <div className="w-6 h-6 rounded-sm bg-white/80" />
        </button>
        <p className="text-white/20 text-[10px]">■ を押して停止</p>
      </div>
    </div>
  );
}
