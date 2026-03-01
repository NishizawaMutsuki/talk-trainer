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
  | "challenge-generating";
