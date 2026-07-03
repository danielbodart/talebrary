# Talebrary

[**talebrary.com**](https://talebrary.com/) — an interactive fiction platform for discovering and playing 2,000+ playable text adventure games in the browser, with AI-generated cover art, scene illustrations, and intelligent command suggestions.

## AI Pipelines

Every game in the catalogue gets unique AI-generated artwork, and players get real-time AI assistance during gameplay. This is powered by three distinct pipelines, each orchestrating multiple Cloudflare Workers AI models.

### Cover Art Generation

Each game's cover art is produced by a durable workflow that chains text and image models with a multi-strategy fallback:

**When the game has existing cover art** (from IFDB):

1. **Store original** — Fetch and persist the source image in R2
2. **Style transfer** — Pass the original through [FLUX.2 Klein](https://developers.cloudflare.com/workers-ai/models/flux-2-klein-9b/) (img2img) with a graphic-novel style prompt
3. **LLM-enhanced style transfer** (fallback) — If plain style transfer fails, use [Llama 3.3 70B](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/) to extract a visual scene description from the game's metadata, combine it with the style prompt, and retry FLUX.2 with the richer context
4. **Pure generation** (final fallback) — Generate a fresh image with [Leonardo Phoenix](https://developers.cloudflare.com/workers-ai/models/leonardo-phoenix-1.0/) using just the title

**When there's no existing art:**

1. **Scene extraction** — Llama 3.3 reads the game's title and description to produce an image prompt
2. **Image generation** — Leonardo Phoenix generates the cover art from that prompt

The pipeline always produces something — the fallback chain ensures no game goes without cover art.

### Scene Illustrations

During gameplay, the illustration workflow generates contextual artwork for the current scene:

1. **Prompt generation** — Llama 3.3 receives the full scene context: the story's title and description, the current scene, and optionally the previous scene. It generates an image prompt that's consistent with the narrative — if the previous scene was underground, the new illustration won't suddenly be outdoors unless the text says so.
2. **Image generation** — Leonardo Phoenix renders the scene. The model can be overridden per-request for experimentation.

The LLM returns a 404 status (in JSON) when a scene has no visual content worth illustrating — the workflow gracefully falls back to a stylised book cover rather than generating a meaningless image.

### Command Suggestions

The suggestions pipeline powers an interactive command UI during gameplay. Llama 3.3 analyses the current scene and returns a structured `SuggestionTree` — a mapping of verbs to applicable nouns extracted from the scene description:

```json
{
  "people": true,
  "tree": {
    "examine": ["atrium", "library", "bookcases", "desk", "sandwich"],
    "ask": ["librarian"],
    "take": ["sandwich"],
    "open": ["drawer"],
    "east": [],
    "inventory": []
  }
}
```

The LLM works from a fixed command vocabulary (directions, object interactions, people commands, game controls) and only includes commands and nouns that are relevant to the current scene, sorted by usefulness.

### Models

| Model | Type | Used For |
|-------|------|----------|
| [Meta Llama 3.3 70B](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/) | Text (instruct) | Scene extraction, illustration prompts, command suggestions |
| [FLUX.2 Klein 9B](https://developers.cloudflare.com/workers-ai/models/flux-2-klein-9b/) | Image (img2img) | Style transfer on existing cover art — always uses multipart/form-data |
| [Leonardo Phoenix 1.0](https://developers.cloudflare.com/workers-ai/models/leonardo-phoenix-1.0/) | Image (text-to-image) | Cover art generation, scene illustrations |

## Caching Architecture

AI generation is expensive, so every generated asset is cached through multiple layers to ensure models are only ever called once per resource.

```
Browser cache (ETag / If-None-Match → 304)
  └─ Cloudflare CDN (public, max-age=60, stale-while-revalidate=600)
       └─ ETag middleware (automatic MD5-based ETags on all responses)
            └─ Cache-Control middleware (default public caching policy)
                 └─ R2 write-through cache (BucketCachingHandler)
                      └─ Origin handler (AI workflow / IF Archive / etc.)
```

**R2 as a write-through cache** — `BucketCachingHandler` wraps the AI handlers for cover art, illustrations, suggestions, and story files. On first request, it calls the origin, stores the result in R2 (keyed by URL path + MD5 of query params), and returns it. Subsequent requests are served directly from R2 with full ETag support for conditional requests. A `?reload` parameter forces cache bypass and regeneration.

**HTTP caching middleware** — Every response flows through two decorators: `CacheControlHandler` stamps a default `public, max-age=60, stale-while-revalidate=600` policy, and `EtagHandler` computes strong ETags and handles `If-None-Match` → 304 short-circuiting. These work together with Cloudflare's CDN edge caching.

**Original cover art** gets `max-age=31536000` (1 year) — it's fetched once from the source and never changes. Generated assets get shorter TTLs but are effectively permanent in R2.

## Cloudflare Workers Platform

The production deployment runs entirely on Cloudflare's edge platform:

| Service | Purpose |
|---------|---------|
| **Workers** | Application runtime — server-rendered HTML, API endpoints, routing |
| **Workers AI** | All model inference (Llama 3.3, FLUX.2, Leonardo Phoenix) |
| **D1** | Game catalogue database (synced from IFDB) |
| **R2** | Object storage for generated images, story files, and static assets |
| **Durable Objects** | IF Archive proxy — routes all ifarchive.org requests through a US-East data centre to avoid UK geo-blocking (HTTP 451) |
| **Workflows** | Durable orchestration of multi-step AI pipelines with step-level persistence |

### Portable Workflow Abstraction

The AI pipelines use a workflow abstraction that's decoupled from Cloudflare:

```typescript
type Workflow<Params, Result> = (params: Params, step: Step) => Promise<Result>;
```

`Step.do(name, fn)` maps directly to Cloudflare's `WorkflowStep.do()` in production, giving durable execution with step-level persistence. In local dev and tests, `DirectRunner` executes workflows synchronously with `InMemoryStep`. The workflow code itself has no Cloudflare imports — it's just async functions with dependency injection.

## WebAssembly — Playing Text Adventures in the Browser

The in-browser player is powered by [**wasiglk**](https://github.com/bodar/wasiglk) ([JSR](https://jsr.io/@bodar/wasiglk)) — a companion library that compiles classic interactive fiction interpreters to WebAssembly. It supports 17 interpreters covering virtually every IF format ever created:

| Interpreter | Formats |
|-------------|---------|
| Fizmo | Z-machine v1-8 (.z1-.z8, .zblorb) |
| Glulxe, Git | Glulx (.ulx, .gblorb) |
| Hugo | Hugo (.hex) |
| TADS 2, TADS 3 | TADS (.gam, .t3) |
| Alan 2, Alan 3 | Alan (.acd, .a3c) |
| Scare | ADRIFT (.taf) |
| Agility | AGT (.agx) |
| AdvSys, Level 9, Magnetic, Scott, Plus, Taylor, JACL | Various legacy formats |

The interpreters are compiled from their original C sources using **Zig as a cross-compiler** targeting `wasm32-wasi`. They run in a **Web Worker** with a WASI shim providing the system interface. The key challenge is that these interpreters are synchronous C programs that block on `read()` for player input — this is solved using **JSPI** (JavaScript Promise Integration), which allows the WebAssembly execution to suspend at the `fd_read` WASI call and resume when the player's input arrives as a resolved Promise.

Communication between the interpreter and the browser uses the **RemGlk JSON protocol** — the WASM module reads JSON input events and writes JSON update objects describing window layout, text content, and input requests. Custom elements (`<interactive-fiction>`, `<buffer-window>`, `<grid-window>`, `<user-input>`) render the game UI on the main thread.

## Architecture

Two runtimes, one codebase:

- **Bun** for local development (`src/bun/app.ts`)
- **Cloudflare Workers** for production (`src/cloudflare/app.ts`)

Both share the same application logic via `Application.ts`, which wires everything together using dependency injection (`@bodar/yadic`). The only differences are the concrete implementations: SQLite vs D1, folder vs R2, direct workflow execution vs Cloudflare Workflows.

`Http` is the universal type: `(request: Request) => Promise<Response>`. Handlers are composed by decorating this function — no frameworks, no middleware stacks.

### The Catalogue

The catalogue uses a library metaphor:

- **Atrium** (`/`) — the entrance hall with search and links to each wing
- **Wings** (`/catalogue/{wing}`) — genre collections (Fantasy, Sci-Fi, Horror, etc.) and special collections (Top-Rated, Classics, Recent)
- **Aisles** (`/catalogue/{wing}/{aisle}`) — individual category pages listing games

Each level is a server-rendered HTML page with AI-generated scene illustrations.

## Project Structure

```
src/
  ai/            AI abstraction (TalebraryAi interface + adapters)
  workflows/     Portable workflow definitions (cover art, illustration)
  prompts/       LLM and image prompt templates
  storage/       Bucket abstraction (R2 / folder) + BucketCachingHandler
  http/          Http type, URI parsing, ETag + Cache-Control middleware
  catalogue/     Atrium, Wing, Aisle handlers
  content/       Game detail, cover art, story, suggestions, illustrations
  player/        Client-side custom elements for the IF player
  templates/     Base template, slot processing, renderers
  games/         Game finder queries
  database/      Database abstraction (D1 / SQLite)
  bun/           Local dev composition root
  cloudflare/    Production composition root + Durable Object/Workflow entrypoints
  events/        Event tracking
  system/        Clock, timers, digest utilities
www/             Compiled client assets
db/              Database schema and sync tooling
test/            Tests (mirrors src/ structure)
```

## Development

```bash
./run start          # Bun dev server with file watching
./run startw         # Wrangler dev with remote bindings (real D1, R2, AI)
./run test           # Run all tests
./run check          # TypeScript type checking
./run build          # Full build (check + compile + test)
```
