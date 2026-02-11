---
paths:
  - "src/ai/**"
  - "src/cloudflare/**"
  - "src/workflows/**"
  - "test/contracts/**"
  - "wrangler.toml"
---

# Durable Workflows

- Multi-step processes (multiple AI calls, fetch + transform) must use the workflow abstraction in `src/workflows/`
- Single-step handlers do not need workflows
- `Workflow<Params, Result> = (params, step) => Promise<Result>` — portable, no Cloudflare imports
- `Step.do(name, fn)` matches Cloudflare's `WorkflowStep.do()` natively
- `WorkflowRunner<P, R>` abstracts execution: `DirectRunner` (Bun/tests), `CloudflareWorkflowRunner` (production)
- **Every workflow needs its own Cloudflare Workflow binding** — `DirectRunner` is only for Bun/tests
- Each workflow gets: `[[workflows]]` in `wrangler.toml`, entrypoint class in `cloudflare/app.ts`, `CloudflareWorkflowRunner` binding
- HTTP handlers stay thin: parse request → `runner.run(params)` → build response
- `BucketCachingHandler` remains as the outer HTTP caching wrapper
- Test workflows directly with `InMemoryStep` — no runner needed

# Cloudflare AI Models

- REST API (`CloudflareRestAi`) and native Workers binding (`env.AI`) can have **different input format requirements** for the same model — always check [Cloudflare model docs](https://developers.cloudflare.com/workers-ai/models/)
- **flux-2-klein** always requires `multipart/form-data`, even for text-to-image — other models accept JSON
- `CloudflareAiAdapter.toCloudflareImageInput()` handles model-specific formatting; `CloudflareRestAi.buildBody()` handles REST serialisation
- When adding a new image model, check both paths and add contract tests in `test/contracts/AiContract.test.ts`
