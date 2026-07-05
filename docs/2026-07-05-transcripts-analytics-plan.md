---
title: Transcript Analytics Pipeline
date: 2026-07-05
author: Daniel Bodart
type: plan
status: design-locked
tags: [analytics, transcripts, pipelines, r2, iceberg]
last_updated: 2026-07-05
---

# Transcript Analytics Pipeline — Plan

Status: **design locked, ready to build.** Blocked only on an R2 catalog token (user provides in the morning).

## Goal

Capture **every** play session's transcript stanzas (logged in *or* anonymous) into a
Cloudflare-native data lake, to build a dataset for analysing how games are played —
what commands players use in each room. This is the **analytics** track, separate from
the (future, per-user) save/restore track.

## Locked decisions

| Decision | Choice |
|---|---|
| Target | **Cloudflare Pipelines → R2 Data Catalog (Apache Iceberg)** raw lake |
| Beta | Proceed on open-beta stack (Pipelines / R2 Data Catalog / R2 SQL all beta, billing not yet enforced) |
| Identity | `session_id` + `game_id` + `userId` (if available) |
| Query | R2 SQL (first-party) for common queries; DuckDB/Spark/PyIceberg for deep dives |
| Ingest path | browser → our Worker `/events` → `env` pipeline binding (NOT browser→pipeline direct: CORS undocumented, token exposure) |
| Schema style | **Hybrid** — hot scalar columns + raw `input`/`output` JSON kept whole |
| Extraction | In the **Worker adapter** (TypeScript, testable); client stays dumb, forwards raw stanzas |

## Architecture

```
Player (browser)                 Worker                        Cloudflare
client.transcript()   ─POST /events─▶ EventHandler (unchanged)
  recordTranscript:true  batches      → EventSender.send()
                                         └ CloudflarePipelineAdapter
                                             env.<BINDING>.send(records) ─▶ Stream
                                                                             └ (optional SQL transform)
                                                                                └ Sink → R2 Data Catalog
                                                                                   Iceberg: talebrary.transcripts
                                                                          query ◀── R2 SQL
```

Reuses the existing spine **untouched**: `/events` route + `EventHandler` (generic
`POST json → sender.send → 202`) + `EventSender` interface (one method), currently a
no-op stub in `Application.ts`. The player already `sendBeacon('/events', …)` for
scene events — same seam.

## Iceberg schema (locked)

| col | type | note |
|---|---|---|
| `session_id` | string | random per-play uuid (pseudonymous) |
| `game_id` | string | stanza `label` (storyId) |
| `seq` | int32 | **we assign** — per-session turn counter (order/dedupe; delivery is at-least-once) |
| `input_type` | string | line / char / timer / init / arrange / … |
| `input_text` | string | input event text (line→typed command, char→key; null for timer/etc) |
| `output_text` | string | concatenated visible output |
| `input_at` | timestamp | client input time |
| `output_at` | timestamp | client output time |
| `received_at` | timestamp | **worker** receive time — trust anchor (client clocks untrusted) |
| `input` | json | raw GlkOte input event (full fidelity) |
| `output` | json | raw GlkOte output update (full fidelity) |

Grouping: `input_*` (type/text/at/json), `output_*` (text/at/json), meta
(session_id/game_id/seq/received_at).

**Why hybrid:** R2 SQL supports nested (`get_field()`, bracket, array/map/json funcs)
but **no `UNNEST`** — so pre-extract the fields we group/filter on hourly; keep raw
JSON for replay/deep analysis. Iceberg schema evolution is metadata-only (add/drop/
rename columns without rewrite; new cols read NULL on old rows). **Raw is retained →
any future column is backfillable by reprocessing `input`/`output`.** Nothing is lost.

`seq` and `received_at` are the two fields NOT in the wasiglk stanza — talebrary adds them.

## wasiglk stanza (source) — v0.104.30, already installed

`client.transcript(): AsyncIterableIterator<TranscriptStanza[]>`, requires `updates()`
iterated concurrently. Stanza shape:
`{ format:'glkote', input, output, sessionId, label, timestamp, outtimestamp }`.
Enable via `createClient({ recordTranscript:true, transcriptLabel: storyId })`.

## Implementation steps (resume here)

**0. DONE:** wasiglk bumped `0.91.20 → 0.104.30`, `bun install`, `./run build` green (384 tests).

**1. CF resources** (needs R2 Admin R/W **catalog token** — user provides). Names:
bucket `talebrary-analytics`, namespace `talebrary`, table `transcripts`,
stream `talebrary-transcripts`, sink `transcripts-sink`, binding `TRANSCRIPTS`.
```
wrangler r2 bucket create talebrary-analytics
wrangler pipelines streams create talebrary-transcripts --schema-file docs/transcripts-schema.json
wrangler pipelines sinks create transcripts-sink --type r2-data-catalog \
  --bucket talebrary-analytics --namespace talebrary --table transcripts \
  --catalog-token <R2_ADMIN_TOKEN> --roll-interval 60
wrangler pipelines create talebrary-transcripts-pipe --stream talebrary-transcripts --sink transcripts-sink
```
(Verify exact current CLI flags vs docs at build time — Pipelines is beta, syntax churns.
Binding config field is `stream` (was `pipeline`, renamed 2026-05-27).)
Write the stream schema (the 11 fields above) to `docs/transcripts-schema.json` for `--schema-file`.

**2. Worker plumbing** (no wasiglk change; prove with synthetic POST first):
- `src/events/CloudflarePipelineAdapter.ts` — `implements EventSender`; `send(event)`:
  if `event.stanzas` present → map each stanza → record (extract `input_type`/`input_text`/
  `output_text`/`room`... wait `room` dropped? NO — `room` is NOT in final schema; the
  "per-room" key is derived later from `output`/`output_text`. Re-confirm: final schema
  has NO `room` column — it was cut in favour of deriving from raw. **Double-check with
  user: do we want a `room` scalar now, or derive later?** Current locked table above has
  no `room`. If wanted, add `room string`.) → set `received_at` = now → `env.TRANSCRIPTS.send(records)`;
  else (page_view etc.) → ignore (keep the table single-schema).
- Wire in `src/cloudflare/app.ts` `deps(env)`: `eventSender: new CloudflarePipelineAdapter(env.TRANSCRIPTS)`.
- Bun root keeps no-op stub (Pipelines is CF-only) — optional console sender for local.
- `wrangler.toml`: add pipeline binding block; regen `worker-configuration.d.ts` via `wrangler types --no-include-runtime`.
- Tests: `CloudflarePipelineAdapter` with an in-memory pipeline double (records captured); assert stanza→record mapping + `received_at` set + non-transcript events ignored.

**3. Client capture** — `src/player/main.ts`:
- `createClient({ …, recordTranscript:true, transcriptLabel: storyId })`.
- Concurrent loop alongside `ifEl.run(client)`:
  `for await (const batch of client.transcript()) { buffer.push(...batch); if (buffer.length>=10) flush(); }`
  assign per-session `seq` as stanzas are buffered; `flush()` = `fetch('/events',{method:'POST',keepalive:true,body:JSON.stringify({stanzas:buffered, sessionId, gameId})})`.
  Final flush on `pagehide`. Use `fetch keepalive`, NOT `sendBeacon` (stanza batches exceed ~64KB cap).
- Deploy (CI) → real data flows.

**4. Query** — R2 SQL recipes, e.g. commands per room:
```
wrangler r2 sql query <WAREHOUSE> \
 "SELECT game_id, output_text, input_text, COUNT(*) n
  FROM talebrary.transcripts WHERE input_type='line'
  GROUP BY game_id, output_text, input_text ORDER BY n DESC"
```

## Key facts / gotchas

- Delivery: **at-least-once, best-effort order** (docs contradict the "exactly-once" marketing). Dedupe on `session_id`+`seq`.
- Limits: ≤5 MB/request, ≤5 MB/s per stream, 429 backpressure → adapter must handle throw/retry (or `ctx.waitUntil` + swallow; analytics is best-effort).
- `/events` is unauthenticated + no rate limit today — fine for "capture everything," but an open public sink is spoofable; consider a cheap rate-limit later if abused.
- Cost drivers (when billing on): Parquet sink egress $0.06/GB + R2 storage + catalog ops/compaction. Cheap at IF scale.
- Sink `roll-interval` ≥60s (writing too often fights compaction).

## Open question to resolve at build

- **`room` scalar**: final table above omits it (derive from `output_text`/raw later). Confirm whether to add `room string` now (extract status/grid window in the adapter — `SceneDetector` already extracts scene title/desc client-side and could tag batches). Leaning: add it, it's the headline analysis key and cheap to extract in the adapter.

## Reference docs
- Pipelines: https://developers.cloudflare.com/pipelines/
- Stream schema types: https://developers.cloudflare.com/pipelines/streams/manage-streams/
- R2 Data Catalog sink: https://developers.cloudflare.com/pipelines/sinks/available-sinks/r2-data-catalog/
- R2 SQL: https://developers.cloudflare.com/r2-sql/
