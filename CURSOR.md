# CURSOR.md

Cursor / AI agent guidance for this repo. **Read `AGENTS.md` and `.cursor/rules/` for the full baseline.** This file highlights layout and naming rules added to stop drift.

## Layout & naming (CRITICAL)

Do not create parallel buckets (`app/lib/data`, `app/lib/types`, generic component names) when a canonical path exists.

### Where things go

- **`app/data/`** — Static content (`updates.ts`, `game.ts`, `home-songs.ts`, `music-showcase.ts`, generated `lyrics/*.json`).
- **`app/types/`** — Shared TypeScript types only. No second types tree under `app/lib/`.
- **`app/lib/`** — Server services and real utilities. No static content, no UI, no unused scaffold files.
- **`app/nemesis/`** — Nemesis server (prompts, manifests, catalogs).
- **`app/components/nemesis/`** — Nemesis chat UI (`NemesisMessageContent`, `ChatAttachment`, `TypewriterText`, etc.).
- **`app/components/messages/`** — `BubbleMessageBoard` (homepage guest notes).
- **`app/components/transitions/`** — Global `RouteTransition` in `root.tsx`.
- **`app/generated/`** — Build artifacts (`image-manifest.ts`); do not edit by hand.
- **`assets/`** — Sources for build (`lyrics/*.lrc`, raw images, fonts).
- **`public/`** — Small dev static; large media lives on R2 (`stickers/`, `public/fonts/` gitignored).

### Module suffixes

- `.server.ts` → Worker only
- `.client.tsx` → Browser only (GSAP, players, OAuth)
- Plain `.ts` → Both sides only if no `window` at module top level

### Naming

- Use domain-specific names: `NemesisMessageContent`, `BubbleMessageBoard`, `RouteTransition`.
- Avoid misleading generics: `MessageContent`, `DynamicShell*`, `UpdatesRouteTransition`, new `*Utils.ts` with one caller.
- Nemesis manifests stay in `app/nemesis/`, not `app/data/`.

### Media & pipelines

- Images: `scripts/image-assets.config.mjs` + `npm run images:process` + `images:upload`.
- Lyrics: `assets/lyrics/` + `npm run lyrics:build` → `app/data/lyrics/*.json`.
- Stickers/fonts: R2 + Worker routes `/stickers/*`, `/fonts/*`; not committed blobs in git.

When unsure, extend an existing folder and name before adding a new top-level pattern.
