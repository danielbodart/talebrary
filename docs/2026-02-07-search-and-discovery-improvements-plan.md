---
title: Search & Discovery Improvements
date: 2026-02-07
author: Daniel Bodart
type: plan
status: complete
tags: [search, discovery, i18n, browse, catalogue]
last_updated: 2026-02-07
---

# Search & Discovery Improvements

## Context

Exploration of the SQLite database (12,000+ games, 3,400+ playable) and production site revealed several opportunities to improve how users find and discover games on Talebrary.

### Key Findings

1. **No language awareness** - Search returns games in all languages regardless of the user's locale. There are ~3,000 English playable games, ~85 French, ~66 Spanish, ~65 German, ~53 en-US, ~46 Italian, etc.

2. **No browse/discovery** - The only entry point is free-text search. The data has rich genre, forgiveness, tag, and system metadata that could power curated catalogues.

3. **IF Archive UK block** - ifarchive.org returns 451 (UK Online Safety Act) for UK traffic. Since the Cloudflare Worker runs in a UK region, any uncached game sourced from ifarchive.org fails to load. This affects the vast majority of the catalogue.

4. **Rich metadata exists** - The database has genres (Fantasy 1300, Horror 737, Sci-Fi 729, etc.), forgiveness ratings (Merciful 1680, Polite 863, Tough 363, Cruel 201), publication years (1995-2023), tags, and series data.

---

## 1. Language-Aware Search

### Problem
A French user searching on Talebrary gets English results. A Spanish user has no way to filter to Spanish games. The `language` field exists in the `games` table but isn't used in search or display.

### Approach
- Read `Accept-Language` header from the request
- Map browser locale to the `language` values in the DB (`en`, `fr`, `es`, `de`, `it`, `en-US`, `en-GB`, etc.)
- When a user's locale matches a non-English language with games (fr: 85, es: 66, de: 65, it: 46), boost games in their language
- Don't hard-filter (would hide the majority of content), instead add a scoring boost
- For empty search (homepage), show games matching the user's locale first

### Database Values to Handle
```
en      (10,084)   - default
fr         (323)   - Accept-Language: fr
es         (565)   - Accept-Language: es
de         (255)   - Accept-Language: de
it         (166)   - Accept-Language: it
en-US      (134)   - Accept-Language: en-US
en-GB       (32)   - Accept-Language: en-GB
sv          (30)   - Accept-Language: sv
cs          (82)   - Accept-Language: cs
ru          (73)   - Accept-Language: ru
```
Note: `en, es` (38 games) and `en, fr` (34 games) are multilingual games — these should match either locale.

### Changes
- `D1GameFinder.find()` — accept optional `language` parameter, add `CASE WHEN g.language LIKE ? THEN 2 ELSE 0 END` to the score calculation
- `ContentSearch.handle()` — extract `Accept-Language`, parse primary locale, pass to finder
- Consider adding a language filter dropdown to the search UI in future

---

## 2. Curated Catalogues

### Problem
Users have no way to browse by category. The homepage goes straight to an empty search box. New users don't know what's available or where to start.

### Proposed Catalogues

Based on the data, these categories have enough depth and clear audience:

#### By Genre (top-level)
| Genre | Playable Games | Notes |
|-------|---------------|-------|
| Fantasy | ~1,300 | Largest category by far |
| Horror | ~737 | Strong community |
| Science Fiction | ~729 | |
| Slice of Life | ~464 | Modern IF trend |
| Mystery | ~449 | Classic genre |
| Humor | ~412 | Popular |
| Surreal | ~290 | Unique to IF |
| Historical | ~148 | |

#### Curated Collections
| Collection | Criteria | Audience |
|-----------|----------|----------|
| **Classics** | 100+ reviews, rating >= 4.0 | Everyone — best of all time |
| **New to IF?** | Forgiveness=Merciful, rating >= 4.0, 20+ reviews | Beginners |
| **Most Popular** | Top 20 by review count | Casual browsers |
| **Hidden Gems** | Rating >= 4.0, 5-20 reviews | Adventurous players |
| **IFComp Winners** | Tagged "IFComp", highest rated | Competition fans |
| **Short Games** | Tagged "short", high rated | Time-limited players |
| **[Language]** | language=fr/es/de/it | Non-English speakers |

#### "Classics" Collection (sample — these are validated working on production)
- Anchorhead (4.60, 382r) — Horror
- Violet (4.42, 375r) — Romance/Slice of life
- Lost Pig (4.46, 1452r) — Fantasy/Humor
- Counterfeit Monkey (4.76, 458r) — Espionage
- Photopia (4.29, 3288r) — Slice of life

#### "New to IF?" Collection (sample — Merciful + English + high rated)
- Eat Me (4.56, 94r) — Fantasy
- The Impossible Bottle (4.53, 74r)
- Alias 'The Magpie' (4.44, 128r) — Comedy
- Blue Lacuna (4.42, 216r) — Sci-Fi
- Photopia (4.29, 3288r) — Slice of life

### Approach
- Homepage shows catalogue tiles/sections before search
- Each catalogue is a pre-defined query with cached results
- Catalogue pages reuse the existing card layout
- Could be static (built at deploy time) or dynamic (D1 queries with caching)

### Changes
- Add new route `/catalogue/{name}` or similar
- New `D1GameFinder` methods for catalogue queries (or parameterised `find()`)
- Homepage redesign to show catalogues alongside search
- Catalogue metadata (name, description, query criteria) stored as config or in DB

---

## 3. IF Archive UK Block Workaround

### Problem
ifarchive.org returns HTTP 451 for UK traffic due to the UK Online Safety Act (since ~July 2025). The Cloudflare Worker runs in a UK region, so its outbound `fetch()` to ifarchive.org is blocked. Games already cached in R2 still work, but any uncached game fails.

This is described as temporary by ifarchive.org, but has been in effect for ~7 months.

### Impact
Tested all interpreter types against production:
- **Working** (cached in R2): zcode, blorb/zcode, blorb/glulx, glulx, tads3, tads2, adrift, advsys, hugo — but only specific games that were previously accessed
- **Zero games working**: alan2, agt — none were ever cached
- **Most games broken**: Even popular types like zcode have many uncached games that fail

### Recommended Solution: Durable Object with locationHint

Cloudflare Durable Objects can be created with a `locationHint` parameter that places them in a specific region. Outbound `fetch()` from a Durable Object egresses from the datacenter where it runs. By placing one in `enam` (Eastern North America), we can proxy IF Archive requests from outside the UK.

```typescript
// wrangler.toml addition
[[durable_objects.bindings]]
name = "IFARCHIVE_PROXY"
class_name = "IfArchiveProxy"

[[migrations]]
tag = "v1"
new_classes = ["IfArchiveProxy"]
```

```typescript
// IfArchiveProxy Durable Object
export class IfArchiveProxy {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) return new Response('Missing url param', { status: 400 });
    return fetch(targetUrl);
  }
}
```

```typescript
// Usage in Worker (replacing direct fetch to ifarchive)
const id = env.IFARCHIVE_PROXY.idFromName("proxy", {
  locationHint: "enam"
});
const stub = env.IFARCHIVE_PROXY.get(id);
const response = await stub.fetch(
  new Request(`https://proxy/?url=${encodeURIComponent(ifarchiveUrl)}`)
);
```

#### Why This Over Alternatives

| Option | Status | Region Control | Verdict |
|--------|--------|---------------|---------|
| **Durable Objects + locationHint** | GA | Explicit (`enam`, `wnam`, etc.) | Best option |
| Cloudflare Containers | Beta | No explicit control | Container might still land in UK |
| Worker fetch `cf` options | GA | None for outbound | Doesn't help |
| Regional Services | GA (Enterprise) | Inbound only | Doesn't affect subrequests |
| Smart Placement | GA | Automatic only | Can't force non-UK |

#### Trade-offs
- **Latency**: +50-150ms (UK -> US -> ifarchive -> US -> UK), but only on R2 cache miss — subsequent requests served from R2
- **Cost**: Included in Workers Paid plan ($5/mo), no extra for locationHint
- **Reliability**: `locationHint` is best-effort, not guaranteed, but reliable in practice for major regions
- **Complexity**: Minimal — one new Durable Object class, modify the existing fetch proxy

### Integration with Existing Architecture
The current `R2CachingHandler` (`src/cloudflare/R2CachingHandler.ts`) already has the right caching pattern. The change would be in how it fetches on cache miss — instead of direct `fetch(url)`, route through the Durable Object proxy when the URL is on ifarchive.org.

### Alternative: Bulk Pre-cache
Instead of (or in addition to) the DO proxy, we could run a one-time bulk fetch from a non-UK machine to warm the R2 cache for all playable games. This would work but:
- New games added to IFDB wouldn't be automatically available
- R2 objects could expire or be evicted
- Doesn't solve the long-term problem

The DO proxy is the sustainable solution.

---

## 4. Current Search Architecture (Reference)

### How Search Works Today
1. User submits search term via form on homepage (`/content?search=term`)
2. `ContentSearch.handle()` extracts `search` parameter
3. `D1GameFinder.find()` runs FTS5 query on `games_search` virtual table
4. Scoring: `BM25_rank + exact_title_boost(3) + avg_rating`
5. Results filtered to playable games only, limited to 20
6. Rendered as cards with cover art, title, author, description, rating, play button

### FTS5 Index Columns
`id, title, author, tags, desc, seriesname, genre` (from `db/fulltext.sql`)

### BM25 Weights
`bm25(games_search, 1, 2, 2)` — title weighted 1x, author 2x, remaining 2x

### Not Indexed
`language`, `forgiveness`, `published`, `system`, `license` — all could be useful for filtering

---

## Open Questions

1. **Catalogue UI**: Cards in a grid? Horizontal scrolling rows (Netflix-style)? Separate pages?
2. **Homepage redesign scope**: How much of the homepage should change? Keep search bar prominent?
3. **Catalogue data freshness**: Static at deploy time vs dynamic queries?
4. **DO proxy scope**: Only ifarchive.org, or all external game URLs?
5. **Pre-caching**: Worth doing a bulk warm of R2 alongside the DO proxy?
6. **alan3 extension bug**: The `filetypes` table has `NULL` extension for alan3, so no alan3 games pass the playability check. Fix the data or the query?
