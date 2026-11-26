# Merch QA Console

A product-operations work sample: how I would run a merchandising and content QA
pass on a grocery app, end to end. Built as a role work sample for product
operations on a quick-commerce shopping experience team.

**The catalog, prices, defects and checks in this demo are synthetic and labelled
as such.** The catalog is fabricated, the defects are seeded deliberately (and
documented below), the API responses are fixtures bundled with the app, and the
priority scores are heuristics to focus a human review, not objective ground
truth. Nothing here touches a real storefront. The product photos are real,
representative shots from open databases, used under their own licenses (see
Asset provenance below).

## What it shows

The walkthrough runs in five steps, left to right:

1. **Catalog grid** — the shopper-facing grid rendered from the demo feed. Some
   defects are visible here (a tile with no image, a tile whose image fails to
   load, a duplicate listing); others only surface when the checks run. Tiles
   flagged by the QA pass are marked in place.
2. **Content checks** — seven content-standard checks over the same feed, each
   with the evidence, a working hypothesis, and a suggested owner. Broken-image
   detection is real: the app attempts every image reference at render time, and
   an observed load failure merges into that SKU's image finding as a second
   evidence type on the same issue, never a duplicate finding.
3. **API inspector** — the same catalog one layer down, as the JSON the app
   consumes. Four bundled fixtures (healthy, schema drift, price inversion,
   server error) demonstrate contract validation: never trust a 200, check the
   contract, then check the business rules. These are simulated responses, not a
   live backend or a Postman collection.
4. **Triage board** — a suggested order: severity × shopper visibility,
   normalised to a 0-100 priority, with the rationale shown on every row. Both
   inputs are heuristic proxies (severity rules, sales rank, badges, listing
   recency), so it is a starting agenda for the category team to reorder in
   review, not a measured impact or an objective truth.
5. **QA brief** — the handoff artifact: what was checked, what was found, in
   what order, and where the analysis stops being certain. Downloads as
   Markdown.

## Seeded defects (documented)

The demo catalog (`src/catalog.ts`) carries 25 synthetic SKUs with deliberate
defects, so every check has something real to find:

| SKU | Defect |
| --- | --- |
| CK-104 | No image reference in the data |
| CK-117 | Image reference points to a non-existent asset path (fails at render time) |
| CK-108, CK-115, CK-121 | Title convention breaks (missing brand, all-caps, stray format) |
| CK-103 | Unit price contradicts pack economics |
| CK-109 | Discount badge contradicts the price math |
| CK-112 | Item filed under the wrong category |
| CK-120 | Unknown category value |
| CK-106 / CK-106B | Same product listed twice |
| CK-111 | Stale "New" badge |
| CK-118 | "Bestseller" badge without sales-rank evidence |

The API fixtures add schema drift (renamed fields), a price inversion caught by
business-rule validation even though the contract passes, and a 500 response.

## Running it

```bash
npm install
npm run dev        # local dev server
npm run build      # type-check + production build into docs/
npm test           # core logic tests (42 assertions)
npm run test:browser   # headless-Chrome UI tests (50 assertions), needs Chrome
```

The production build emits a static site into `docs/`, deployable as-is to
GitHub Pages or any static host.

## Stack

TypeScript, React, Vite. No backend; no network calls at runtime. Tests are
plain Node (`node:test`) for the logic and a small CDP driver for the browser
assertions.

---

Maintained by [Shivangi Priya](https://www.linkedin.com/in/shivangii-priyaa)

## Asset provenance

Product photos are real pack/product shots loaded directly from Open Food Facts, Open Beauty Facts, Open Products Facts and Wikimedia Commons image servers (hotlinked, not bundled). They are not MIT-covered; every image keeps its own license (CC BY-SA 2.0/3.0) with per-image credits and source links in `NOTICE.md`. The catalog itself is synthetic: seeded defects, heuristic checks and simulated API responses. Brand names and pack artwork visible in the photos belong to their owners and appear only as licensed contributor photos for this QA teaching demo.
