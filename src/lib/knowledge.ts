import { readFileSync } from "fs";
import { join } from "path";

// ─── Types ──────────────────────────────────────────────────────

export interface Insight {
  id: string;
  source_id: string;
  source_title: string;
  speaker_role: string;
  context: string;
  insight: string;
  tags: string[];
  tier: string;
}

// ─── Load insights.jsonl ────────────────────────────────────────

let _cache: Insight[] | null = null;

function loadInsights(): Insight[] {
  if (_cache) return _cache;
  try {
    const filePath = join(process.cwd(), "data", "knowledge", "insights.jsonl");
    const raw = readFileSync(filePath, "utf-8");
    _cache = raw
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as Insight);
    return _cache;
  } catch (err) {
    console.warn("Failed to load insights.jsonl:", err);
    return [];
  }
}

// ─── Category → Insight ID mapping ──────────────────────────────
// Curated: each category gets the most impactful insights for that context.
// "universal" insights apply to ALL categories.

const CATEGORY_INSIGHTS: Record<string, string[]> = {
  universal: [
    "013", // 数字+情景描写（曽和氏：定量だけでなく定性的な環境を描写）
    "024", // 相手視点（面接官が聞きたいことに答える）
    "041", // 同じ絵を描く（面接官と同じ情景を想像させる）
  ],
  ガクチカ: [
    "017", // ガクチカの動機「なぜそうしたのか」が大手では問われる
    "019", // 思考の深さ（結論から話すのはできてる。足りないのは「なぜ」）
    "021", // のめり込み具合（頻度じゃなく熱量の深さ）
    "022", // 聞かなくても必要な情報をガンガン出す学生が高評価
  ],
  自己PR: [
    "026", // 強みの罠（社長：学生の強みなんていらない。伸びしろを見たい）
    "027", // 1次vs最終（1次では強みが必要だが見せ方が違う）
    "039", // オリジナリティ（「共感力がある」は多すぎ。自分と他人の違いまで踏み込め）
    "015", // 第一印象の誤解を自分から解く
    "025", // 弱みの伝え方（「好きなことだけ頑張る」はNG）
  ],
  "学業・研究": [
    "008", // 専門用語を使わない（人事にはわからない）
    "019", // 思考の深さ
    "007", // 自己PRで「何の驚きをくれるか」
  ],
  志望動機: [
    "037", // 就活軸 vs 志望動機の違い（軸=好みのタイプ、志望動機=告白）
    "038", // 説得力不足の例（海が好きで月2回→少ない）
    "034", // 第一志望と言い切った方がいい
    "020", // モチベーションの源泉が見えないと留意点がつく
  ],
  その他: [
    "009", // 逆質問で面接官個人に聞くとドキッとする
    "006", // キラキラしてなくてもそのまま喋る
  ],
  "1分チャレンジ": [
    // チャレンジは面接知見よりフレームワーク練習なので最小限
  ],
};

// ─── Public API ─────────────────────────────────────────────────

/**
 * Get formatted insights for a given question category.
 * Returns a prompt-ready string with 3-6 relevant insights.
 */
export function getInsightsForCategory(category: string): string {
  const all = loadInsights();
  if (all.length === 0) return "";

  const universalIds = CATEGORY_INSIGHTS.universal ?? [];
  const categoryIds = CATEGORY_INSIGHTS[category] ?? [];
  const targetIds = [...new Set([...categoryIds, ...universalIds])];

  if (targetIds.length === 0) return "";

  const insightMap = new Map(all.map((i) => [i.id, i]));
  const selected = targetIds
    .map((id) => insightMap.get(id))
    .filter((i): i is Insight => i !== undefined);

  if (selected.length === 0) return "";

  const lines = selected.map((i) => {
    // Truncate insight to ~150 chars for prompt budget
    const text =
      i.insight.length > 150 ? i.insight.slice(0, 147) + "…" : i.insight;
    return `- 【${i.speaker_role}】${text}`;
  });

  return `\n【面接官の視点 — 実際の人事・経営者の発言に基づく評価基準】
以下は実際の人事責任者・経営者が面接で語った評価基準です。
フィードバック（特に improvements と coach_tip）では、Matt Abrahamのメソッドに加えて、
これらの実践的な人事目線も踏まえた具体的アドバイスを含めてください。

${lines.join("\n")}
`;
}

/**
 * Get a single random insight for coaching tip display.
 * Optionally filtered by category.
 */
export function getRandomInsight(category?: string): Insight | null {
  const all = loadInsights();
  if (all.length === 0) return null;

  if (category) {
    const ids = [
      ...(CATEGORY_INSIGHTS[category] ?? []),
      ...(CATEGORY_INSIGHTS.universal ?? []),
    ];
    const insightMap = new Map(all.map((i) => [i.id, i]));
    const filtered = ids
      .map((id) => insightMap.get(id))
      .filter((i): i is Insight => i !== undefined);
    if (filtered.length > 0) {
      return filtered[Math.floor(Math.random() * filtered.length)];
    }
  }

  return all[Math.floor(Math.random() * all.length)];
}
