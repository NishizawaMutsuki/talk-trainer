// ─── Unified AI Router ──────────────────────────────────────────
// Routes to Gemini or Claude based on model selection.

import { callGemini, GeminiError } from "./gemini";
import { callClaude, ClaudeError } from "./claude";

export const AI_MODELS = {
  "gemini-flash": { label: "Standard", provider: "gemini", tier: "free" },
  "gemini-pro":   { label: "Think Mode", provider: "gemini", tier: "pro" },
  "claude-haiku": { label: "Claude Haiku", provider: "claude", tier: "pro" },
  "claude-sonnet":{ label: "Claude Sonnet", provider: "claude", tier: "pro" },
  "claude-opus":  { label: "Claude Opus", provider: "claude", tier: "pro" },
} as const;

export type AIModelKey = keyof typeof AI_MODELS;

export const FREE_MODELS: AIModelKey[] = ["gemini-flash"];
export const PRO_MODELS: AIModelKey[] = ["gemini-flash", "gemini-pro", "claude-haiku", "claude-sonnet", "claude-opus"];

export interface AICallOptions {
  prompt: string;
  temperature?: number;
  model: AIModelKey;
}

export class AIError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function callAI({ prompt, temperature = 0.3, model }: AICallOptions): Promise<unknown> {
  try {
    const config = AI_MODELS[model];

    if (config.provider === "gemini") {
      const geminiModel = model === "gemini-pro" ? "pro" : "flash";
      return await callGemini({ prompt, temperature, model: geminiModel });
    }

    if (config.provider === "claude") {
      const claudeModel = model === "claude-haiku" ? "haiku"
        : model === "claude-sonnet" ? "sonnet"
        : "opus";
      return await callClaude({ prompt, temperature, model: claudeModel });
    }

    throw new AIError("未知のモデルです", 400);
  } catch (err) {
    if (err instanceof GeminiError) {
      throw new AIError(err.message, err.status);
    }
    if (err instanceof ClaudeError) {
      throw new AIError(err.message, err.status);
    }
    throw err;
  }
}
