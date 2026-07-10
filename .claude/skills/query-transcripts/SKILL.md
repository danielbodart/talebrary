---
name: query-transcripts
description: Query Talebrary player transcripts stored in R2 SQL (Cloudflare Data Catalog / Iceberg), and turn the raw GlkOte `output` JSON into readable prose. Use when analysing playthroughs, mining game text (opening scenes, descriptions), debugging sessions, or running any ad-hoc SELECT against the `talebrary.transcripts` table.
---

# Querying Talebrary Transcripts (R2 SQL)

Player sessions are streamed to a Cloudflare **R2 Data Catalog** (Apache Iceberg)
table and queried with **R2 SQL** via wrangler. Two helpers wrap the boilerplate:

- `./analytics/r2sql "<SQL>"` — run any query. Handles warehouse + auth.
- `bun analytics/transcript.ts <game_id>` — print a readable playthrough
  (parses the GlkOte `output` JSON into prose).

## Auth (the one gotcha)

R2 SQL needs a **bearer token** — a normal `wrangler login` (OAuth) does **not**
work. `r2sql` resolves a token from, in order: `$WRANGLER_R2_SQL_AUTH_TOKEN`,
`$CLOUDFLARE_API_TOKEN`, then `CLOUDFLARE_API_TOKEN` in `.env` (parsed even if the
line is commented out — its default state). The token needs **R2 read + Data
Catalog read**. If you see `Missing WRANGLER_R2_SQL_AUTH_TOKEN`, no token resolved.

Warehouse: `3bbeb229e66e19d6e65b2360d0e225b8_talebrary-analytics`
(regenerate with `bunx wrangler r2 bucket catalog get talebrary-analytics`).

## Schema — `talebrary.transcripts`

One row = one stanza (one input→output turn). Authoritative def:
`docs/transcripts-schema.json`; produced by `src/events/CloudflarePipelineAdapter.ts`.

| column | type | notes |
|---|---|---|
| `session_id` | string | one browser play session (UUID) |
| `game_id` | string | IFDB TUID, e.g. `iv3hkbnontc5come` |
| `seq` | int32 | stanza order **within a session** (client-assigned) |
| `input_type` | string | `init`, `arrange`, `char`, `line`, `unknown`, … |
| `input_text` | string? | what the player typed (null for non-line input) |
| `output_text` | string? | **pre-extracted visible text** (has newlines) |
| `input` / `output` | json | raw GlkOte stanzas (single-line JSON) |
| `input_at`/`output_at`/`received_at` | timestamp | |

## Recipes

```bash
# Shape of the data
./analytics/r2sql "SHOW TABLES IN talebrary;"
./analytics/r2sql "DESCRIBE talebrary.transcripts;"

# Sessions for a game, richest first
./analytics/r2sql "SELECT session_id, COUNT(*) n FROM talebrary.transcripts \
  WHERE game_id='iv3hkbnontc5come' GROUP BY session_id ORDER BY n DESC LIMIT 10"

# Readable playthrough (auto-picks the longest session)
bun analytics/transcript.ts iv3hkbnontc5come --limit 20
bun analytics/transcript.ts iv3hkbnontc5come --session <uuid> --input

# JSON functions (R2 SQL, since Apr 2026) — for JSON stored *as a string* column
./analytics/r2sql "SELECT json_get_str(output, 'type') FROM talebrary.transcripts LIMIT 5"
```

## Processing the `output` JSON

`output` is a **GlkOte `update`** stanza. Readable prose lives in the **buffer**
window; the **grid** window is the status line / interpreter banner.

```
{"type":"update","content":[
  {"id":1, "text":[ {"content":[{"style":"normal","text":"You are in a wood."}]} ]},   // buffer
  {"id":2, "lines":[ {"content":[{"style":"normal","text":"Woods   Score: 0"}]} ]}     // grid/status
]}
```

Extract text = walk `content[].text[].content[].text` (buffer) and
`content[].lines[].content[].text` (grid). `analytics/transcript.ts` does exactly
this and mirrors the ingest pipeline's `extractOutputText`. `style:"input"` spans
are the player's echoed keystrokes — filtered out unless you pass `--input`.

For quick "does any output contain X" use `output_text` (already extracted) rather
than `output`.

## Gotchas

- **`LIKE` is case-sensitive.** `%Crusade%` ≠ `%CRUSADE%`.
- **Substring search on `output` splits mid-phrase.** GlkOte breaks text across
  style runs, so `output LIKE '%Godfrey de Goodheart%'` can miss text that is
  visibly present. Search a single word, or search `output_text`.
- **`seq` resets per session** — always filter/order with `session_id`.
- **Many sessions per `game_id`** — dedupe or pick one; `transcript.ts` auto-picks
  the longest.
- **Coverage = games actually played.** Not every catalogued game has transcripts.
- **`Read 0 B across 0 files`** in output is normal for metadata/small queries.
- R2 SQL is in **open beta** — grammar may change.
