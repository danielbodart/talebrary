@Web

# Architecture

- Two runtimes: **Bun** (local dev) and **Cloudflare Workers** (production)
- `src/bun/app.ts` is the local composition root, `src/cloudflare/app.ts` is production
- Dependency injection via `@bodar/yadic` (JSR) — all deps passed through `application()` in `Application.ts`
- JSX via `@bodar/jsx2dom` (JSR) — types derived from TS DOM lib; ambient extensions in `src/jsx-global.d.ts`
- `Http` type defined in `src/http/mod.ts`: `(request: Request) => Promise<Response>` — used everywhere
- **Mobile-first**: Everything must work well on both mobile and desktop

# Core Rules

1. Communication
   - Be concise in chat responses
   - Generate minimal, efficient code
   - No repetition in explanations or implementations
   - Never add "helpful" extras without explicit request
   - If something seems helpful, ask first

2. Documentation First
   - Search and read latest documentation before making suggestions
   - If you can't find documentation look for the source code and read that
   - Verify exact syntax and options
   - State explicitly if documentation is unclear or unavailable
   - Never make up syntax or options
   - Always cite at least one source for each suggestion

3. Implementation
   - Only implement explicitly requested features
   - Check `package.json` for existing libraries and prefer them over adding new ones
   - Always ask before adding new libraries
   - Use async/await unless you need to do something special with Promises
   - Inject dependencies explicitly — don't default to globals like `fetch`, pass them at the composition root
   - Check existing types first (`src/http/mod.ts`, `src/types.ts`, etc.) before defining new types
   - If jsx2dom types don't recognise an HTML attribute, add an ambient declaration to `src/jsx-global.d.ts` — never hack with spreads or casts
   - Run `./run check` for TypeScript changes

4. Testing
   - Maintain existing tests, never delete without approval
   - Add tests for new code
   - Use in-memory test doubles over mocks
   - Never use mocks, especially not for HTTP
   - HTTP is a pure function (request in, response out) — inject it as a dependency, never mock it
   - In tests, use Http as a simple lambda — no servers or network needed
   - Maintain contract tests across interfaces (e.g. `TalebraryAi`, `TalebraryBucket`)
   - Run `./run test` (all) or `./run test [specific test file]`
   - Always visually verify UI changes with Playwright before saying work is finished — tests passing doesn't mean it looks right

5. Command Execution
   - Use `./run [command] [args]` when available
   - Always check `./run` first for available commands before inventing build steps
   - If a needed command is missing from `./run`, add it there — keep build knowledge centralised
   - Key commands: `start`, `startw` (wrangler dev --remote), `check`, `test`, `build`, `deploy`
   - Use `./run startw` instead of `./run start` when testing Cloudflare-specific features (AI bindings, D1, R2, Durable Objects) — it uses the real `env.AI` binding via wrangler dev --remote, while `start` uses a REST API adapter that may behave differently

6. Worktree Setup
   - Main repo: `/home/dan/Projects/talebrary` (master)
   - Worktrees live in `/home/dan/Projects/talebrary-worktrees/<branch-name>`
   - When creating a new worktree, symlink `.env` from main repo: `ln -s /home/dan/Projects/talebrary/.env <worktree>/.env`
   - The `./run` script sources `.env` if present

7. Workflow
   - When starting fresh work with no outstanding changes, rebase to master first (`git pull --rebase origin master`) to get the latest
   - After pushing, always monitor GitHub Actions with `gh run watch`
   - Use `/frontend-design` skill for any UI work
   - Run `/code-review:code-review-local` before committing significant changes (new endpoints, database changes, major refactors)

8. Playwright
   - Never wait for pages to load — our pages are fast, Playwright snapshots are instant
   - Playwright MCP is configured with `--isolated` so each agent gets its own browser context
   - When testing with Playwright, use `./run start-dynamic` to start the dev server on a random free port (PORT=0)
   - This avoids port conflicts when multiple agents run concurrently across worktrees
   - The server prints its URL on startup — use that URL in Playwright navigation

9. IF Archive Proxy
   - `PROXY_URL` and `PROXY_TOKEN` in `.env` enable local dev to proxy ifarchive.org requests through the deployed worker
   - The worker secret `PROXY_TOKEN` must also be set via `wrangler secret put PROXY_TOKEN` with the same value
   - Without these env vars, local dev fetches ifarchive.org directly (will 451 in UK)
   - If a game story returns **HTTP 451**, the `.env` is missing or not being sourced — check the symlink exists and `bootstrap.sh` sources it
   - The server logs `Using IF Archive proxy via <url>` on startup when the proxy is active — if you don't see this, the env is not loaded

10. wasiglk Dependency
    - wasiglk lives at `/home/dan/Projects/wasiglk`, published to JSR as `@bodar/wasiglk`
    - talebrary uses it via `npm:@jsr/bodar__wasiglk@<version>` in package.json
    - **Update flow**: commit+push wasiglk → wait for CI to publish to JSR → update version in talebrary package.json → `bun install` → `./run build` → commit+push talebrary
    - **Never** manually build worker.js from wasiglk source without going through JSR publish first
    - wasiglk commands: `./run clean` (always before rebuilding), `./run build`


On the first start of every chat, tell me the number of Core Rules that have been read