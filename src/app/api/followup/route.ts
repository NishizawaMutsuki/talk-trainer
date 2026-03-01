import { NextRequest, NextResponse } from "next/server";
import { callGemini, GeminiError } from "@/lib/gemini";
import { QUESTIONS } from "@/lib/constants";
import type { FollowupInfo } from "@/lib/types";

// ── Mode A: Pick from predefined list ───────────────────────────
const PICK_PROMPT = `あなたは日本の大手企業の面接官です。
候補者の回答を聞いて、次に聞くべき深掘り質問を【定義済みリスト】から1つ選んでください。

【面接カテゴリ】
{category}

【会話の流れ】
{conversation}

【定義済み深掘り質問リスト（この中から1つ選ぶこと）】
{question_list}

【ルール】
- 上記リストの中から、候補者の直近の回答に最も関連する質問を1つ選ぶ
- followup_question には、リストの質問文をそのまま（一字一句変えずに）コピーすること
- 候補者の回答で「曖昧な部分」「具体性が足りない部分」に最も関連するものを優先する

以下のJSON形式で厳密に回答してください。JSON以外のテキストは一切含めないでください。

{
  "followup_question": "<リストから選んだ質問文をそのままコピー>",
  "intent": "<この質問で何を見極めたいのか（面接官の意図）>",
  "recommended_framework": "<回答に適したフレームワーク名: PREP/STAR/What-So What-Now What/Problem-Solution-Benefit/Past-Present-Future>",
  "difficulty": "<easy/medium/hard>",
  "tip": "<この深掘り質問に対する回答のコツを1文で>"
}`;

// ── Mode B: Generate freely ─────────────────────────────────────
const GENERATE_PROMPT = `あなたは日本の大手企業の面接官です。
候補者の回答を聞いた上で、面接官として自然な「深掘り質問」を1つ生成してください。

【面接カテゴリ】
{category}

【会話の流れ】
{conversation}

以下のJSON形式で厳密に回答してください。JSON以外のテキストは一切含めないでください。
すべてのフィールドに必ず具体的な値を入れてください。空文字列は不可です。

{
  "followup_question": "<深掘り質問（1文）>",
  "intent": "<この質問で何を見極めたいのか（面接官の意図）>",
  "recommended_framework": "<回答に適したフレームワーク名: PREP/STAR/What-So What-Now What/Problem-Solution-Benefit/Past-Present-Future>",
  "difficulty": "<easy/medium/hard>",
  "tip": "<この深掘り質問に対する回答のコツを1文で>"
}

【深掘り質問の方針】
- 候補者の回答の中で「曖昧な部分」「具体性が足りない部分」「もっと聞きたい部分」を狙う
- 実際の面接で面接官が聞きそうな自然な質問にする
- 以下のパターンを使い分ける：
  1. 具体化：「具体的にはどういうことですか？」「例えばどんな場面で？」
  2. 深掘り：「なぜそう思ったのですか？」「その判断に至った経緯は？」
  3. 反省・学び：「振り返ってみて、もっとこうすればよかったと思うことは？」
  4. 再現性：「その経験を弊社でどう活かせると思いますか？」
  5. 逆の視点：「反対に、うまくいかなかったことは？」「周りはどう思っていた？」
- 前の深掘り質問と重複しないこと
- 圧迫面接にならないよう、好奇心ベースの質問にする`;

/** Validate that required fields are non-empty strings */
function validateFollowup(data: unknown): data is FollowupInfo {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.followup_question === "string" && d.followup_question.trim().length > 0 &&
    typeof d.intent === "string" && d.intent.trim().length > 0 &&
    typeof d.recommended_framework === "string" && d.recommended_framework.trim().length > 0 &&
    typeof d.tip === "string" && d.tip.trim().length > 0
  );
}

export async function POST(req: NextRequest) {
  try {
    const { category, chain } = await req.json();

    if (!chain?.length) {
      return NextResponse.json({ error: "会話チェーンが必要です" }, { status: 400 });
    }

    const conversation = chain
      .map(
        (turn: { question: string; answer: string }, i: number) =>
          `【${i === 0 ? "元の質問" : `深掘り${i}`}】${turn.question}\n【回答】${turn.answer}`
      )
      .join("\n\n");

    // Determine unused predefined followup questions
    const catQuestions = QUESTIONS[category] ?? [];
    const followups = catQuestions.filter(q => !q.standalone).map(q => q.text);
    const askedQuestions = new Set(chain.map((t: { question: string }) => t.question));
    const unusedFollowups = followups.filter(q => !askedQuestions.has(q));

    // Mode A (pick) when predefined questions remain, Mode B (generate) when exhausted
    const usePick = unusedFollowups.length > 0;
    const prompt = usePick
      ? PICK_PROMPT
          .replace("{category}", category || "一般")
          .replace("{conversation}", conversation)
          .replace("{question_list}", unusedFollowups.map((q, i) => `${i + 1}. ${q}`).join("\n"))
      : GENERATE_PROMPT
          .replace("{category}", category || "一般")
          .replace("{conversation}", conversation);

    // Lower temperature for pick mode (just selecting), higher for generation
    const temperature = usePick ? 0.3 : 0.7;

    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await callGemini({ prompt, temperature });

      if (!validateFollowup(result)) {
        console.warn(`Followup validation failed (attempt ${attempt + 1}):`, JSON.stringify(result).slice(0, 300));
        continue;
      }

      // In pick mode, verify the AI actually used a predefined question
      const followup = result as FollowupInfo;
      if (usePick && !unusedFollowups.includes(followup.followup_question)) {
        console.warn(`AI ignored predefined list, got: "${followup.followup_question}"`);
        // Force-select the first unused question and keep AI's intent/tip
        followup.followup_question = unusedFollowups[0];
      }

      return NextResponse.json(followup);
    }

    return NextResponse.json(
      { error: "深掘り質問の生成に失敗しました。もう一度お試しください" },
      { status: 502 }
    );
  } catch (err) {
    console.error("Followup generation error:", err);
    const status = err instanceof GeminiError ? err.status : 500;
    const message = err instanceof Error ? err.message : "深掘り質問の生成でエラーが発生しました";
    return NextResponse.json({ error: message }, { status });
  }
}
