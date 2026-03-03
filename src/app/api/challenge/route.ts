import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callGemini, GeminiError, type GeminiModel } from "@/lib/gemini";
import { getUserByGoogleId } from "@/lib/db";
import type { ChallengeInfo } from "@/lib/types";

const CHALLENGE_PROMPT = `あなたは即興スピーチのコーチです。
「1分チャレンジ」用のお題を1つ生成してください。

【お題のルール】
- 日常的・身近なトピックで、誰でも1分間話せるもの
- 構造的に説明する練習になるお題（PREP法やWhat-So What-Now Whatで答えやすい）
- 面接の質問ではない。カジュアルで楽しいお題にする
- 以下のカテゴリからランダムに選ぶ：
  1. 作り方・手順の説明：「カレーの作り方を説明してください」「引っ越しの手順を教えてください」
  2. 解決策の提案：「朝起きられない問題の解決策を説明してください」「部屋が片付かない悩みへのアドバイスをしてください」
  3. おすすめ紹介：「おすすめの休日の過ごし方を紹介してください」「初心者におすすめの運動を紹介してください」
  4. 比較・意見：「都会と田舎、住むならどちらがいいか説明してください」「紙の本と電子書籍、どちらがおすすめか教えてください」
  5. 仕組みの説明：「なぜ空は青いのか説明してください」「コンビニが便利な理由を3つ挙げてください」
  6. 提案・プレゼン：「新しい祝日を1つ作るなら何にするか提案してください」「理想の学校給食メニューを提案してください」

{past_topics}

以下のJSON形式で厳密に回答してください。JSON以外のテキストは一切含めないでください。
すべてのフィールドに必ず具体的な値を入れてください。

{
  "question": "<お題（1文。「〜してください」で終わる丁寧な指示形）>",
  "category_hint": "<上記6カテゴリのうちどれか>",
  "recommended_framework": "<PREP/What-So What-Now What/Problem-Solution-Benefit のいずれか>",
  "difficulty": "<easy/medium/hard>",
  "tip": "<このお題に答えるコツを1文で>"
}`;

function validateChallenge(data: unknown): data is ChallengeInfo {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.question === "string" && d.question.trim().length > 0 &&
    typeof d.category_hint === "string" && d.category_hint.trim().length > 0 &&
    typeof d.recommended_framework === "string" && d.recommended_framework.trim().length > 0 &&
    typeof d.tip === "string" && d.tip.trim().length > 0
  );
}

export async function POST(req: NextRequest) {
  try {
    // ── 認証チェック ──
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const { pastTopics } = await req.json().catch(() => ({ pastTopics: [] }));

    const pastSection = Array.isArray(pastTopics) && pastTopics.length > 0
      ? `【過去に出したお題（これらと被らないようにすること）】\n${pastTopics.map((t: string) => `- ${t}`).join("\n")}`
      : "";

    const prompt = CHALLENGE_PROMPT.replace("{past_topics}", pastSection);

    // Select model based on user plan
    const googleId = (session.user as Record<string, unknown>).googleId as string;
    const user = await getUserByGoogleId(googleId);
    const model: GeminiModel = user?.plan === "pro" ? "pro" : "flash";

    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await callGemini({ prompt, temperature: 0.9, model });

      if (validateChallenge(result)) {
        return NextResponse.json(result);
      }

      console.warn(`Challenge validation failed (attempt ${attempt + 1}):`, JSON.stringify(result).slice(0, 300));
    }

    return NextResponse.json(
      { error: "お題の生成に失敗しました。もう一度お試しください" },
      { status: 502 }
    );
  } catch (err) {
    console.error("Challenge generation error:", err);
    const status = err instanceof GeminiError ? err.status : 500;
    const message = err instanceof Error ? err.message : "お題の生成でエラーが発生しました";
    return NextResponse.json({ error: message }, { status });
  }
}
