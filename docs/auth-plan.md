# Talebrary Auth & Accounts — Plan

Status: **planning** (no code written). Research complete; decisions locked.

## Goal

Add user accounts to Talebrary so visitors can sign in with the usual social
providers. Accounts are an **opt-in unlock, never a gate** — browsing and playing
stay free and anonymous (forced signup is a top abandonment cause). Login exists
to enable personal, persistent, cross-device features (Stage 2).

## Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Auth engine | **Better Auth** (open-source library, self-hosted on Workers + D1) | $0, no MAU cap, native to our stack, no vendor lock-in. Cookie-session based = server-first (unlike Clerk's client-first JWT model that fights MPA/HTMX). |
| D1 driver | **`kysely-d1`** | Better Auth core has no native D1 support; needs a Kysely dialect. Kysely itself is already bundled inside `better-auth`. `kysely-d1` has zero runtime deps of its own — smallest possible footprint. |
| Admin dashboard | **Official `@better-auth/infra`** (dash plugin) | Deliberately outsourced. An admin UI is pure attack surface + downside risk; not something to hand-roll. Real-time usage/analytics + managed hardening. Accepts: extra (closed-source) package + auth events (IP/geo/activity) sent to their hosted service. |
| Login methods (Stage 1) | **Social-only**: Google, Facebook, Apple, GitHub | Zero email infrastructure — no verification/reset mail to build or secure. Removes a whole class of things to get wrong (password storage, reset-token flows, deliverability). |
| Client SDK | **Skip it** | App is server-rendered JSX (linkedom), no React/SPA. Login = plain links/forms → server issues OAuth redirect; session read server-side from cookie. No client bundle. |

### Dependency footprint (final)
`better-auth`, `kysely-d1`, `@better-auth/infra`. That's it. No email lib, no client SDK, no `better-auth-cloudflare` wrapper.

---

## Why this fits our architecture (Clerk contrast)

- **Sessions** = signed **httpOnly cookie**, read server-side via `auth.api.getSession({ headers })`. No client JS.
- **Social sign-in** = `auth.api.signInSocial({ provider })` returns the provider OAuth URL; our handler issues a `302`. Provider redirects back to Better Auth's mounted callback (a normal GET), which exchanges the code and **sets the session cookie server-side**.
- Every step is a full-page HTTP redirect + a server-set cookie. HTMX / plain forms / no-JS are first-class. This is the inverse of the Clerk+HTMX pain (Clerk holds a short-lived JWT in browser JS its SDK must refresh; no SDK = broken).

---

## Stage 1 — Social auth + admin dashboard

### 1. Dependencies & runtime config
- `bun add better-auth kysely-d1 @better-auth/infra`
- `wrangler.toml`: add `compatibility_flags = ["nodejs_als"]` (Better Auth needs `AsyncLocalStorage`; `nodejs_als` is the narrow flag — fall back to `nodejs_compat` only if runtime complains). compat_date `2025-02-03` already satisfies the `>= 2024-09-23` requirement.
- WebCrypto (rest of Better Auth's crypto) is native on Workers — no flag needed.

### 2. Secrets (via `wrangler secret put` for prod; `process.env`/`.env` for local)
- `BETTER_AUTH_SECRET` — strong random, session signing
- `BETTER_AUTH_URL` — base URL
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET`
- `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`
- Dashboard: `BETTER_AUTH_API_URL`, `BETTER_AUTH_KV_URL`, `BETTER_AUTH_API_KEY` (from dash.better-auth.com — Dan has signed up; provide the key at implementation time)

Follow the existing secret convention: only the composition roots (`src/bun/app.ts`, `src/cloudflare/app.ts`) read `env`/`process.env`; secrets are injected into deps, never read deep inside handlers (mirrors the `PROXY_TOKEN` pattern). Regenerate `worker-configuration.d.ts` via `wrangler types` after adding secrets to `Env`.

### 3. Database schema (manual migration — CLI can't reach D1)
- Better Auth tables: `user`, `session`, `account`, `verification`.
- Run `npx @better-auth/cli generate` to emit `schema.sql`.
- Hand it into a new migration `db/migrate-5-auth.sql`; apply to **both** local `db/talebrary.sqlite` and remote D1 via the existing `db/run` workflow / `wrangler d1 execute talebrary --remote --file=...`. (D1 bindings are runtime-only, so the Better Auth CLI cannot connect to D1 directly — schema application is always manual via wrangler.)

### 4. Wire into DI (yadic) — mirror the `db`/`bucket`/`ai` pattern
- New abstraction `Auth` (interface) in `src/auth/`, so Better Auth sits behind our own boundary exactly like `TalebraryDatabase`/`TalebraryBucket`/`TalebraryAi`:
  - `handle(request)` — delegates the whole `/api/auth/*` subtree to Better Auth's mounted handler
  - `getSession(request)` — server-side session read
  - `socialSignInUrl(provider, callbackURL)` — for our own login links/handlers
- Production impl (`BetterAuthAdapter`) constructs `betterAuth({ database: new Kysely({ dialect: new D1Dialect({ database: env.db }) }), socialProviders: {...}, plugins: [dash({...})] })`.
- **Per-request construction** in `src/cloudflare/app.ts` (D1 binding only exists inside the request context — matches the existing `app(env)` per-request build).
- Add `Dependency<'auth', Auth>` to `ApplicationDependencies` and to `RouterDependencies`.

### 5. Local dev path
Auth runs under **`./run startw`** (wrangler dev, real remote D1 + secrets), not the plain Bun `./run start`. OAuth needs real provider redirects, secrets, and D1 anyway — so `startw` is the natural dev path (consistent with how AI/D1 features already require it per `.claude/rules/environment.md`). This also avoids needing a Bun-SQLite Kysely dialect (an extra dep) purely for local dev. Plain `start` can leave `/api/auth/*` and account pages unavailable (stub `Auth`).

### 6. Routing & pages
- `src/Routing.ts`: add branches
  - `/api/auth/*` → `deps.auth.handle(request)` (Better Auth's handler)
  - `/login` → login page (buttons that are plain links/forms to the social sign-in routes)
  - `/account` → account page (requires session; else redirect to `/login`)
  - `/logout` → sign-out
- Pages rendered with the existing `html5()` JSX + template/slot system (model on `CatalogueHandler.tsx`).

### 7. Session-aware header/nav
- Header should show **Sign in** vs **Account** based on session. Templates only see the content doc, not the request — so render the nav per-request. Cleanest fit: a `<slot src="/account/nav">` HTTP-include partial (uses the existing slot include system) that renders sign-in/account state per request. Resolve exact mechanism during implementation.

### 8. Response-header correctness (important)
- Any authenticated/personalized response **must set `Cache-Control: private`** — `cacheControlHandler` slaps `public` on anything that doesn't declare `private`, which would cache a user's page for everyone.
- `/api/auth/*` responses set `Set-Cookie`. Verify pass-through:
  - `EtagHandler` already whitelists `set-cookie` in `safeHeaders` (survives 304s).
  - `templateHandler` only reprocesses HTML; auth API returns JSON/redirects — leaves them alone.
  - Main-body branches use `new Response(body, response)` which copies headers, so `Set-Cookie` survives. Confirm during implementation.

### 9. Testing
- **Contract tests** for the `Auth` interface: in-memory double (`InMemoryAuth`, Map-backed like `InMemoryGameFinder`) + real adapter — same suite both sides.
- **Handler unit tests** as pure `Http` functions with an injected in-memory `Auth` (login page, account guard, logout) — no server/network.
- **Playwright** visual verify of `/login` + `/account`, and a full OAuth round-trip under `startw`.
- Treat `better-auth` itself as a trusted library boundary (like D1/R2) — don't unit-test its internals.

### 10. Provider gotchas (design notes)
- **Apple**: no user-info endpoint — persist email on **first** sign-in or it's unrecoverable. Apple client secret is a **JWT that expires (≤6 months)** — recurring renewal chore; note it somewhere durable.
- **Facebook**: doesn't flag per-email verification — treat Facebook emails as unverified unless separately checked.
- **GitHub**: default `user:email` scope can return `null` for private emails — use `/user/emails` for the verified primary.
- **Version pinning**: pin `better-auth`; **test social sign-in after any upgrade** — D1+Kysely has a shipped-regression history (transaction default once broke social sign-in with `unable_to_create_user`).

### Stage 1 acceptance
- Visitor can sign in with Google/Facebook/Apple/GitHub, gets a session cookie, sees an Account state in the nav, can log out.
- Anonymous browsing/playing unchanged.
- Admin dashboard shows signups/usage.
- Types check, tests pass, pages visually verified.

---

## Stage 2 — Personalization / save workflow (jot only)

The "why sign up" payload. Research-backed ranking; endings-collected dropped as too tricky. All are just D1 tables keyed by the Better Auth `user.id`.

1. **Cross-device save/resume — the wedge.** Persist per-user, per-game play/progress state in D1 (R2 for larger blobs) keyed by `userId + gameId`; resume across devices. This is the genuinely unmet need in IF: Parchment localStorage saves fail after closing the browser; itch.io stores all Ink saves under one shared localStorage key (games corrupt each other) and has no cloud save; Choice of Games players still ask for cross-save. Solving it platform-side is the differentiator. localStorage genuinely can't do this at multi-game/multi-device scale.
2. **Transcripts.** Most IF engines support a transcript feature that records every move (full input/output log of a playthrough). For signed-in users who opt in, capture the transcript server-side alongside the save. Value beyond restore: **export** the transcript (download), and **search** across your own transcripts (e.g. "where did I find the brass key"). Pairs naturally with #1 — same per-playthrough persistence. Store the log blob in R2 (transcripts can grow large), metadata + a searchable index in D1; **reuse the existing FTS5 search** (already used for the game catalogue) for full-text transcript search. Opt-in toggle, per playthrough. Account-dependent.
3. **Personal lists** — want-to-play / played / favorites (IFDB-style). Login-gated, cross-device, can feed "new tale in your genre" notifications later. Tables: `user_lists` + `list_items` (or typed columns).
4. **Year-in-review / stats** — derived from play history (games finished, genres explored, time). Shareable "your year in tales" page. Strongest *retention + virality* mechanic in the reading-adjacent space (StoryGraph, Spotify Wrapped).
5. **Ratings & reviews** — attributed to the user, per game; private notes. Identity makes them meaningful and hard to spam. Table: `user_reviews`.

Data-model sketch: `user_game_state`, `user_transcripts` (D1 metadata + FTS5 index, R2 blob), `user_lists`/`list_items`, `user_reviews` — all FK to Better Auth `user.id`. Keep browsing anonymous; these light up only when logged in.

---

## Future — email/password (deferred)

If email login is ever added, use **Better Auth's own email infrastructure** (part of the `@better-auth/infra` offering) rather than wiring a separate sender. Same rationale as the dashboard: email deliverability isn't something that makes the product better — only worse if we get it wrong — so outsource it. Better Auth's `sendVerificationEmail`/`sendResetPassword` hooks are generic async functions, so this stays a drop-in later.
