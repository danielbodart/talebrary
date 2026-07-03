@Web

# Talebrary

Interactive fiction library — Bun (local dev) + Cloudflare Workers (production).

# Commands

All commands via `./run [command]`. Check `./run` before inventing build steps — if a command is missing, add it there.

- `start` — Dev server with watch mode
- `start-dynamic` — Dev server on random port (for Playwright testing)
- `startw` — Wrangler dev --remote (for CF-specific features: AI, D1, R2, Durable Objects)
- `check` — TypeScript type-check (run after any TS change)
- `test [file]` — Run all tests or a specific file
- `build` — Full build: check + complexity + build-client + test
- `deploy` — **CI only.** Never run locally unless debugging a CI deployment failure.

# Architecture

- Composition roots: `src/bun/app.ts` (Bun), `src/cloudflare/app.ts` (Workers)
- DI via `@bodar/yadic` — deps wired through `application()` in `Application.ts`. DI is mandatory for all new services.
- JSX via `@bodar/jsx2dom` + `linkedom` — ambient type extensions in `src/jsx-global.d.ts`
- `Http`: `(request: Request) => Promise<Response>` — defined in `src/http/mod.ts`, used everywhere
- Mobile-first — must work on both mobile and desktop
- Templates: `TemplateHandler` wraps pages; `<meta name="template" content="card"/>` selects layout
- `baseTemplate` (via `header.tsx`) provides fonts, favicon, viewport, and the Cloudflare Web Analytics beacon — never duplicate in handlers. The beacon is injected manually in `header.tsx` because CF auto-injection does not run on Worker responses
- Slot system: `<slot name="head/body">` for projection, `<slot src="/path">` for HTTP partials

# Implementation

IMPORTANT: Investigate before fixing — read code, check logs, understand the root cause. No conjectural fixes.

- Do NOT get ahead of the user. When asked for research, deliver only that. Wait for explicit instructions before implementing.
- When fixing a bug, grep for the same pattern across ALL similar files. Fix everything in one pass.
- Only implement explicitly requested features. Ask before adding "helpful" extras.
- Inject dependencies explicitly via yadic — never default to globals like `fetch`
- Check existing types (`src/http/mod.ts`, `src/types.ts`) before defining new ones
- jsx2dom missing attributes → add to `src/jsx-global.d.ts` — never use spreads or casts
- Check `package.json` for existing libraries. Ask before adding new ones.
- Verify documentation before suggesting. If docs unavailable, read the source. Cite sources. Never make up syntax.
- Use async/await unless you need special Promise handling
- Use `bun:sqlite` for SQLite operations — never sqlite3 CLI
- Use wrangler for Cloudflare interactions but do NOT use it to deploy — deployments are CI only

# Testing

- In-memory test doubles only — never mocks, especially not for HTTP
- Http is a pure function — use as lambda in tests, no servers or network needed
- Contract tests across interfaces (`TalebraryAi`, `TalebraryBucket`)
- Never delete existing tests without approval
- Visually verify UI changes with Playwright — tests passing does not mean it looks right
- Use `/frontend-design` skill for any UI work

# Workflow

- Rebase before fresh work: `git pull --rebase origin master`
- After push: `gh run watch` to monitor CI
- Run `/code-review:code-review-local` before committing significant changes (new endpoints, DB changes, major refactors)
- Be concise. No repetition. Minimal code.

# Learning from Corrections

IMPORTANT: When the user corrects you or points out a better approach, update CLAUDE.md or the relevant `.claude/rules/` file to capture that knowledge. The only exception is if the correction is clearly a one-off workaround (e.g. "just do this temporarily"). Always tell the user what you recorded and where.
