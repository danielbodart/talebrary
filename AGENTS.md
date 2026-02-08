@Web

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
   - Run `./run check` for TypeScript changes

4. Testing
   - Maintain existing tests, never delete without approval
   - Add tests for new code
   - Use in-memory test doubles over mocks
   - Never use mocks, especially not for HTTP
   - HTTP is a pure function (request in, response out) — inject it as a dependency, never mock it
   - In tests, use Http as a simple lambda — no servers or network needed
   - Maintain contract tests across interfaces
   - Run `./run test` (all) or `./run test [specific test file]`

5. Command Execution
   - Use `./run [command] [args]` when available
   - Check `./run` and `commands.sh` for already available commands
   - Examples: `./run test`, `./run deploy`


6. Worktree Setup
   - Main repo: `/home/dan/Projects/talebrary` (master)
   - Worktrees live in `/home/dan/Projects/talebrary-worktrees/<branch-name>`
   - When creating a new worktree, symlink `.env` from main repo: `ln -s /home/dan/Projects/talebrary/.env <worktree>/.env`
   - The `./run` script sources `.env` if present

7. Workflow
   - After pushing, always monitor GitHub Actions with `gh run watch`

8. Multi-Agent / Parallel Development
   - Playwright MCP is configured with `--isolated` so each agent gets its own browser context
   - When testing with Playwright, use `./run start-dynamic` to start the dev server on a random free port (PORT=0)
   - This avoids port conflicts when multiple agents run concurrently across worktrees
   - The server prints its URL on startup — use that URL in Playwright navigation

9. IF Archive Proxy
   - `PROXY_URL` and `PROXY_TOKEN` in `.env` enable local dev to proxy ifarchive.org requests through the deployed worker
   - The worker secret `PROXY_TOKEN` must also be set via `wrangler secret put PROXY_TOKEN` with the same value
   - Without these env vars, local dev fetches ifarchive.org directly (will 451 in UK)


On the first start of every chat, tell me the number of Core Rules that have been read