import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callAI, AIError, type AIModelKey, AI_MODELS } from "@/lib/ai-router";
import { getUserByGoogleId } from "@/lib/db";
import type { HabitAnalysis } from "@/lib/types";

// ─── Prompt ──────────────────────────────────────────────────────

const HABITS_PROMPT = `あなたは「伝わる話し方」の専門家です。
Matt Abrahams（Think Fast, Talk Smart）、Carmine Gallo（Talk Like TED）、Chip Heath（Made to Stick）のメソッドを統合し、
この人の「話し方の癖」を本気で診断してください。

あなたの仕事は「褒めること」ではなく「この人が話し上手になるために、今もっとも邪魔している癖を特定すること」です。
厳しく、しかし建設的に診断してください。

【過去の練習データ】
以下はこの人が実際に話した回答と、それに対する改善点のフィードバックです。

{sessions}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【診断の7軸】

以下の7つの観点で、この人の「繰り返し出ている癖」を特定してください。
1回だけのミスではなく、複数の回答に共通して現れるパターンを重視してください。

1. 構造力（結論ファースト）
   - 最初の1文で結論を言えているか？ 前置きや経緯説明から入っていないか？
   - PREP等のフレームワークが「型」として身についているか、毎回バラバラか？
   - 話の「地図」を最初に示せているか？

2. 具体性（数字・固有名詞・エピソード）
   - 「頑張りました」「工夫しました」で止まっていないか？
   - 数字（何人、何%、何ヶ月）を使えているか？
   - 抽象的な自己評価ではなく、第三者が検証できる事実を語れているか？

3. 時間配分（話の膨らみ方）
   - 背景説明が長すぎて本題に辿り着かないパターンはないか？
   - 「行動」パートに具体性があるのに「結果」パートが薄い、などの偏りはないか？
   - 1分以内に話をまとめる力があるか？

4. 聴き手意識（質問への応答精度）
   - 聞かれたことに真正面から答えているか？ 関連するが微妙に違う話をしていないか？
   - 面接官が「で、結局何が言いたいの？」と思うような回答になっていないか？
   - 相手の知りたいこと vs 自分の言いたいことの区別ができているか？

5. 論理の飛躍（話の繋がり）
   - A→B→Cの因果関係が明確か？ いきなりCに飛んでいないか？
   - 「なので」「その結果」などの接続が論理的に正しいか？
   - 聞き手が「なぜそうなった？」と感じるギャップはないか？

6. 言い切り力（自信と明確さ）
   - 「〜かなと思います」「〜な感じです」のような曖昧な語尾が多くないか？
   - 自分の成果を自分の手柄として語れているか？ 過度に謙遜していないか？
   - 断定すべき場面で断定できているか？

7. インパクト（記憶に残る力）
   - 面接官が帰りの電車で思い出せるような「一言」「場面」があるか？
   - 感情や臨場感のある描写があるか？ 事実の羅列で終わっていないか？
   - 「この人ならでは」のユニークな視点やエピソードがあるか？

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【出力形式】

以下のJSON形式で厳密に回答してください。JSON以外のテキストは一切含めないでください。

{
  "dimensions": [
    {
      "dimension": "<軸の名前（上記7つのいずれか）>",
      "score": <1-10の整数。5が平均、7以上は明確な強み、3以下は要重点改善>,
      "habit": "<この人の具体的な癖を1文で。「〜する傾向がある」の形式>",
      "evidence": "<実際の回答から引用した証拠。「第N回の回答で『...』と述べており〜」の形式>",
      "exercise": "<この癖を直すための具体的な練習法を1文で。「次の練習では〜してみてください」の形式>"
    }
  ],
  "biggestStrength": "<7軸の中でこの人の最大の武器を1文で。面接で活かせる表現にする>",
  "biggestHabit": "<最も伝わりにくさの原因になっている癖を1文で。改善インパクトが最大のもの>",
  "nextFocus": "<次の10回の練習で意識すべき「たった1つのこと」を具体的に>",
  "overallImpression": "<面接官がこの人の話を聞いた時の第一印象を1文で。「〜という印象を受ける話し方」の形式>"
}

【重要な注意】
- dimensions配列は必ず7要素にすること（上記7軸すべて）
- evidenceは必ず実際の回答テキストから引用すること。捏造しない
- exerciseは「意識する」「気をつける」のような曖昧なものではなく、具体的な行動指示にすること
- scoreは甘くつけない。本当に優れている軸だけ7以上にする
- biggestHabitは最もスコアの低い軸から選ぶこと`;

// ─── Validation ──────────────────────────────────────────────────

function validateHabits(data: unknown): data is HabitAnalysis {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    Array.isArray(d.dimensions) &&
    d.dimensions.length === 7 &&
    d.dimensions.every((dim: unknown) => {
      if (!dim || typeof dim !== "object") return false;
      const dd = dim as Record<string, unknown>;
      return (
        typeof dd.dimension === "string" &&
        typeof dd.score === "number" && dd.score >= 1 && dd.score <= 10 &&
        typeof dd.habit === "string" && dd.habit.trim().length > 0 &&
        typeof dd.evidence === "string" &&
        typeof dd.exercise === "string"
      );
    }) &&
    typeof d.biggestStrength === "string" && d.biggestStrength.trim().length > 0 &&
    typeof d.biggestHabit === "string" && d.biggestHabit.trim().length > 0 &&
    typeof d.nextFocus === "string" && d.nextFocus.trim().length > 0 &&
    typeof d.overallImpression === "string" && d.overallImpression.trim().length > 0
  );
}

// ─── Handler ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }
    const googleId = (session.user as Record<string, unknown>).googleId as string;
    const role = (session.user as Record<string, unknown>).role as string | undefined;
    const isAdmin = role === "admin";
    const user = await getUserByGoogleId(googleId);
    const isPro = user?.plan === "pro" || isAdmin;

    const { sessions, aiModel: requestedModel } = await req.json().catch(() => ({ sessions: [], aiModel: undefined }));

    if (!Array.isArray(sessions) || sessions.length < 5) {
      return NextResponse.json({ error: "診断には最低5回の練習データが必要です" }, { status: 400 });
    }

    // セッションデータを整形
    const sessionText = sessions
      .slice(0, 15)
      .map((s: { question: string; answer: string; improvements?: string[]; score?: number }, i: number) => {
        const impText = s.improvements?.length ? `  改善点: ${s.improvements.join(" / ")}` : "";
        const scoreText = s.score ? `  スコア: ${s.score}/10` : "";
        return `--- 第${i + 1}回 ---\n質問: ${String(s.question).slice(0, 200)}\n回答: ${String(s.answer).slice(0, 800)}${scoreText}${impText}`;
      })
      .join("\n\n");

    const prompt = HABITS_PROMPT.replace("{sessions}", sessionText);

    let selectedModel: AIModelKey = isPro ? "gemini-pro" : "gemini-flash";
    if (requestedModel && AI_MODELS[requestedModel as AIModelKey]) {
      const requested = requestedModel as AIModelKey;
      const tier = AI_MODELS[requested].tier;
      if (tier === "free" || isPro) {
        selectedModel = requested;
      }
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await callAI({ prompt, temperature: 0.3, model: selectedModel });

      if (validateHabits(result)) {
        const analysis: HabitAnalysis = {
          ...(result as HabitAnalysis),
          analyzedAt: new Date().toISOString(),
          sampleCount: sessions.length,
        };
        return NextResponse.json(analysis);
      }

      console.warn(`Habits validation failed (attempt ${attempt + 1}):`, JSON.stringify(result).slice(0, 300));
    }

    return NextResponse.json(
      { error: "癖診断の生成に失敗しました。もう一度お試しください" },
      { status: 502 }
    );
  } catch (err) {
    console.error("Habits analysis error:", err);
    const status = err instanceof AIError ? err.status : 500;
    const message = err instanceof AIError ? err.message : "癖診断でエラーが発生しました";
    return NextResponse.json({ error: message }, { status });
  }
}
