# Worktree Setup

- Main repo: `/home/dan/Projects/talebrary` (master)
- Worktrees: `/home/dan/Projects/talebrary-worktrees/<branch-name>`
- Create: `git -C /home/dan/Projects/talebrary worktree add /home/dan/Projects/talebrary-worktrees/<branch> -b <branch>`
- Symlink `.env`: `ln -s /home/dan/Projects/talebrary/.env <worktree>/.env`
- `./run` sources `.env` if present

# IF Archive Proxy

- `PROXY_URL` and `PROXY_TOKEN` in `.env` enable local dev to proxy ifarchive.org through the deployed worker
- Worker secret must also be set via `wrangler secret put PROXY_TOKEN`
- Without these env vars, local dev fetches ifarchive.org directly (will 451 in UK)
- **HTTP 451** = `.env` missing or not sourced — check symlink exists and `bootstrap.sh` sources it
- Server logs `Using IF Archive proxy via <url>` on startup when active — no log = env not loaded

# Wrangler Dev

- `./run startw` uses `wrangler dev` (NOT `--remote`) with `remote: true` bindings in `wrangler.toml`
- This runs worker + workflow code **locally** while D1, R2, and AI connect to remote Cloudflare services
- Do NOT use `wrangler dev --remote` — it runs workflow code on the deployed version, not the local preview
- The AI binding always uses remote regardless of config (with a warning if `remote: true` not set)

# Playwright Testing

- Never wait for pages to load — pages are fast, snapshots are instant
- Playwright MCP uses `--isolated` — each agent gets its own browser context
- Use `./run start-dynamic` for dev server on random port (PORT=0) — avoids port conflicts across worktrees
- Server prints its URL on startup — use that URL for navigation
