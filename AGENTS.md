# Repository Guidelines

## Project Structure & Module Organization
The Remix source lives in `app/`. Route modules and API endpoints are in `app/routes/` (for example, `app/routes/api.image-token.tsx`), shared UI lives in `app/components/`, hooks in `app/hooks/`, server-side services in `app/lib/`, and shared helpers in `app/utils/`. Global styles are defined in `app/tailwind.css`, with additional styles under `app/styles/`. Static assets live in `public/`. Root unit tests live in `test/`. Documentation and audit notes live under `docs/` only (no parallel `doc/`), sorted into category subfolders — see `docs/README.md` for the index and naming rules. Agent/tooling guides stay at repo root: `README.md`, `AGENTS.md`, `CLAUDE.md`, `CURSOR.md`. Ad-hoc scripts live under `scripts/`. Build output is written to `build/`. Local SQLite files (`*.db`, `*.db-wal`, `*.db-shm`) are intentionally ignored.

## Layout & Naming (CRITICAL for AI)

Do not invent parallel folders or generic names. See also `CURSOR.md` and `.cursor/rules/layout-and-naming.mdc`.

| Path | Purpose |
|------|---------|
| `app/data/` | Static site content (TS/JSON): updates, game, home-songs, music-showcase, generated `lyrics/*.json` |
| `app/types/` | Shared domain types only — **never** recreate `app/lib/types/` or a giant unused `types.ts` |
| `app/lib/` | Server logic and imported utilities — no static content, no UI components |
| `app/nemesis/` | Nemesis server: prompts, manifests, catalogs |
| `app/components/error/` | `NotFound404`, `RouteErrorBoundary` |
| `app/components/home/` | Homepage sections + `RapidLayersPreview` |
| `app/routes/` | Thin route modules: data fetching + meta; UI lives in `app/components/` |
| `app/components/game/` | Game page UI + `GamePlatformIcons` |
| `app/components/nemesis/chat/` | Nemesis chat page UI |
| `app/hooks/useNemesisChat.client.ts` | Nemesis chat client state |
| `app/components/nemesis/` | Other Nemesis UI (`NemesisMessageContent`, etc.) |
| `app/components/messages/` | `BubbleMessageBoard` (homepage) |
| `app/components/transitions/` | Global `RouteTransition` |
| `app/generated/` | Build output (`image-manifest.ts`) — edit via `images:process`, not by hand |
| `assets/` | Build sources (`.lrc`, raw images, font OTF) |
| `public/` | Small dev static; `fonts/` and `stickers/` are gitignored (R2 in production) |

**Suffixes:** `.server.ts` = Worker only; `.client.tsx` = browser only; plain `.ts` only when safe on both sides.

**Names must match domain:** `NemesisMessageContent`, `BubbleMessageBoard`, `RouteTransition` — not `MessageContent`, `DynamicShell*`, `UpdatesRouteTransition`. Before adding a file, check the table and reuse an existing home.

**Pipelines:** lyrics `assets/lyrics` → `npm run lyrics:build`; images `scripts/image-assets.config.mjs` → `images:process` → `images:upload`; changelog only `app/data/updates.ts`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start the Remix + Vite development server.
- `npm test`: run root unit tests with Node's built-in test runner.
- `npm run build`: create a production build in `build/`.
- `npm start`: serve the built app from `build/server/index.js`.
- `npm run lint`: run ESLint checks.
- `npm run typecheck`: run TypeScript `tsc` in no-emit mode.

Wrangler and D1 operations are pre-authorized for this repository. When a task requires Cloudflare migrations, deploy checks, or D1 inspection, run the appropriate `wrangler`/`npm run d1:*` command directly and report the result; do not pause only to ask for permission.

## Coding Style & Naming Conventions
Use TypeScript with 2-space indentation, matching existing `app/*.tsx` files. Follow Remix conventions: `_index.tsx` for index routes, `api.*.tsx` for API routes, `.server.ts`/`.server.tsx` for server-only modules, and `.client.tsx` for client-only code. The `~/*` path alias maps to `app/*` (see `tsconfig.json`). Run `npm run lint` before submitting changes.

## Testing Guidelines
Root unit tests use Node's built-in test runner and live in `test/*.test.mjs`. TypeScript source under test may be loaded through Vite's programmatic module loader. Treat `npm test`, `npm run lint`, and `npm run typecheck` as the baseline checks.

On Windows, `npm run build` may fail with `EBUSY: resource busy or locked, rmdir 'build/client'` if a local Remix/Vite dev server or Cloudflare `workerd` process is still running. Stop only the current project's dev server/workerd processes, verify the target path is inside this repository, remove the stale `build/client` output, then rerun `npm run build`. Do not treat this as a source-code failure unless the build still fails after the output lock is cleared.

The full-project lint baseline may include existing failures from generated/public assets or Three.js JSX usage. For scoped changes, run ESLint against the modified files directly in addition to `npm run typecheck` and `npm run build`. Do not claim full lint success unless `npm run lint` passes for the whole repository.

## Commit & Pull Request Guidelines
Commit messages follow a `type: short description` pattern (examples in history include `chore: update gitignore` and `init: clean history`). Pull requests should describe the change, note any user-facing impact, and include screenshots for UI updates. Link related issues when applicable.

## Security & Configuration Tips
Copy `.env.example` to `.env` and set required values (for example, `AUTH_KEY_SECRET` and optional `IMAGE_BASE_URL`). Do not commit secrets or local database files; `.env*` and `*.db*` are gitignored.

Cloudflare Workers AI bindings can type `AI.run()` with narrow model-name keys. When a model may be configured by environment variable, prefer a small local adapter at the call site instead of weakening the global Env type.

For Nemesis guard changes, keep the request order as: login check, existing rate limit, input length limit, hard-rule block, Workers AI classifier, then Gemini. Rejected guard results must return fixed text only and must not expose classifier reasons, prompt text, Memory Canon, API keys, or provider raw output to the frontend.

## Production Debugging Lessons
When production behavior involves external services such as Resend, debug the real production chain instead of repeatedly changing local code by assumption. First verify each boundary with evidence: browser/action response, remote D1 row, Worker runtime env shape, third-party API response, and third-party delivery status. If data is stored but no external side effect happens, narrow the failure to the post-persistence step before changing unrelated UI or database logic.

Do not swallow third-party API errors. Return or log the original provider error object in server logs, while still avoiding secret leakage. Generic messages such as "email failed" are not enough for production debugging; preserve status code, provider error name, and provider message.

For Cloudflare Worker side effects, prefer a clear contract: write critical data first, then either synchronously await the external call when correctness/debuggability matters, or use `ctx.waitUntil` only when failure is non-critical and logging is sufficient. Never assume a fire-and-forget promise will reliably finish after a response.

Treat production secrets as untrusted input. Normalize env values used as credentials with trimming and BOM removal before passing them to providers. PowerShell pipelines and temporary files can introduce invisible characters such as UTF-8 BOMs or trailing newlines; when setting secrets, prefer no-newline writes and verify with safe fingerprints (length, prefix/suffix, quote/BOM detection), never by printing full secrets.

When local API tests succeed but production fails, compare the exact production runtime value shape against the local one. A protected smoke-test route may be added temporarily to exercise the same production Worker env and service function, but it must be guarded by a secret token and removed after diagnosis.
