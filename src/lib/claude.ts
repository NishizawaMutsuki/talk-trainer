// ─── Shared Claude API Helper ───────────────────────────────────
// Anthropic Claude API integration with retry logic.

const CLAUDE_MODELS = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-5-20250929",
  opus: "claude-opus-4-5-20250929",
} as const;

export type ClaudeModel = keyof typeof CLAUDE_MODELS;

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1500;

export interface ClaudeOptions {
  prompt: string;
  temperature?: number;
  model?: ClaudeModel;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function callClaude({ prompt, temperature = 0.3, model = "haiku" }: ClaudeOptions): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ClaudeError("ANTHROPIC_API_KEY が設定されていません", 500);
  }

  const modelId = CLAUDE_MODELS[model];
  const url = "https://api.anthropic.com/v1/messages";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };

  const body = JSON.stringify({
    model: modelId,
    max_tokens: 4096,
    temperature,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    // Force JSON output via system prompt
    system: "You are an expert interview coach. Always respond with valid JSON only. No markdown, no code fences, no explanations outside JSON.",
  });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`Claude 429 retry ${attempt}/${MAX_RETRIES} — waiting ${delay}ms`);
      await sleep(delay);
    }

    const res = await fetch(url, { method: "POST", headers, body });

    if (res.ok) {
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const cleaned = text.replace(/```json|```/g, "").trim();

      if (!cleaned) {
        console.warn("Claude returned empty response text");
        throw new ClaudeError("AIから空の応答が返されました", 502);
      }

      try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length === 1) {
          return parsed[0];
        }
        return parsed;
      } catch {
        console.error("Failed to parse Claude response:", cleaned.slice(0, 300));
        throw new ClaudeError("AIの応答を解析できませんでした", 502);
      }
    }

    if (res.status === 429 && attempt < MAX_RETRIES) {
      continue;
    }

    const errBody = await res.text();
    console.error(`Claude API error (attempt ${attempt + 1}):`, res.status, errBody.slice(0, 200));
    throw new ClaudeError(
      res.status === 429
        ? "APIが混み合っています。少し待ってからもう一度お試しください"
        : `API エラー (${res.status})`,
      res.status
    );
  }

  throw new ClaudeError("予期しないエラーが発生しました", 500);
}

export class ClaudeError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
