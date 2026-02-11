---
paths:
  - "package.json"
  - "src/player/**"
  - "www/wasiglk/**"
---

# wasiglk Dependency

- Lives at `/home/dan/Projects/wasiglk`, published to JSR as `@bodar/wasiglk`
- Used via `npm:@jsr/bodar__wasiglk@<version>` in package.json
- **Update flow**: commit+push wasiglk → wait for CI publish to JSR → update version in package.json → `bun install` → `./run build` → commit+push talebrary
- **Never** manually build worker.js from wasiglk source without going through JSR publish first
- wasiglk commands: `./run clean` (always before rebuilding), `./run build`
