"use client";

interface ReviewingScreenProps {
  screenLabel: string;
  question: string;
  seconds: number;
  transcript: string;
  error: string | null;
  onTranscriptChange: (text: string) => void;
  onAnalyze: () => void;
  onRetry: () => void;
  onBack: () => void;
}

export function ReviewingScreen({
  screenLabel,
  question,
  seconds,
  transcript,
  error,
  onTranscriptChange,
  onAnalyze,
  onRetry,
  onBack,
}: ReviewingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col px-4 pt-8 pb-20">
      <div className="flex items-center justify-between mb-10">
        <button onClick={onBack} className="text-white/30 hover:text-white/60 text-sm">← 戻る</button>
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
          <textarea value={transcript} onChange={(e) => onTranscriptChange(e.target.value)}
            autoFocus={!transcript.trim()}
            placeholder="話した内容をここに入力してください。例：私の強みはリーダーシップです。大学のゼミで..."
            className="w-full h-48 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white/80 text-sm leading-relaxed resize-none focus:outline-none focus:border-cyan-500/30 transition-colors placeholder:text-white/20" />
        </div>
        <div className="flex gap-3">
          <button onClick={onRetry}
            className="flex-1 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/40 text-sm hover:bg-white/[0.06] hover:text-white/60 transition-all">
            やり直す
          </button>
          <button onClick={onAnalyze} disabled={!transcript.trim()}
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
  );
}
