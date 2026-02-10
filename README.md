# Talebrary

An interactive fiction platform for discovering and playing 3,000+ text adventure games. Browse a curated catalogue, play classics like Zork in the browser, and enjoy AI-generated cover art and illustrations throughout.

## Architecture Overview

Two runtimes, one codebase:

- **Bun** for local development (`src/bun/app.ts`)
- **Cloudflare Workers** for production (`src/cloudflare/app.ts`)

Both share the same application logic via `Application.ts`, which wires everything together using dependency injection (`@bodar/yadic`). The only differences are the concrete implementations: SQLite vs D1, folder vs R2, direct workflow execution vs Cloudflare Workflows.

```
Request → EtagHandler → CacheControlHandler → TemplateHandler → Routing → Handler
```

`Http` is the universal type: `(request: Request) => Promise<Response>`. Handlers are composed by decorating this function — no frameworks, no middleware stacks.

## The Catalogue

The catalogue uses a library metaphor:

- **Atrium** (`/`) — the entrance hall with search and links to each wing
- **Wings** (`/catalogue/{wing}`) — genre collections (Fantasy, Sci-Fi, Horror, etc.) and special collections (Top-Rated, Classics, Recent)
- **Aisles** (`/catalogue/{wing}/{aisle}`) — individual category pages listing games

Each level is a server-rendered HTML page with AI-generated scene illustrations.

## Content & Game Playing

- **Game detail** (`/content/{id}`) — title, author, cover art, description, and a play button
- **Story files** (`/content/{id}/story`) — proxied from the IF Archive (or cached in R2)
- **Cover art** (`/content/{id}/cover-art`) — AI-generated via a durable workflow
- **Suggestions** (`/content/{id}/suggestions`) — AI command hints during play

The in-browser player uses [wasiglk](https://jsr.io/@bodar/wasiglk) — a WASM-based IF interpreter supporting Z-code, Glulx, Hugo, TADS, and more. It runs in a Web Worker with custom elements (`<interactive-fiction>`, `<buffer-window>`, `<user-input>`, etc.) rendering the game UI.

## HTML Rendering & Templates

Pages are rendered server-side using JSX (`@bodar/jsx2dom` + `linkedom`). Each handler returns a complete `<html>` document:

```tsx
return html5(jsx =>
    <html lang="en">
    <head>
        <title>Page Title</title>
        <meta name="template" content="card"/>
    </head>
    <body>
        {/* page content */}
    </body>
    </html>);
```

The `<meta name="template" content="..."/>` tag selects a layout template. `TemplateHandler` post-processes every HTML response:

1. Parses the response HTML
2. Applies **renderers** (e.g. JSON-LD breadcrumbs become rendered nav)
3. Selects a **template** (`default` or `card`) based on the meta tag
4. Wraps the content in `baseTemplate` — which provides shared `<head>` (fonts, favicon, viewport), stylesheets, and footer (analytics)
5. Processes **slots** to project content into the layout

### Slot system

**Named slots** project content from the page into the template:

```html
<!-- in baseTemplate -->
<slot name="head"></slot>   <!-- receives children of the page's <head> -->
<slot name="body"></slot>   <!-- receives children of the page's <body> -->
```

**Src slots** include other pages via internal HTTP fetch:

```html
<slot src="/some/partial.html"></slot>
```

This is recursive (max 10 levels deep) and uses the same `Http` function, so includes go through the full handler stack.

## Durable Workflows

Multi-step processes (cover art generation, illustrations) use a portable workflow abstraction:

```typescript
const workflow: Workflow<Params, Result> = async (params, step) => {
    const intermediate = await step.do('step-one', () => fetchSomething());
    return await step.do('step-two', () => transform(intermediate));
};
```

- `DirectRunner` executes workflows synchronously (Bun/tests)
- `CloudflareWorkflowRunner` delegates to Cloudflare Workflows with polling (production)
- Test with `InMemoryStep` — no runner needed

## Cloudflare Bindings

| Binding | Purpose |
|---------|---------|
| **D1** | Game metadata database (synced from IFDB) |
| **R2** | Cover art, illustrations, story file cache, static assets |
| **AI** | Text generation (Llama 3.3) and image generation (Flux 2, Leonardo Phoenix) |
| **Durable Objects** | IF Archive proxy with caching |
| **Workflows** | Cover art and illustration generation orchestration |

## Development

```bash
./run start          # Bun dev server with file watching
./run startw         # Wrangler dev --remote (real Cloudflare bindings)
./run test           # Run all tests
./run test path.ts   # Run specific test
./run check          # TypeScript type checking
./run build          # Full build (check + compile + test)
./run deploy         # Deploy to Cloudflare Workers + sync R2
```

Local dev requires a `.env` file (symlinked from the main repo in worktree setups) with `PROXY_URL` and `PROXY_TOKEN` for IF Archive access.

## Project Structure

```
src/
  bun/           Local dev composition root
  cloudflare/    Production composition root + Durable Object/Workflow entrypoints
  catalogue/     Atrium, Wing, Aisle handlers
  content/       Game detail, cover art, story, suggestions, illustrations
  player/        Client-side custom elements for the IF player
  templates/     Base template, slot processing, renderers
  games/         Game finder queries
  workflows/     Portable workflow definitions
  ai/            AI abstraction (TalebraryAi interface)
  storage/       Bucket abstraction (R2 / folder)
  database/      Database abstraction (D1 / SQLite)
  http/          Http type, URI parsing, caching middleware
  events/        Event tracking
  system/        Clock, timers, digest utilities
www/             Compiled client assets
db/              Database schema and sync tooling
test/            Tests (mirrors src/ structure)
```
