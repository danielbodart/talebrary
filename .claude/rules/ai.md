---
paths:
  - "src/ai/**"
  - "src/prompts/**"
  - "src/bun/CloudflareRestAi.ts"
  - "evals/**"
---

# AI Gateway: ON, with a self-healing fallback (do not "simplify" the retry away)

Prod (`src/cloudflare/app.ts`) routes Workers AI through the `"default"` AI
Gateway for logging/caching. `CloudflareAiAdapter.run()` wraps every call: it
tries through the gateway and, **only** on the exact error
`AiInternalError: AI Gateway does not support ReadableStreams yet`, retries the
same request directly against Workers AI (no gateway).

**Why the fallback exists:** the gateway cannot proxy a `ReadableStream` request
body. flux-2-klein img2img (style transfer) *must* send its multipart body as a
stream via the `env.AI` binding (see below), so those calls fail through the
gateway. Without the fallback the cover-art workflow silently caught the error
and served the plain phoenix book cover instead of the real style transfer
(regression from commit b2152a5, 2026-07-03; text/JSON calls were unaffected,
which is why it was subtle).

**Why match the exact error string (not a blanket catch):** a blanket retry
would re-run — and double-bill — a genuinely failed generation. The gateway
stream rejection is a *pre-flight* error (no model runs), so the real
invocation happens exactly once, on the direct retry.

**Why `run()` takes a `buildInput` thunk, not a value:** the multipart body is a
single-use stream; the retry must rebuild it. The image bytes are already in
memory (`coverArt.ts` `readBase64`), so rebuilding is a cheap re-serialize, not
a re-fetch — no file is read twice.

Self-healing both ways: no gateway id -> always direct; if Cloudflare later
supports streamed multipart, the retry simply stops firing. Local dev
(`src/bun/app.ts`) calls Workers AI directly and buffers multipart to bytes, so
it never hits this path.

# FLUX.2 on Cloudflare Workers AI

**IMPORTANT**: The official Cloudflare docs do NOT document the img2img / multipart binding format. Do not search the web for this — the information below was gathered through experimentation and is the authoritative reference for this project.

## img2img (multi-reference editing)

FLUX.2 [dev] supports up to **4 input images** (512x512 each), output up to **4 megapixels**. Uses `multipart/form-data` — this is the only supported format for image inputs.

Reference images in prompts by index: `"take the subject of image 2 and style it like image 1"`.

### REST API (`CloudflareRestAi`)

```bash
curl -X POST \
  'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/ai/run/@cf/black-forest-labs/flux-2-dev' \
  -H 'Authorization: Bearer {TOKEN}' \
  -H 'Content-Type: multipart/form-data' \
  -F 'prompt=a sunset with the dog in the original image' \
  -F input_image_0=@/path/to/image.png \
  -F steps=25 \
  -F width=1024 \
  -F height=1024
```

Response: `application/json` with `{"result": {"image": "<base64>"}}`.

### Workers AI binding (`env.AI`)

The binding requires a **ReadableStream** body, NOT raw FormData. Serialize via `new Response(form)`:

```ts
const form = new FormData();
form.append('input_image_0', new Blob([bytes], {type: 'image/jpeg'}));
form.append('prompt', 'a sunset with the dog in the original image');

// IMPORTANT: Read content-type BEFORE .body — Bun clears headers after body access
const response = new Response(form);
const contentType = response.headers.get('content-type');

const resp = await env.AI.run("@cf/black-forest-labs/flux-2-dev", {
    multipart: { body: response.body, contentType }
});
```

- Passing `FormData` directly as body fails with error 3043
- The `contentType` must include the boundary (from Response serialization)
- `CloudflareAiAdapter.toCloudflareImageInput()` handles this automatically
- **Bun bug**: accessing `.body` on `new Response(FormData)` clears the Content-Type header — always read headers first

## FLUX prompting rules

**No negative prompts** — FLUX does not support them. Use positive framing:

| Instead of | Write |
|---|---|
| "no borders" | "edge-to-edge composition" |
| "no blur" | "crisp focus, detailed textures" |
| "no text" | "pure visual composition" |
| "not cartoonish" | "photorealistic rendering" |

**Natural language, not keywords** — write prose descriptions, not comma-separated tag lists. Quality tags ("masterpiece", "8k", "best quality") have minimal effect and should be omitted.

**What matters most**:
1. **Lighting** — has the biggest impact on output quality. Be specific about direction, quality, colour.
2. **Subject + action + context** — describe the scene clearly
3. **Style** — specify artistic style if not photorealistic
4. **Hex codes** — FLUX.2 understands specific colours: `#F48120 vibrant orange`
5. **Typography** — wrap text in quotes: `"Welcome Home"`
6. **JSON prompting** — FLUX.2 accepts structured JSON prompts with scene/subjects/lighting/camera fields (sent as the `prompt` form field)

**Recommended parameters**: steps 25–50 (25 for speed, 50 for quality), guidance 3.5–4 (lower than typical diffusion models).

## Character consistency

FLUX.2's multi-reference inputs solve stochastic drift — identity/product/style stays consistent across generations. Reference specific subjects: `"the woman with short black hair"` not pronouns. For iterative editing, break complex changes into sequential steps.
