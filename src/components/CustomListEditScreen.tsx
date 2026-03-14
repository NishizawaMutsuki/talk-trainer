"use client";

import { useState } from "react";
import type { CustomQuestionList } from "@/lib/types";

interface CustomListEditProps {
  list: CustomQuestionList | null; // null = 新規作成
  onSave: (list: CustomQuestionList) => void;
  onDelete?: () => void;
  onBack: () => void;
}

export function CustomListEditScreen({ list, onSave, onDelete, onBack }: CustomListEditProps) {
  const [name, setName] = useState(list?.name ?? "");
  const [questionsText, setQuestionsText] = useState(
    list?.questions.join("\n") ?? ""
  );

  const questions = questionsText
    .split("\n")
    .map(q => q.trim())
    .filter(q => q.length > 0);

  const canSave = name.trim().length > 0 && questions.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: list?.id ?? crypto.randomUUID(),
      name: name.trim(),
      questions,
      createdAt: list?.createdAt ?? new Date().toISOString(),
    });
  };

  return (
    <div className="max-w-[520px] mx-auto px-4 pt-8 pb-20">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-white/30 hover:text-white/60 text-sm">← 戻る</button>
        <span className="text-[10px] tracking-widest uppercase text-white/25">
          {list ? "リスト編集" : "新規リスト"}
        </span>
      </div>

      {/* リスト名 */}
      <div className="mb-6">
        <label className="text-white/40 text-[11px] tracking-wider uppercase block mb-2">
          リスト名
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="例: ソフトバンク 二次面接"
          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/80 text-sm placeholder:text-white/20 focus:outline-none focus:border-cyan-500/30 transition-colors"
        />
      </div>

      {/* 質問リスト */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <label className="text-white/40 text-[11px] tracking-wider uppercase">
            質問リスト
          </label>
          <span className="text-white/25 text-[10px]">
            {questions.length}問
          </span>
        </div>
        <textarea
          value={questionsText}
          onChange={e => setQuestionsText(e.target.value)}
          placeholder={"自己PRをしてください\nなぜ弊社を志望しましたか？\nあなたの強みと弱みを教えてください\n\n（1行に1つの質問を入力）"}
          rows={12}
          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/80 text-sm placeholder:text-white/20 focus:outline-none focus:border-cyan-500/30 transition-colors resize-none leading-relaxed"
        />
        <p className="text-white/20 text-[10px] mt-1.5">
          1行に1つの質問を入力してください。改行で区切ります。
        </p>
      </div>

      {/* プレビュー */}
      {questions.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 mb-6">
          <p className="text-white/40 text-[11px] tracking-wider uppercase mb-3">プレビュー</p>
          <div className="space-y-2">
            {questions.map((q, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="text-white/20 shrink-0">{i + 1}.</span>
                <span className="text-white/60">{q}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 保存ボタン */}
      <button
        onClick={handleSave}
        disabled={!canSave}
        className={`w-full py-4 rounded-2xl text-sm tracking-wider transition-all ${
          canSave
            ? "bg-gradient-to-r from-blue-500/80 to-cyan-500/80 text-white shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20"
            : "bg-white/[0.04] text-white/20 cursor-not-allowed"
        }`}
      >
        {list ? "保存する" : "リストを作成する"}
      </button>

      {/* 削除ボタン */}
      {list && onDelete && (
        <button
          onClick={onDelete}
          className="w-full mt-3 py-3 rounded-xl text-xs text-red-400/50 hover:text-red-400/80 hover:bg-red-500/[0.06] transition-all"
        >
          このリストを削除する
        </button>
      )}
    </div>
  );
}
