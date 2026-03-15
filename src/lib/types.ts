// ─── Core Types ─────────────────────────────────────────────────

export interface QuestionItem {
  text: string;
  /**
   * true  = 最初の質問として出題可能（単独で成立する質問）
   * false = 深掘り専用（前の回答が前提にある質問）
   */
  standalone: boolean;
}

export interface FrameworkInfo {
  name: string;
  short: string;
  structure: string[];
  color: string;
  description: string;
}

export interface Segment {
  label: string;
  text: string;
  quality: string;
}

export interface PerceivedAbility {
  /** 能力名（例: 主体性、論理的思考力、チームワーク） */
  ability: string;
  /** 回答のどこからその能力が感じられたか（1文） */
  evidence: string;
  /** 伝わり度合い: strong=明確に伝わった, moderate=やや伝わった, weak=意図は感じるが弱い */
  level: "strong" | "moderate" | "weak";
}

export interface AnalysisResult {
  structure_score: number;
  specificity_score: number;
  time_balance_score: number;
  overall_score: number;
  detected_framework: string;
  recommended_framework: string;
  framework_match: number;
  segments: Segment[];
  strengths: string[];
  improvements: string[];
  rewrite_suggestion: string;
  one_line_feedback: string;
  coach_tip: string;
  /** 面接官がこの回答から感じ取る能力・資質 */
  perceived_abilities?: PerceivedAbility[];
}

export interface HistoryEntry {
  question: string;
  category: string;
  overall_score: number;
  feedback: string;
  date: string; // "YYYY/M/D" format via toDateKey()
  seconds: number;
  /** User's answer text */
  answer?: string;
  /** Key analysis fields (optional for backward compat) */
  strengths?: string[];
  improvements?: string[];
  rewrite_suggestion?: string;
  /** 0 = original question, 1+ = followup depth */
  depth?: number;
  /** The root question that started the deep-dive chain */
  rootQuestion?: string;
}

export interface CoachingTip {
  category: string;
  tip: string;
  icon: string;
}

// ─── Deep Dive (深掘り) ─────────────────────────────────────────

/** A single turn in the deep-dive conversation chain */
export interface ChainTurn {
  question: string;
  answer: string;
  score: number;
  feedback: string;
  seconds: number;
}

/** AI-generated followup question with context */
export interface FollowupInfo {
  followup_question: string;
  intent: string;
  recommended_framework: string;
  difficulty: string;
  tip: string;
}

/** AI-generated challenge topic for 1分チャレンジ */
export interface ChallengeInfo {
  question: string;
  category_hint: string;
  recommended_framework: string;
  difficulty: string;
  tip: string;
}

// ─── Habit Analysis (癖診断) ─────────────────────────────────────

export interface HabitDimension {
  /** 診断軸の名前 */
  dimension: string;
  /** 1-10 のスコア */
  score: number;
  /** この人の具体的な癖（例: 「結論を最後に持ってくる傾向がある」） */
  habit: string;
  /** 回答からの具体的な証拠（原文引用） */
  evidence: string;
  /** 改善のための具体的な練習法 */
  exercise: string;
}

export interface HabitAnalysis {
  /** 分析日時 */
  analyzedAt: string;
  /** 分析に使った練習回数 */
  sampleCount: number;
  /** 7軸の診断結果 */
  dimensions: HabitDimension[];
  /** この人の最大の強み（1つ） */
  biggestStrength: string;
  /** この人が最優先で直すべき癖（1つ） */
  biggestHabit: string;
  /** 次の10回の練習で意識すべきこと */
  nextFocus: string;
  /** 話し方の総合的な特徴（面接官視点で1文） */
  overallImpression: string;
}

// ─── Custom Question Lists ───────────────────────────────────────

export interface CustomQuestionList {
  id: string;
  name: string; // e.g. "ソフトバンク 二次面接"
  questions: string[];
  createdAt: string;
}

// ─── Screens ────────────────────────────────────────────────────

export type Screen =
  | "home"
  | "dashboard"
  | "practice"
  | "recording"
  | "reviewing"
  | "analyzing"
  | "result"
  | "history"
  | "followup-generating"
  | "challenge-generating"
  | "custom-list-edit"
  | "paywall";

// ─── User Status ────────────────────────────────────────────────

export type AIModelKey = "gemini-flash" | "gemini-pro" | "claude-haiku" | "claude-sonnet" | "claude-opus";

export interface UserStatus {
  loggedIn: boolean;
  plan?: "free" | "pro";
  usage?: number;
  limit?: number;
  canUse?: boolean;
  model?: string;
  availableModels?: AIModelKey[];
  unlimited?: boolean;
  role?: string;
}
