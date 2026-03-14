import type { HistoryEntry, CustomQuestionList } from "./types";
import {
  QUESTIONS,
  FRAMEWORKS,
  QUESTION_FRAMEWORK_OVERRIDES,
  CATEGORY_FRAMEWORKS,
  DAILY_GOAL_DEFAULT,
  HISTORY_MAX,
} from "./constants";

// ─── Date Helpers ───────────────────────────────────────────────
// Single source of truth for date formatting.
// Always use toDateKey() — never toLocaleDateString() for storage.

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export function getTodayKey(): string {
  return toDateKey(new Date());
}

export function getDaysBetween(a: string, b: string): number {
  const parse = (s: string) => {
    const [y, m, d] = s.split("/").map(Number);
    return new Date(y, m - 1, d).getTime();
  };
  return Math.round((parse(a) - parse(b)) / 86400000);
}

export function calcStreak(entries: HistoryEntry[]): number {
  if (!entries.length) return 0;
  const dates = [...new Set(entries.map(e => e.date))].sort(
    (a, b) => getDaysBetween(b, a)
  );
  const today = getTodayKey();
  // Streak must include today or yesterday
  if (dates[0] !== today && getDaysBetween(today, dates[0]) !== 1) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    if (getDaysBetween(dates[i - 1], dates[i]) === 1) streak++;
    else break;
  }
  return streak;
}

export function getWeekDates(): string[] {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return toDateKey(d);
  });
}

// ─── Framework Helpers ──────────────────────────────────────────

export function getRecommendedFrameworks(q: string, cat: string): string[] {
  return (
    QUESTION_FRAMEWORK_OVERRIDES[q] ||
    CATEGORY_FRAMEWORKS[cat] ||
    ["PREP", "WSNW"]
  );
}

// ─── Storage ────────────────────────────────────────────────────

const STORAGE_KEYS = {
  history: "talk-trainer-history",
  dailyGoal: "talk-trainer-daily-goal",
  customLists: "talk-trainer-custom-lists",
} as const;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.history);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function persistHistory(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(
      STORAGE_KEYS.history,
      JSON.stringify(entries.slice(0, HISTORY_MAX))
    );
  } catch {}
}

export function loadDailyGoal(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.dailyGoal);
    return raw ? Number(raw) : DAILY_GOAL_DEFAULT;
  } catch {
    return DAILY_GOAL_DEFAULT;
  }
}

export function persistDailyGoal(goal: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.dailyGoal, String(goal));
  } catch {}
}

// ─── Custom Question Lists ──────────────────────────────────────

export function loadCustomLists(): CustomQuestionList[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.customLists);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function persistCustomLists(lists: CustomQuestionList[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.customLists, JSON.stringify(lists));
  } catch {}
}

/** カスタムリストのカテゴリ名（プレフィックス付き） */
export function customListCategory(list: CustomQuestionList): string {
  return `custom:${list.id}`;
}

/** カテゴリ名がカスタムリストかどうか */
export function isCustomCategory(cat: string): boolean {
  return cat.startsWith("custom:");
}

/** カスタムリストから未練習の質問を優先して選ぶ */
export function pickCustomQuestion(
  questions: string[],
  category: string,
  history: HistoryEntry[]
): string {
  if (!questions.length) return "";
  const practiced = new Set(
    history.filter(h => h.category === category).map(h => h.question)
  );
  const unpracticed = questions.filter(q => !practiced.has(q));
  const candidates = unpracticed.length > 0 ? unpracticed : questions;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// ─── Question Helpers ────────────────────────────────────────────

/** All question texts in a category */
export function allQuestionTexts(category: string): string[] {
  return (QUESTIONS[category] ?? []).map(q => q.text);
}

/** Only standalone questions (safe for initial prompt) */
export function standaloneQuestions(category: string): string[] {
  return (QUESTIONS[category] ?? []).filter(q => q.standalone).map(q => q.text);
}

/** Only followup-type questions (for AI reference during deep dive) */
export function followupQuestions(category: string): string[] {
  return (QUESTIONS[category] ?? []).filter(q => !q.standalone).map(q => q.text);
}

// ─── Question Picker ────────────────────────────────────────────
// Initial pick: standalone only. Prefer unpracticed questions.

export function pickQuestion(
  category: string,
  history: HistoryEntry[]
): string {
  const pool = standaloneQuestions(category);
  if (!pool.length) return "";
  const practiced = new Set(
    history.filter(h => h.category === category).map(h => h.question)
  );
  const unpracticed = pool.filter(q => !practiced.has(q));
  const candidates = unpracticed.length > 0 ? unpracticed : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// ─── Framework Mapping ──────────────────────────────────────────
// Derive from FRAMEWORKS constant — no hardcoded map needed.

/** Normalize dashes: em-dash (–), en-dash (–), etc. → regular hyphen (-) */
function normalizeDashes(s: string): string {
  return s.replace(/[\u2013\u2014\u2015\u2212]/g, "-");
}

/** Resolve an API-returned framework name (e.g. "STAR", "PREP法") to a FRAMEWORKS key */
export function fwNameToKey(name: string): string | null {
  if (!name) return null;
  // Direct key match
  if (FRAMEWORKS[name]) return name;
  const normalized = normalizeDashes(name).toLowerCase();
  // Match by name or short (with dash normalization)
  for (const [key, fw] of Object.entries(FRAMEWORKS)) {
    const fwName = normalizeDashes(fw.name).toLowerCase();
    const fwShort = fw.short.toLowerCase();
    if (fwName === normalized || fwShort === normalized || fw.name === name) return key;
  }
  // Partial match — only if the full short name is found as a word boundary
  for (const [key, fw] of Object.entries(FRAMEWORKS)) {
    const fwName = normalizeDashes(fw.name).toLowerCase();
    if (fwName.includes(normalized) || normalized.includes(fwName)) return key;
  }
  return null;
}
