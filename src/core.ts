// Merch QA Console - core engine
// Pure, testable logic: catalog checks, API schema validation, triage scoring, brief export.
// All catalog and API data is synthetic demo data. Checks are heuristics an ops specialist
// would run, not objective ground truth.

export interface CatalogItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  keywords: string[];
  packSize: string;
  unitGrams: number | null; // normalised pack size (g or ml)
  unitBasis: 'weight' | 'volume'; // weight -> Rs/kg, volume -> Rs/L
  mrp: number; // rupees
  sellingPrice: number; // rupees
  discountPctShown: number | null; // % off claimed on the badge
  pricePerUnitShown: number | null; // Rs per kg or per litre as displayed
  imageUrl: string | null; // null = no image reference in catalog data
  badges: { label: string; addedDaysAgo: number }[];
  salesRank: number | null; // lower = more visible to shoppers
  listedDaysAgo: number;
}

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Owner = 'Content' | 'Design' | 'Engineering';

export interface Finding {
  id: string;
  checkId: string;
  itemIds: string[];
  title: string;
  evidence: string;
  severity: Severity;
  hypothesis: string;
  suggestedOwner: Owner;
}

export interface CheckMeta {
  id: string;
  name: string;
  whyItMatters: string;
  heuristicNote: string;
}

export const CHECKS: CheckMeta[] = [
  {
    id: 'missing-image',
    name: 'Image reference integrity',
    whyItMatters: 'A product tile without a working image is the fastest way to lose a shopper\'s trust in a grid.',
    heuristicNote: 'Flags items with no image reference in the data, or a reference the app fails to load.',
  },
  {
    id: 'title-consistency',
    name: 'Title convention consistency',
    whyItMatters: 'Inconsistent titles (missing brand, stray caps, over-long strings) make a grid look unmaintained and hurt scanning.',
    heuristicNote: 'Heuristic: most tiles in this catalog follow "Brand Name PackSize". Flags outliers against that convention.',
  },
  {
    id: 'unit-price',
    name: 'Unit-price accuracy',
    whyItMatters: 'A wrong per-kg or per-litre figure is mis-selling, not just a typo.',
    heuristicNote: 'Recomputes unit price from selling price and pack size; flags differences over 2%.',
  },
  {
    id: 'discount-math',
    name: 'Discount badge math',
    whyItMatters: 'An overstated % off creates legal and trust risk; an understated one suppresses conversion.',
    heuristicNote: 'Recomputes % off from MRP and selling price; flags differences over 1 percentage point.',
  },
  {
    id: 'category-fit',
    name: 'Category placement',
    whyItMatters: 'Mis-categorised items surface in the wrong aisle and miss the shoppers looking for them.',
    heuristicNote: 'Heuristic: compares item descriptors against a keyword map per category. A miss is a prompt to review, not proof.',
  },
  {
    id: 'duplicate-listing',
    name: 'Duplicate listings',
    whyItMatters: 'Two tiles for the same product split reviews, confuse stock counts and clutter the grid.',
    heuristicNote: 'Normalises brand + name + pack size and flags collisions.',
  },
  {
    id: 'badge-freshness',
    name: 'Badge freshness rules',
    whyItMatters: 'A "New" badge from last month or a "Bestseller" with no sales behind it reads as manipulation.',
    heuristicNote: 'House rules used here: "New" expires after 14 days; "Bestseller" needs a sales rank in the top 50. Both are configurable conventions, not industry law.',
  },
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Dairy & Eggs': ['milk', 'curd', 'yogurt', 'paneer', 'butter', 'cheese', 'egg', 'dairy', 'ghee', 'buttermilk', 'lassi'],
  'Fruits & Vegetables': ['apple', 'banana', 'tomato', 'potato', 'onion', 'spinach', 'fruit', 'vegetable', 'mango', 'carrot', 'coriander'],
  'Snacks & Munchies': ['chips', 'namkeen', 'biscuit', 'cookie', 'snack', 'nachos', 'popcorn', 'chocolate'],
  'Beverages': ['juice', 'cola', 'soda', 'tea', 'coffee', 'drink', 'water', 'shake', 'beverage'],
  'Personal Care': ['shampoo', 'soap', 'toothpaste', 'face', 'cream', 'lotion', 'conditioner', 'hair', 'skin'],
  'Household': ['detergent', 'cleaner', 'dishwash', 'washing', 'tissue', 'mop', 'phenyl', 'scrub', 'adhesive', 'glue'],
  'Staples': ['atta', 'flour', 'wheat', 'rice', 'dal', 'salt', 'sugar', 'oil', 'grain', 'quinoa', 'poha', 'maida', 'besan'],
};

const SEVERITY_WEIGHT: Record<Severity, number> = { critical: 10, high: 7, medium: 4, low: 2 };

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

// --- Individual checks. Each takes the full catalog and returns findings. ---

export function checkImageReference(items: CatalogItem[]): Finding[] {
  const findings: Finding[] = [];
  for (const item of items) {
    if (item.imageUrl === null || item.imageUrl.trim() === '') {
      findings.push({
        id: `missing-image:${item.id}`,
        checkId: 'missing-image',
        itemIds: [item.id],
        title: 'No image reference in catalog data',
        evidence: `${item.id} "${item.name}" has no image reference stored, so the app has nothing to render.`,
        severity: 'high',
        hypothesis: 'Upload pipeline dropped the asset link for this SKU, or the image was removed without a replacement.',
        suggestedOwner: 'Content',
      });
    } else if (/^(missing|undefined|null)\//.test(item.imageUrl) || /^\.\.\//.test(item.imageUrl)) {
      findings.push({
        id: `missing-image:${item.id}`,
        checkId: 'missing-image',
        itemIds: [item.id],
        title: 'Image reference points outside the asset store',
        evidence: `${item.id} "${item.name}" references "${item.imageUrl}", which is not a valid asset path in this catalog.`,
        severity: 'high',
        hypothesis: 'Asset path was hand-edited or migrated without updating this SKU.',
        suggestedOwner: 'Content',
      });
    }
  }
  return findings;
}

export function checkTitleConsistency(items: CatalogItem[]): Finding[] {
  const findings: Finding[] = [];
  const withBrandPrefix = items.filter((i) => normalise(i.name).startsWith(normalise(i.brand))).length;
  const conventionUsesBrand = withBrandPrefix / items.length >= 0.5;
  for (const item of items) {
    const problems: string[] = [];
    if (conventionUsesBrand && !normalise(item.name).startsWith(normalise(item.brand))) {
      problems.push('missing the brand prefix most tiles use');
    }
    if (item.name === item.name.toUpperCase() && item.name.length > 3) {
      problems.push('all-caps styling breaks the grid convention');
    }
    if (item.name.length > 60) {
      problems.push(`at ${item.name.length} characters it will truncate in the grid`);
    }
    if (problems.length > 0) {
      findings.push({
        id: `title-consistency:${item.id}`,
        checkId: 'title-consistency',
        itemIds: [item.id],
        title: 'Title breaks the grid convention',
        evidence: `${item.id} "${item.name.slice(0, 72)}${item.name.length > 72 ? '…' : ''}" — ${problems.join('; ')}.`,
        severity: 'medium',
        hypothesis: 'Supplier feed entered titles in a different template than the in-house convention.',
        suggestedOwner: 'Content',
      });
    }
  }
  return findings;
}

export function checkUnitPrice(items: CatalogItem[]): Finding[] {
  const findings: Finding[] = [];
  for (const item of items) {
    if (item.pricePerUnitShown === null || item.unitGrams === null || item.unitGrams === 0) continue;
    const unitLabel = item.unitBasis === 'volume' ? 'L' : 'kg';
    const computed = (item.sellingPrice / item.unitGrams) * 1000;
    const diff = Math.abs(computed - item.pricePerUnitShown) / item.pricePerUnitShown;
    if (diff > 0.02) {
      findings.push({
        id: `unit-price:${item.id}`,
        checkId: 'unit-price',
        itemIds: [item.id],
        title: 'Displayed unit price does not match pack economics',
        evidence: `${item.id} "${item.name}" shows ₹${item.pricePerUnitShown.toFixed(0)}/${unitLabel} but ${item.packSize} at ₹${item.sellingPrice} works out to ₹${computed.toFixed(0)}/${unitLabel} (${(diff * 100).toFixed(0)}% off).`,
        severity: 'critical',
        hypothesis: 'Unit-price field was keyed from the MRP or an older price, not the live selling price.',
        suggestedOwner: 'Content',
      });
    }
  }
  return findings;
}

export function checkDiscountMath(items: CatalogItem[]): Finding[] {
  const findings: Finding[] = [];
  for (const item of items) {
    if (item.discountPctShown === null) continue;
    if (item.mrp <= 0) continue;
    const computed = Math.round(((item.mrp - item.sellingPrice) / item.mrp) * 100);
    if (Math.abs(computed - item.discountPctShown) > 1) {
      findings.push({
        id: `discount-math:${item.id}`,
        checkId: 'discount-math',
        itemIds: [item.id],
        title: 'Discount badge does not match the price math',
        evidence: `${item.id} "${item.name}" claims ${item.discountPctShown}% off, but ₹${item.mrp} → ₹${item.sellingPrice} is ${computed}% off.`,
        severity: 'critical',
        hypothesis: 'Price changed after the promo badge was set, and the badge was not recomputed.',
        suggestedOwner: 'Content',
      });
    }
  }
  return findings;
}

export function checkCategoryFit(items: CatalogItem[]): Finding[] {
  const findings: Finding[] = [];
  for (const item of items) {
    const expected = CATEGORY_KEYWORDS[item.category];
    if (!expected) {
      findings.push({
        id: `category-fit:${item.id}`,
        checkId: 'category-fit',
        itemIds: [item.id],
        title: 'Item sits in a category with no keyword rules',
        evidence: `${item.id} "${item.name}" is filed under "${item.category}", which has no validation keywords configured.`,
        severity: 'low',
        hypothesis: 'Category was added to the taxonomy without updating the QA keyword map.',
        suggestedOwner: 'Engineering',
      });
      continue;
    }
    const hay = normalise(`${item.name} ${item.brand} ${item.keywords.join(' ')}`);
    const hit = expected.some((k) => hay.includes(k));
    if (!hit) {
      findings.push({
        id: `category-fit:${item.id}`,
        checkId: 'category-fit',
        itemIds: [item.id],
        title: 'Item descriptors do not match its category',
        evidence: `${item.id} "${item.name}" is filed under "${item.category}", but none of the category descriptors appear in its name, brand or tags.`,
        severity: 'high',
        hypothesis: 'Bulk upload mapped this SKU to the wrong category node.',
        suggestedOwner: 'Content',
      });
    }
  }
  return findings;
}

export function checkDuplicateListings(items: CatalogItem[]): Finding[] {
  const groups = new Map<string, CatalogItem[]>();
  for (const item of items) {
    const key = normalise(`${item.brand} ${item.name.replace(new RegExp('^' + item.brand, 'i'), '')} ${item.packSize}`);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  const findings: Finding[] = [];
  for (const [, list] of groups) {
    if (list.length > 1) {
      findings.push({
        id: `duplicate-listing:${list.map((i) => i.id).join('+')}`,
        checkId: 'duplicate-listing',
        itemIds: list.map((i) => i.id),
        title: 'Same product listed more than once',
        evidence: `${list.map((i) => `${i.id} "${i.name}" (${i.packSize})`).join(' and ')} normalise to the same brand + product + pack size.`,
        severity: 'medium',
        hypothesis: 'SKU created twice during a range refresh instead of updating the existing listing.',
        suggestedOwner: 'Content',
      });
    }
  }
  return findings;
}

export function checkBadgeFreshness(items: CatalogItem[]): Finding[] {
  const findings: Finding[] = [];
  for (const item of items) {
    for (const badge of item.badges) {
      if (badge.label === 'New' && badge.addedDaysAgo > 14) {
        findings.push({
          id: `badge-freshness:${item.id}:new`,
          checkId: 'badge-freshness',
          itemIds: [item.id],
          title: '"New" badge past its freshness window',
          evidence: `${item.id} "${item.name}" has carried a "New" badge for ${badge.addedDaysAgo} days; the house rule retires it after 14.`,
          severity: 'medium',
          hypothesis: 'No automated expiry on badge assignment; relies on manual removal.',
          suggestedOwner: 'Content',
        });
      }
      if (badge.label === 'Bestseller' && (item.salesRank === null || item.salesRank > 50)) {
        findings.push({
          id: `badge-freshness:${item.id}:best`,
          checkId: 'badge-freshness',
          itemIds: [item.id],
          title: '"Bestseller" badge without sales evidence',
          evidence: `${item.id} "${item.name}" wears a "Bestseller" badge but its sales rank is ${item.salesRank === null ? 'not tracked' : `#${item.salesRank}`}, outside the top-50 rule.`,
          severity: 'high',
          hypothesis: 'Badge was set as a promo lever, not derived from sales data.',
          suggestedOwner: 'Content',
        });
      }
    }
  }
  return findings;
}

export function runAllChecks(items: CatalogItem[]): Finding[] {
  return [
    ...checkImageReference(items),
    ...checkTitleConsistency(items),
    ...checkUnitPrice(items),
    ...checkDiscountMath(items),
    ...checkCategoryFit(items),
    ...checkDuplicateListings(items),
    ...checkBadgeFreshness(items),
  ];
}

// --- API fixture validation (simulated responses, not a live API) ---

export interface ApiIssue {
  field: string;
  expected: string;
  actual: string;
  severity: Severity;
}

export function validateProductPayload(payload: unknown): ApiIssue[] {
  const issues: ApiIssue[] = [];
  if (typeof payload !== 'object' || payload === null) {
    return [{ field: '(root)', expected: 'object', actual: String(payload), severity: 'critical' }];
  }
  const p = payload as Record<string, unknown>;
  const expect = (field: string, pred: (v: unknown) => boolean, expectedDesc: string) => {
    const v = p[field];
    if (v === undefined) {
      issues.push({ field, expected: expectedDesc, actual: 'field missing', severity: 'high' });
    } else if (!pred(v)) {
      issues.push({ field, expected: expectedDesc, actual: `${JSON.stringify(v)} (${typeof v})`, severity: 'high' });
    }
  };
  expect('id', (v) => typeof v === 'string' && v.length > 0, 'non-empty string');
  expect('name', (v) => typeof v === 'string' && v.length > 0, 'non-empty string');
  expect('sellingPrice', (v) => typeof v === 'number' && v > 0, 'positive number (rupees)');
  expect('mrp', (v) => typeof v === 'number' && v > 0, 'positive number (rupees)');
  expect('imageUrl', (v) => typeof v === 'string', 'string URL or path');
  expect('category', (v) => typeof v === 'string', 'string');
  expect('inStock', (v) => typeof v === 'boolean', 'boolean');
  if (typeof p.sellingPrice === 'number' && typeof p.mrp === 'number' && p.sellingPrice > p.mrp) {
    issues.push({ field: 'sellingPrice', expected: '<= mrp', actual: `${p.sellingPrice} > ${p.mrp}`, severity: 'critical' });
  }
  return issues;
}

// --- Triage scoring (heuristic) ---

export function visibilityScore(items: CatalogItem[], itemIds: string[]): number {
  // Heuristic proxy for how many shoppers will see the defect:
  // sales rank, badge presence and recency of listing. 1 (low) to 10 (high).
  let best = 1;
  for (const id of itemIds) {
    const item = items.find((i) => i.id === id);
    if (!item) continue;
    let v = 3;
    if (item.salesRank !== null && item.salesRank <= 20) v = 9;
    else if (item.salesRank !== null && item.salesRank <= 50) v = 7;
    else if (item.badges.length > 0) v = 6;
    else if (item.listedDaysAgo <= 7) v = 5;
    best = Math.max(best, v);
  }
  return best;
}

export function triageScore(severity: Severity, visibility: number): number {
  // severity x visibility, normalised to 100. A prioritisation heuristic, not a measurement.
  return Math.round((SEVERITY_WEIGHT[severity] * visibility * 100) / (10 * 10));
}

// --- Brief export ---

export function buildBrief(opts: {
  generatedAt: string;
  itemCount: number;
  findings: Finding[];
  items: CatalogItem[];
  apiNotes: string[];
}): string {
  const lines: string[] = [];
  lines.push('# Merch QA brief (demo run)');
  lines.push('');
  lines.push(`Generated: ${opts.generatedAt}`);
  lines.push(`Scope: ${opts.itemCount} synthetic demo SKUs. Data is fabricated for demonstration; checks are ops heuristics, not ground truth.`);
  lines.push('');
  const sorted = [...opts.findings].sort(
    (a, b) => triageScore(b.severity, visibilityScore(opts.items, b.itemIds)) - triageScore(a.severity, visibilityScore(opts.items, a.itemIds)),
  );
  lines.push(`## Findings (${sorted.length})`);
  lines.push('');
  sorted.forEach((f, i) => {
    const score = triageScore(f.severity, visibilityScore(opts.items, f.itemIds));
    lines.push(`${i + 1}. **[${f.severity.toUpperCase()} | priority ${score}/100]** ${f.title}`);
    lines.push(`   - Items: ${f.itemIds.join(', ')}`);
    lines.push(`   - Evidence: ${f.evidence}`);
    lines.push(`   - Working hypothesis: ${f.hypothesis}`);
    lines.push(`   - Suggested owner: ${f.suggestedOwner}`);
  });
  if (opts.apiNotes.length > 0) {
    lines.push('');
    lines.push('## API validation notes (simulated responses)');
    opts.apiNotes.forEach((n) => lines.push(`- ${n}`));
  }
  lines.push('');
  lines.push('## Limits of this run');
  lines.push('- Demo catalog and simulated API responses; no live storefront or production data was touched.');
  lines.push('- Category, title and priority outputs are heuristics to focus a human review, not automated verdicts.');
  lines.push('- Next step in a real setting: run against a production export and calibrate thresholds with the category team.');
  return lines.join('\n');
}
