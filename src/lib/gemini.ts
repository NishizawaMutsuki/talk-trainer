// ─── Shared Gemini API Helper ───────────────────────────────────
// Single place for Gemini fetch + JSON parse logic.
// Includes exponential backoff for 429 rate limits.

const GEMINI_MODEL = "gemini-2.0-flash";
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1500; // 1.5s → 3s

export interface GeminiOptions {
  prompt: string;
  temperature?: number;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function callGemini({ prompt, temperature = 0.3 }: GeminiOptions): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError("GEMINI_API_KEY が設定されていません", 500);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature,
    },
  });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`Gemini 429 retry ${attempt}/${MAX_RETRIES} — waiting ${delay}ms`);
      await sleep(delay);
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleaned = text.replace(/```json|```/g, "").trim();

      if (!cleaned) {
        console.warn("Gemini returned empty response text");
        throw new GeminiError("AIから空の応答が返されました", 502);
      }

      try {
        const parsed = JSON.parse(cleaned);
        // Gemini sometimes wraps the response in an array — unwrap it
        if (Array.isArray(parsed) && parsed.length === 1) {
          return parsed[0];
        }
        return parsed;
      } catch {
        console.error("Failed to parse Gemini response:", cleaned.slice(0, 300));
        throw new GeminiError("AIの応答を解析できませんでした", 502);
      }
    }

    if (res.status === 429 && attempt < MAX_RETRIES) {
      continue;
    }

    const errBody = await res.text();
    console.error(`Gemini API error (attempt ${attempt + 1}):`, res.status, errBody.slice(0, 200));
    throw new GeminiError(
      res.status === 429
        ? "APIが混み合っています。少し待ってからもう一度お試しください"
        : `API エラー (${res.status})`,
      res.status
    );
  }

  throw new GeminiError("予期しないエラーが発生しました", 500);
}

export class GeminiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
