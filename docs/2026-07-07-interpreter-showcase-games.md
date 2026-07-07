# Finding games for each wasiglk interpreter

Goal: showcase every wasiglk interpreter with at least one playable game on
Talebrary. This doc records how the game files are found, extracted, and wired
so the hunt can resume after a context clear.

## Interpreter status (17 total in `@bodar/wasiglk`)

Interpreters: `fizmo glulxe git hugo scare alan2 alan3 agility advsys tads2
tads3 jacl level9 magnetic scott taylor plus`.

**Live with real games (13):** fizmo (zcode), glulxe (glulx), hugo, scare
(adrift), alan2, alan3, agility (agt), advsys, tads2, tads3, level9, scott, jacl.

**Still needed (3 formats):**
- **magnetic** — Magnetic Scrolls (`.mag`). Games exist on IFDB (The Pawn, Guild
  of Thieves, Jinxter, Corruption, Fish!, Wonderland, Myth) but our DB has **no
  `.mag` game-file link** — only solutions/manuals. Source the `.mag` files
  (msmemorial.if-legends.org, or a magnetic-scrolls archive). Most likely to land.
- **taylor** — NOT Mysterious Adventures (those run under `scott`/ScottFree). The
  format `taylor.wasm` reads is unconfirmed; identify it before hunting a game.
- **sagaplus** (`plus` interpreter) — SAGA+ format. No candidate found yet.

`git` is not a distinct format — it's an alternate Glulx VM (glulxe covers glulx).

## How format → interpreter is wired (3 code spots + the DB)

To enable a new format, add it in all three, then curate games:
1. `src/types.ts` — add to the `SupportedGameType` union.
2. `src/player/main.ts` — add to `interpreterFor` map (IFDB format → wasm name,
   e.g. `'sagaplus': 'plus'`). The client picks `/wasiglk/<name>.wasm`.
3. `src/games/SqlGameFinder.ts` — add to the `supportedFormats` SQL list (gates
   the playable filter).

Only wire a format once you have a game that actually boots — keep the registry
honest (every mapped format has ≥1 playable game).

## The data model (key columns on `talebrary_gamelinks`)

- `format` — the IFDB format tag, resolved further by `db/derive-format.sql`
  (maps generic `storyfile`/`*` and variants to a real format by filename). The
  playable filter is `format IN supportedFormats`.
- `primary_file` — for archive URLs, the exact member to extract (mirrors IFDB's
  `compressedprimary`). Story extraction (`src/content/archive.ts`) matches it
  exact → case-insensitive → basename.
- `extension` — space-separated list; the playable filter's extension match uses
  it. Set it when curating a format so bare links pass.

`get()` in SqlGameFinder picks ONE link per game via `preferBareFile` (bare story
files beat archives). So a game with an Inform port (bare `.z5`) will pick the
port over an original archive — this is why showcasing an original format needs
either a **port-free game** or a curated override. (Planned "variants" feature
would let users pick the edition and remove this constraint.)

## Where the game files live (IF Archive)

Fetch IF Archive through the worker proxy (it's UK-geo-blocked directly):
```bash
set -a; . ./.env; set +a   # PROXY_URL, PROXY_TOKEN
viaproxy(){ curl -sS -H "Authorization: Bearer $PROXY_TOKEN" \
  "$PROXY_URL/proxy?url=$(bun -e 'console.log(encodeURIComponent(process.argv[1]))' "$1")"; }
```

Key trees found:
- **Scott Adams / ScottFree** (`scott`): `/if-archive/scott-adams/games/scottfree/`
  - `AdamsGames.zip` — the 12 classic Scott Adams games as `adv01.dat`..`adv14.dat`
    (adv01=Adventureland, adv02=Pirate, adv03=Secret Mission, adv04=Voodoo Castle,
    adv05=The Count, adv06=Strange Odyssey, adv07=Mystery Fun House, adv08=Pyramid
    of Doom, adv09=Ghost Town, adv10/11=Savage Island I/II, adv12=Golden Voyage,
    adv13=Sorcerer of Claymorgue, adv14a/b=Buckaroo Banzai; quest1=Hulk,
    quest2=Spider-Man).
  - `mysterious.tar.gz` — Mysterious Adventures (Brian Howarth) as `1_baton.dat`
    (Golden Baton), `2_timemachine.dat`, etc. **These run under `scott`**, not
    taylor. ScottFree 1.14 handles both.
  - `ghostking.zip`, `desert-scott.zip`, `otheradv.zip` — more ScottFree games.
- **JACL** (`jacl`): `/if-archive/games/jacl/` — e.g. `grail.zip` containing
  `grail.j2` (The Unholy Grail). Also `.j2`/`.jacl` extensions.
- **Level 9** (`level9`): genuine Level 9 games are `.sna` snapshots the L9
  interpreter extracts A-code from. They're in `/if-archive/games/spectrum/zx.zip`
  (a shared collection), disambiguated by `primary_file` (e.g. `Jewels of Darkness
  3 - Dungeon Adventure.sna`). Identify genuine ones by AUTHOR = the Austin
  brothers (Mike/Nick/Pete Austin, Level 9 Computing) — most other `.sna` in that
  zip are unrelated Spectrum engines (Quill/PAW/GAC) that level9.wasm can't run.
- **Magnetic Scrolls** (`magnetic`): no `/if-archive/games/magnetic/` dir (404).
  The Pawn's DB links are only solutions/manuals. Look at
  `msmemorial.if-legends.org` or search IF Archive's master index for `.mag`.

## Recon recipe (per interpreter)

1. **Search our DB by the format's extension** across all links (url + primary):
   ```bash
   bun -e 'import {Database} from "bun:sqlite";
   const db=new Database("<ifdb4.sqlite or db/talebrary.sqlite>",{readonly:true});
   const isArch=u=>/\.(zip|tgz|gz|tar)$/i.test(u);
   for (const r of db.query("SELECT g.title t,l.url u,l.compressedprimary p FROM gamelinks l JOIN games g ON g.id=l.gameid").all()) {
     const name=(isArch(r.u)?(r.p||""):r.u).toLowerCase();
     if (name.endsWith(".mag")) console.log(r.t, r.u, r.p);  // <- target extension
   }'
   ```
   (In this session the working IFDB snapshot was rebuilt to
   `<scratchpad>/ifdb4.sqlite` from the dump via `db/filter-ifdb.py`.)
2. **Search by known titles** if extension search is empty (games are often
   tagged generic `storyfile`); then inspect that game's links for a canonical
   archive.
3. **List an IF Archive dir** with `viaproxy` to find the canonical files.
4. **Inspect an archive's members** to get the exact `primary_file`:
   ```bash
   viaproxy "<zip url>" -o /tmp/a.zip
   bun -e 'import{unzipSync}from"fflate";console.log(Object.keys(unzipSync(new Uint8Array(await Bun.file("/tmp/a.zip").arrayBuffer()))).join("\n"));'
   # tar.gz: gunzipSync then walk 512-byte headers (see session scratchpad myst list)
   ```

## Curate + verify (per game)

1. **Capture a rollback point first** (mandatory, see `.claude/rules/database.md`):
   `bunx wrangler d1 time-travel info talebrary`
2. **Curate the link** in local `db/talebrary.sqlite` AND prod, keyed by game id
   (formats/extensions collide and archives are shared, so no blanket rule):
   ```sql
   UPDATE talebrary_gamelinks
   SET format='scott', extension='.dat', primary_file='adv04.dat'
   WHERE game_id='<id>' AND lower(url) LIKE '%adamsgames.zip';
   ```
   Record the same UPDATE in `db/corrections.sql` (replays after every rebuild;
   `sync.sql` re-inserts raw IFDB rows, then `.read corrections.sql` re-applies).
3. **Boot-test in a browser** (tests passing ≠ it renders):
   ```bash
   nohup ./run start-dynamic > dev.log 2>&1 </dev/null & disown   # prints a localhost URL
   ```
   Navigate Playwright to `/content/<id>/` and confirm the interpreter banner +
   room text render (e.g. ScottFree prints "Scott Free, A Scott Adams game
   driver…"; Level 9 prints "Level 9 Interpreter, version 5.2"). A page that
   shows only the title card = the interpreter didn't load the file — wrong
   format/interpreter for that game.
4. Commit code (if a new format was wired) + `db/corrections.sql` +
   `db/talebrary.sqlite` (LFS), push. CI deploys the client; then verify the prod
   story serves: `curl -sS -o /dev/null -w '%{http_code} %{size_download}' \
   https://talebrary.com/content/<id>/story`.

## Gotchas learned this session

- **Extension is a weak signal.** `.dat` = scott OR advsys OR mysterious; `.blb`
  = blorb/glulx OR blorb-wrapped taylor; `.sna` = any Spectrum game. Prefer
  magic-byte detection where it works; for header-less 8-bit formats there is no
  magic — rely on IFDB's tag or curate by game id. (Idea: make derive-format.sql
  magic-first, extension-fallback.)
- **`preferBareFile`** means an Inform port beats an original-format archive, so
  to showcase an original you need a port-free game (query: game has no bare
  story link) or a curated override.
- **fflate async `unzip` crashes in Workers/Bun** — always use `unzipSync` (with
  its size `filter` for the zip-bomb cap).
- **Never bare-shell the dev server** (`./run start-dynamic &` exit-144s under the
  harness) — use `nohup … </dev/null & disown` or `setsid`.
- The RTK hook mangles `./db/run <cmd>`; wrap as `bash -c './db/run <cmd>'`.
