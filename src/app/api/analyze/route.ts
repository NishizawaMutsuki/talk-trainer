import { NextRequest, NextResponse } from "next/server";
import { callGemini, GeminiError } from "@/lib/gemini";
import { getInsightsForCategory } from "@/lib/knowledge";
import type { AnalysisResult } from "@/lib/types";

const ANALYSIS_PROMPT = `あなたはMatt Abrahams著「Think Fast, Talk Smart」のメソッドを熟知した面接対策コーチです。
以下の面接回答を、複数のフレームワークの観点から分析してください。

【面接質問】
{question}

【推奨フレームワーク】
{recommended_framework}

【回答テキスト】
{answer}
{knowledge_section}
以下のJSON形式で厳密に回答してください。JSON以外のテキストは一切含めないでください。

{
  "structure_score": <1-10の整数>,
  "specificity_score": <1-10の整数>,
  "time_balance_score": <1-10の整数>,
  "overall_score": <1-10の整数>,
  "detected_framework": "<検出されたフレームワーク名。PREP/STAR/What-So What-Now What/Problem-Solution-Benefit/Past-Present-Future/なし>",
  "recommended_framework": "<この質問に最適なフレームワーク名>",
  "framework_match": <推奨フレームワークとの一致度 1-10>,
  "segments": [
    {
      "label": "<セグメントラベル>",
      "text": "<該当テキスト（原文から抜粋）>",
      "quality": "<good/ok/needs_improvement>"
    }
  ],
  "strengths": ["<良い点1>", "<良い点2>"],
  "improvements": ["<改善点1>", "<改善点2>", "<改善点3>"],
  "rewrite_suggestion": "<回答テキストとほぼ同じ長さ・同じ内容で、推奨フレームワークの構造に組み替えた改善例。利用者のエピソードや具体例をそのまま活かしつつ、構造だけを整理し直す。必ず回答テキストと同等のボリュームで書くこと>",
  "one_line_feedback": "<一言フィードバック>",
  "coach_tip": "<面接官の実際の評価基準を踏まえた具体的アドバイス1つ。【面接官の実際の評価基準】が提供されている場合は、回答内容に最も関連する基準を1つ選び、その面接官の視点から「こう言い換えると面接官の評価が変わる」レベルの具体的な助言を書く。提供されていない場合はMatt Abrahamのメソッド（聴き手視点・構造化・不安管理）に基づくアドバイスを書く>",
  "perceived_abilities": [
    {
      "ability": "<面接官が感じ取る能力・資質の名前（例: 主体性、論理的思考力、チームワーク、課題発見力、粘り強さ、コミュニケーション力、リーダーシップ、分析力、行動力、柔軟性、目標達成意欲、巻き込み力など）>",
      "evidence": "<回答のどの部分からその能力が感じられたか、1文で具体的に>",
      "level": "<strong（明確に伝わった）/ moderate（やや伝わった）/ weak（意図は感じるが根拠が弱い）>"
    }
  ]
}

【セグメントラベルの種類】
PREP法: 結論 / 理由 / 具体例 / まとめ
STAR法: 状況 / 課題 / 行動 / 結果
What-So What-Now What法: What（事実） / So What（意味） / Now What（次の行動）
Problem-Solution-Benefit法: 問題提起 / 解決策 / 効果
Past-Present-Future法: 過去 / 現在 / 未来
その他: その他

【評価基準】
- structure_score: フレームワークの構造に沿っているか
- specificity_score: 数字・固有名詞・具体的エピソードが含まれているか
- time_balance_score: 各パートのバランスが適切か
- framework_match: 推奨フレームワークの要素がどれだけ含まれているか
- coach_tip: 「聴き手が何を知りたいか」から逆算したアドバイスを1つ提示
- perceived_abilities: 面接官がこの回答を聞いて「この人にはこういう力がありそうだ」と感じる能力を2〜5個抽出する。回答に明示的に書かれていなくても、行間から読み取れる能力も含める。levelは厳密に：strongは具体的エピソード・数字で裏付けられている場合のみ、moderateは言及はあるが証拠が薄い場合、weakは匂わせ程度の場合

【重要】
- Matt Abrahamの教え「聴き手視点で考える（"What does the audience need to hear?"）」を最重視
- 構造は話の地図。迷子にならないための道具として評価する
- 完璧を求めず、1%の改善を褒める姿勢でフィードバックする
- rewrite_suggestionは最重要項目：利用者が話した内容・エピソード・数字をそのまま使い、フレームワークの構造に沿って並べ替える。短く要約せず、元の回答と同じくらいの分量で書き直すこと
- 【面接官の実際の評価基準】が提供されている場合、improvementsとcoach_tipにその視点を自然に取り込むこと。ただし回答内容に関連するものだけを使い、全てを無理に適用しないこと
- coach_tipでは可能な限り「〇〇という面接官は〜と語っている」のように具体的な出典を示し、抽象的な助言を避けること`;

function buildChainContext(chain?: { question: string; answer: string }[]): string {
  if (!chain?.length) return "";
  return "\n\n【深掘りの文脈（これまでの会話）】\n" +
    chain.map((t, i) => `Q${i + 1}: ${t.question}\nA${i + 1}: ${t.answer}`).join("\n\n") +
    "\n\n※上記の文脈を踏まえた深掘り質問への回答を分析してください。前の回答との一貫性や、より深い洞察が示されているかも評価に含めてください。\n";
}

function validateAnalysis(data: unknown): data is AnalysisResult {
  if (!data || typeof data !== "object") return false;
  const r = data as Record<string, unknown>;
  return (
    typeof r.overall_score === "number" && r.overall_score >= 1 && r.overall_score <= 10 &&
    Array.isArray(r.segments) && r.segments.length > 0 &&
    typeof r.one_line_feedback === "string" && r.one_line_feedback.trim().length > 0 &&
    typeof r.rewrite_suggestion === "string"
  );
}

export async function POST(req: NextRequest) {
  try {
    const { question, answer, recommended_framework, chain, category } = await req.json();

    if (!question || !answer) {
      return NextResponse.json({ error: "question と answer は必須です" }, { status: 400 });
    }

    // Select relevant knowledge insights for this category
    const knowledgeSection = getInsightsForCategory(category || "");

    const prompt = ANALYSIS_PROMPT
      .replace("{question}", question)
      .replace("{answer}", answer)
      .replace("{recommended_framework}", recommended_framework || "自動検出")
      .replace("{knowledge_section}", knowledgeSection)
      + buildChainContext(chain);

    // Retry once on validation failure
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await callGemini({ prompt, temperature: 0.3 });

      if (validateAnalysis(result)) {
        return NextResponse.json(result);
      }

      console.warn(`Analysis validation failed (attempt ${attempt + 1}):`, JSON.stringify(result).slice(0, 300));
    }

    return NextResponse.json(
      { error: "分析結果が不完全でした。もう一度お試しください" },
      { status: 502 }
    );
  } catch (err) {
    console.error("Analysis error:", err);
    const status = err instanceof GeminiError ? err.status : 500;
    const message = err instanceof Error ? err.message : "分析処理でエラーが発生しました";
    return NextResponse.json({ error: message }, { status });
  }
}
