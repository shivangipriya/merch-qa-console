# Testing

Two layers, both deterministic and offline.

## Core logic — `npm test`

`tests/core.test.mjs` runs 42 assertions over the check engine, the API
contract validator, the triage scorer, and the brief generator
(`node --test`, no framework). It compiles `src/core.ts` and `src/catalog.ts`
to `tests/.build/` first:

```bash
npx tsc src/core.ts src/catalog.ts --outDir tests/.build \
  --module esnext --target es2020 --moduleResolution bundler --skipLibCheck
node tests/core.test.mjs
```

Coverage: every one of the seven checks finds its seeded defect and produces no
false positives on clean items; the schema-drift fixture fails contract
validation with named fields; the price-inversion fixture passes the contract
but fails business rules; the 500 fixture surfaces as critical; triage scores
severity × visibility in descending order; the brief includes scope disclosure,
findings, and API notes.

## Browser — `npm run test:browser`

`tests/browser.mjs` serves the production build in `docs/` and drives
headless Chrome over CDP (50 assertions):

- renders: header, synthetic-data disclosure, all 25 tiles, the no-image
  placeholder, tab navigation
- real image failure: the CK-117 reference actually fails to load in the
  browser and is folded into the findings as observed render-time evidence
- interaction: run checks, findings render with severity/evidence/hypothesis/
  owner, flagged tiles marked on the grid, API fixtures validate (healthy
  clean, schema drift names the fields, 500 surfaces critical), issue-note
  drafting lands in the brief, brief renders and carries the note
- layout: no horizontal overflow at 1440, 768, 390, and 320 px on every tab
- hygiene: no uncaught page errors across the whole run

Requires a Chrome/Chromium binary; point `CHROME_PATH` at it if it is not at
`/usr/bin/google-chrome`.

`tests/shots.mjs` captures per-tab screenshots at desktop and phone widths
into `shots/` for pixel review; it is a development aid, not part of CI.
