# Talk Trainer

AI-powered interview practice app (Japanese job interviews). Full-stack Next.js application with speech recognition, multi-model AI analysis, and subscription management.

## Tech Stack

- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript (strict mode)
- **Styling**: Tailwind CSS 4.0 with custom CSS animations (glass-morphism UI)
- **Database**: Neon PostgreSQL (serverless)
- **Auth**: NextAuth with Google OAuth
- **Payments**: Stripe subscriptions
- **AI**: Google Gemini + Anthropic Claude via unified router (`src/lib/ai-router.ts`)

## Commands

- `npm run dev` — Start dev server (port 3000, auto-kills existing process)
- `npm run build` — Production build
- `npm run lint` — ESLint (next lint)
- No test framework configured

## Project Structure

```
src/
├── app/                  # Next.js App Router pages & API routes
│   ├── page.tsx          # Main SPA with screen-based state management
│   ├── api/              # API routes (analyze, challenge, followup, checkout, webhook, auth)
│   └── admin/            # Admin dashboard
├── components/           # Screen components (HomeScreen, RecordingScreen, ResultScreen, etc.)
├── lib/                  # Core logic (types, constants, utils, AI clients, db, auth)
├── types/                # Type declarations (Web Speech API)
└── data/                 # Knowledge base & transcript data
```

## Code Conventions

- Path alias: `@/*` → `./src/*`
- Section dividers: `// ─── Section Name ───`
- Japanese comments for domain-specific terms
- Event handlers: `on*` prefix (onStartRecording, onAnalyze)
- API responses: `{ error: string }` for errors
- Git commits: type prefixes (`feat:`, `fix:`, `refactor:`, `ui:`, `brand:`)
- Components use hooks, useCallback for handlers, useMemo for derived state
