// Node tests for the Merch QA Console core engine.
// Run: npm run build:test && node tests/core.test.mjs
import {
  runAllChecks,
  checkImageReference,
  checkTitleConsistency,
  checkUnitPrice,
  checkDiscountMath,
  checkCategoryFit,
  checkDuplicateListings,
  checkBadgeFreshness,
  validateProductPayload,
  visibilityScore,
  triageScore,
  buildBrief,
} from './.build/core.js';
import { CATALOG, API_FIXTURES } from './.build/catalog.js';

let passed = 0;
let failed = 0;
function ok(cond, name) {
  if (cond) { passed++; }
  else { failed++; console.error('FAIL:', name); }
}
function eq(a, b, name) { ok(a === b, `${name} (expected ${b}, got ${a})`); }

// --- Catalog fixture sanity ---
eq(CATALOG.length, 25, 'catalog has 25 demo SKUs');
ok(new Set(CATALOG.map((i) => i.id)).size === CATALOG.length, 'SKU ids unique');

// --- Image reference check ---
const img = checkImageReference(CATALOG);
eq(img.length, 2, 'image check finds exactly the two seeded defects');
ok(img.some((f) => f.itemIds[0] === 'CK-104' && /no image reference/i.test(f.evidence)), 'CK-104 null image flagged');
ok(img.some((f) => f.itemIds[0] === 'CK-117' && /not a valid asset path/.test(f.evidence)), 'CK-117 invalid path flagged');
ok(img.every((f) => f.severity === 'high' && f.suggestedOwner === 'Content'), 'image findings routed to Content at high severity');

// --- Title consistency ---
const titles = checkTitleConsistency(CATALOG);
const titleIds = titles.map((f) => f.itemIds[0]).sort();
ok(titleIds.includes('CK-108'), 'CK-108 brand-prefix miss flagged');
ok(titleIds.includes('CK-115'), 'CK-115 all-caps flagged');
ok(titleIds.includes('CK-121'), 'CK-121 over-long title flagged');
ok(!titleIds.includes('CK-101'), 'well-formed title not flagged');

// --- Unit price ---
const units = checkUnitPrice(CATALOG);
eq(units.length, 1, 'exactly one unit-price mismatch');
eq(units[0].itemIds[0], 'CK-103', 'CK-103 flagged for unit price');
eq(units[0].severity, 'critical', 'unit-price mismatch is critical');

// --- Discount math ---
const disc = checkDiscountMath(CATALOG);
eq(disc.length, 1, 'exactly one discount-math error');
eq(disc[0].itemIds[0], 'CK-109', 'CK-109 flagged for discount math');
ok(disc[0].evidence.includes('30% off') && disc[0].evidence.includes('25% off'), 'evidence shows claimed vs computed');

// --- Category fit ---
const cats = checkCategoryFit(CATALOG);
eq(cats.length, 2, 'exactly two category findings');
ok(cats.some((f) => f.itemIds[0] === 'CK-112' && f.severity === 'high'), 'CK-112 shampoo-in-snacks flagged high');
ok(cats.some((f) => f.itemIds[0] === 'CK-120' && f.severity === 'low'), 'CK-120 unknown category flagged low');
ok(!cats.some((f) => f.itemIds[0] === 'CK-103'), 'staples item not mis-flagged');

// --- Duplicates ---
const dups = checkDuplicateListings(CATALOG);
eq(dups.length, 1, 'exactly one duplicate pair');
ok(dups[0].itemIds.includes('CK-106') && dups[0].itemIds.includes('CK-106B'), 'Tata Salt pair flagged');

// --- Badges ---
const badges = checkBadgeFreshness(CATALOG);
eq(badges.length, 2, 'exactly two badge findings');
ok(badges.some((f) => f.itemIds[0] === 'CK-111' && f.title.includes('"New"')), 'stale New badge flagged');
ok(badges.some((f) => f.itemIds[0] === 'CK-118' && f.title.includes('"Bestseller"')), 'unsupported Bestseller flagged');

// --- Full run: every finding references real catalog items and known checks ---
const all = runAllChecks(CATALOG);
const itemIds = new Set(CATALOG.map((i) => i.id));
ok(all.every((f) => f.itemIds.every((id) => itemIds.has(id))), 'all findings reference real SKUs');
ok(all.every((f) => f.evidence.length > 20 && f.hypothesis.length > 10), 'every finding carries evidence and a hypothesis');
eq(new Set(all.map((f) => f.id)).size, all.length, 'finding ids unique');

// --- API validation ---
const healthy = API_FIXTURES.find((f) => f.id === 'products-ok');
ok(healthy.body.data.every((rec) => validateProductPayload(rec).length === 0), 'healthy fixture validates clean');

const drift = API_FIXTURES.find((f) => f.id === 'product-misshapen');
const driftIssues = validateProductPayload(drift.body);
ok(driftIssues.some((i) => i.field === 'sellingPrice'), 'schema drift: string price caught');
ok(driftIssues.some((i) => i.field === 'inStock'), 'schema drift: string stock caught');
ok(driftIssues.some((i) => i.field === 'imageUrl' && i.actual === 'field missing'), 'schema drift: missing image caught');

const inverted = API_FIXTURES.find((f) => f.id === 'product-inverted');
const invIssues = validateProductPayload(inverted.body);
ok(invIssues.some((i) => i.field === 'sellingPrice' && i.severity === 'critical'), 'price inversion caught as critical');

// --- Triage scoring ---
ok(visibilityScore(CATALOG, ['CK-105']) > visibilityScore(CATALOG, ['CK-115']), 'high-traffic SKU scores more visible');
ok(triageScore('critical', 9) > triageScore('medium', 9), 'severity raises impact');
ok(triageScore('critical', 9) > triageScore('critical', 3), 'visibility raises impact');
ok(triageScore('low', 1) >= 0 && triageScore('critical', 10) <= 100, 'impact stays within 0-100');

// --- Brief ---
const brief = buildBrief({
  generatedAt: '26 Nov 2026, 05:30 IST',
  itemCount: CATALOG.length,
  findings: all,
  items: CATALOG,
  apiNotes: ['GET /api/v2/products/CK-104 returned 200; contract issues: sellingPrice (expected positive number, got "138").'],
});
ok(brief.includes('# Merch QA brief'), 'brief has a title');
ok(brief.includes('synthetic demo SKUs'), 'brief discloses synthetic data');
ok(brief.includes('heuristics'), 'brief discloses heuristic limits');
ok(brief.includes('API validation notes'), 'brief carries API notes');
ok(brief.indexOf('CRITICAL') < brief.indexOf('MEDIUM'), 'brief orders critical findings before medium');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
