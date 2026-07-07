# Production D1 Database Safety

IMPORTANT: Before **any** write to the production D1 database, capture a
time-travel rollback point first. This is mandatory — do not skip it.

## What counts as a prod write

Any of these against `--remote`:
- `wrangler d1 execute talebrary --remote ...` containing `UPDATE`, `DELETE`,
  `INSERT`, `ALTER`, `DROP`, `CREATE`, or `--file=...`
- `./db/run upload`, `./db/run pipeline`, `./db/run prune --disable`
- Any script that mutates prod D1

## Required first step

```bash
bunx wrangler d1 time-travel info talebrary
```

Record the printed bookmark in your output before making the change, e.g.:

```
Rollback point: 000016f5-00000002-000050a0-8e3aaaef2424768689d91a1293921f48
```

D1 retains 30 days of history automatically, but capturing the current
bookmark gives an explicit, known-good target rather than guessing a
timestamp later.

## Rolling back

```bash
bunx wrangler d1 time-travel restore talebrary --bookmark=<bookmark>
```

## Notes

- `time-travel info` takes NO `--remote` flag (it operates on prod natively).
- Read-only queries (`SELECT`) need no bookmark.
- `upload()` in `db/run` already prints a bookmark; manual/ad-hoc writes are
  the gap this rule closes.
- After a large or irreversible change, verify the result (row counts, a spot
  query) before moving on.
