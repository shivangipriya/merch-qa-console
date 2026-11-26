import type { CatalogItem } from './core';

// Synthetic demo catalog. Every item is fabricated for this work sample.
// The defects below are SEEDED ON PURPOSE so the checks have something to find:
// they demonstrate what a merch QA pass catches, not real data from any company.
//
// Seeded defects (kept in one place so the demo stays honest):
//  CK-104  no image reference (null)                         -> missing-image
//  CK-117  image reference "missing/img/ck117.png" (invalid)  -> missing-image
//  CK-108  title has no brand prefix                          -> title-consistency
//  CK-115  ALL-CAPS title                                     -> title-consistency
//  CK-121  over-long title (66 chars)                         -> title-consistency
//  CK-103  unit price shown (Rs 160/kg) vs computed (Rs 180/kg) -> unit-price
//  CK-109  badge says 30% off, math says 25%                  -> discount-math
//  CK-112  shampoo filed under "Snacks & Munchies"            -> category-fit
//  CK-120  item in "Frozen Foods" (no keyword rules)          -> category-fit (low)
//  CK-106/CK-106B same product listed twice                   -> duplicate-listing
//  CK-111  "New" badge 31 days old                            -> badge-freshness
//  CK-118  "Bestseller" badge with sales rank #183            -> badge-freshness

export const CATALOG: CatalogItem[] = [
  {
    id: 'CK-101', name: 'Amul Taaza Toned Fresh Milk 500 ml', brand: 'Amul', category: 'Dairy & Eggs',
    keywords: ['milk', 'toned', 'dairy'], packSize: '500 ml', unitGrams: 500, unitBasis: 'volume',
    mrp: 27, sellingPrice: 27, discountPctShown: null, pricePerUnitShown: 54,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/126/215/0217/front_en.35.400.jpg', badges: [], salesRank: 3, listedDaysAgo: 400,
  },
  {
    id: 'CK-102', name: 'Fresho Banana Robusta 1 kg', brand: 'Fresho', category: 'Fruits & Vegetables',
    keywords: ['banana', 'fruit'], packSize: '1 kg', unitGrams: 1000, unitBasis: 'weight',
    mrp: 65, sellingPrice: 52, discountPctShown: 20, pricePerUnitShown: 52,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/Cavendish_bananas_DS.jpg/400px-Cavendish_bananas_DS.jpg', badges: [{ label: 'Bestseller', addedDaysAgo: 90 }], salesRank: 8, listedDaysAgo: 380,
  },
  {
    id: 'CK-103', name: 'Aashirvaad Shudh Chakki Atta 5 kg', brand: 'Aashirvaad', category: 'Staples',
    keywords: ['atta', 'flour', 'wheat'], packSize: '5 kg', unitGrams: 5000, unitBasis: 'weight',
    mrp: 240, sellingPrice: 216, discountPctShown: 10, pricePerUnitShown: 160,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/172/501/6838/front_en.7.400.jpg', badges: [], salesRank: 12, listedDaysAgo: 300,
  },
  {
    id: 'CK-104', name: 'Nestle Milkmaid Sweetened Condensed Milk 400 g', brand: 'Nestle', category: 'Dairy & Eggs',
    keywords: ['milkmaid', 'condensed', 'milk', 'dairy'], packSize: '400 g', unitGrams: 400, unitBasis: 'weight',
    mrp: 145, sellingPrice: 138, discountPctShown: 5, pricePerUnitShown: 345,
    imageUrl: null, badges: [], salesRank: 44, listedDaysAgo: 200,
  },
  {
    id: 'CK-105', name: 'Lays India\'s Magic Masala Chips 167 g', brand: 'Lays', category: 'Snacks & Munchies',
    keywords: ['chips', 'potato', 'snack'], packSize: '167 g', unitGrams: 167, unitBasis: 'weight',
    mrp: 60, sellingPrice: 48, discountPctShown: 20, pricePerUnitShown: 287,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/149/150/3020/front_en.35.400.jpg', badges: [{ label: 'Bestseller', addedDaysAgo: 45 }], salesRank: 5, listedDaysAgo: 350,
  },
  {
    id: 'CK-106', name: 'Tata Salt 1 kg', brand: 'Tata', category: 'Staples',
    keywords: ['salt'], packSize: '1 kg', unitGrams: 1000, unitBasis: 'weight',
    mrp: 28, sellingPrice: 28, discountPctShown: null, pricePerUnitShown: 28,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/404/390/1015/front_en.34.400.jpg', badges: [], salesRank: 18, listedDaysAgo: 420,
  },
  {
    id: 'CK-106B', name: 'Tata Salt 1 kg', brand: 'Tata', category: 'Staples',
    keywords: ['salt'], packSize: '1 kg', unitGrams: 1000, unitBasis: 'weight',
    mrp: 28, sellingPrice: 27, discountPctShown: 4, pricePerUnitShown: 27,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/404/390/1015/front_en.34.400.jpg', badges: [{ label: 'New', addedDaysAgo: 3 }], salesRank: null, listedDaysAgo: 3,
  },
  {
    id: 'CK-107', name: 'Nescafe Classic Instant Coffee Jar 50 g', brand: 'Nescafe', category: 'Beverages',
    keywords: ['coffee', 'instant', 'beverage'], packSize: '50 g', unitGrams: 50, unitBasis: 'weight',
    mrp: 155, sellingPrice: 140, discountPctShown: 10, pricePerUnitShown: 2800,
    imageUrl: 'https://images.openfoodfacts.org/images/products/761/303/191/8737/front_en.3.400.jpg', badges: [], salesRank: 27, listedDaysAgo: 290,
  },
  {
    id: 'CK-108', name: 'Organic Quinoa 500 g', brand: 'TrueFarm', category: 'Staples',
    keywords: ['quinoa', 'grain', 'organic'], packSize: '500 g', unitGrams: 500, unitBasis: 'weight',
    mrp: 210, sellingPrice: 189, discountPctShown: 10, pricePerUnitShown: 378,
    imageUrl: 'https://images.openfoodfacts.org/images/products/317/568/115/2137/front_fr.47.400.jpg', badges: [], salesRank: 96, listedDaysAgo: 60,
  },
  {
    id: 'CK-109', name: 'Haldiram\'s Aloo Bhujia 400 g', brand: 'Haldiram\'s', category: 'Snacks & Munchies',
    keywords: ['namkeen', 'bhujia', 'snack'], packSize: '400 g', unitGrams: 400, unitBasis: 'weight',
    mrp: 100, sellingPrice: 75, discountPctShown: 30, pricePerUnitShown: 188,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/400/440/0731/front_en.28.400.jpg', badges: [], salesRank: 21, listedDaysAgo: 260,
  },
  {
    id: 'CK-110', name: 'Mother Dairy Curd Cup 400 g', brand: 'Mother Dairy', category: 'Dairy & Eggs',
    keywords: ['curd', 'dahi', 'dairy'], packSize: '400 g', unitGrams: 400, unitBasis: 'weight',
    mrp: 35, sellingPrice: 35, discountPctShown: null, pricePerUnitShown: 88,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/164/809/7983/front_en.12.400.jpg', badges: [], salesRank: 9, listedDaysAgo: 410,
  },
  {
    id: 'CK-111', name: 'Paper Boat Aamras 250 ml', brand: 'Paper Boat', category: 'Beverages',
    keywords: ['juice', 'mango', 'drink', 'beverage'], packSize: '250 ml', unitGrams: 250, unitBasis: 'volume',
    mrp: 35, sellingPrice: 32, discountPctShown: 9, pricePerUnitShown: 128,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/800/170/5448/front_fr.50.400.jpg', badges: [{ label: 'New', addedDaysAgo: 31 }], salesRank: 58, listedDaysAgo: 31,
  },
  {
    id: 'CK-112', name: 'Dove Intense Repair Shampoo 340 ml', brand: 'Dove', category: 'Snacks & Munchies',
    keywords: ['shampoo', 'hair', 'repair'], packSize: '340 ml', unitGrams: 340, unitBasis: 'volume',
    mrp: 299, sellingPrice: 254, discountPctShown: 15, pricePerUnitShown: 747,
    imageUrl: 'https://images.openbeautyfacts.org/images/products/885/193/222/7704/front_en.7.400.jpg', badges: [], salesRank: 73, listedDaysAgo: 150,
  },
  {
    id: 'CK-113', name: 'Fresho Onion 2 kg', brand: 'Fresho', category: 'Fruits & Vegetables',
    keywords: ['onion', 'vegetable'], packSize: '2 kg', unitGrams: 2000, unitBasis: 'weight',
    mrp: 92, sellingPrice: 78, discountPctShown: 15, pricePerUnitShown: 39,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9f/Red_Onion_on_White.JPG/400px-Red_Onion_on_White.JPG', badges: [], salesRank: 14, listedDaysAgo: 365,
  },
  {
    id: 'CK-114', name: 'Britannia NutriChoice Digestive Biscuits 250 g', brand: 'Britannia', category: 'Snacks & Munchies',
    keywords: ['biscuit', 'digestive', 'snack'], packSize: '250 g', unitGrams: 250, unitBasis: 'weight',
    mrp: 45, sellingPrice: 40, discountPctShown: 11, pricePerUnitShown: 160,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/106/314/2022/front_en.4.400.jpg', badges: [], salesRank: 33, listedDaysAgo: 280,
  },
  {
    id: 'CK-115', name: 'FEVICOL SHK SYNTHETIC RESIN ADHESIVE 50 G', brand: 'Fevicol', category: 'Household',
    keywords: ['adhesive', 'glue'], packSize: '50 g', unitGrams: 50, unitBasis: 'weight',
    mrp: 20, sellingPrice: 20, discountPctShown: null, pricePerUnitShown: 400,
    imageUrl: 'https://images.openproductsfacts.org/images/products/890/186/063/0432/front_en.14.400.jpg', badges: [], salesRank: 141, listedDaysAgo: 190,
  },
  {
    id: 'CK-116', name: 'Colgate Strong Teeth Toothpaste 200 g', brand: 'Colgate', category: 'Personal Care',
    keywords: ['toothpaste', 'teeth', 'oral'], packSize: '200 g', unitGrams: 200, unitBasis: 'weight',
    mrp: 110, sellingPrice: 99, discountPctShown: 10, pricePerUnitShown: 495,
    imageUrl: 'https://images.openbeautyfacts.org/images/products/890/131/478/6241/front_en.13.400.jpg', badges: [], salesRank: 39, listedDaysAgo: 330,
  },
  {
    id: 'CK-117', name: 'Vim Dishwash Gel Lemon 500 ml', brand: 'Vim', category: 'Household',
    keywords: ['dishwash', 'dish', 'cleaner'], packSize: '500 ml', unitGrams: 500, unitBasis: 'volume',
    mrp: 85, sellingPrice: 76, discountPctShown: 11, pricePerUnitShown: 152,
    imageUrl: 'missing/img/ck117.png', badges: [], salesRank: 25, listedDaysAgo: 240,
  },
  {
    id: 'CK-118', name: 'Cadbury Dairy Milk Silk Chocolate Bar 60 g', brand: 'Cadbury', category: 'Snacks & Munchies',
    keywords: ['chocolate', 'silk', 'snack'], packSize: '60 g', unitGrams: 60, unitBasis: 'weight',
    mrp: 85, sellingPrice: 85, discountPctShown: null, pricePerUnitShown: 1417,
    imageUrl: 'https://images.openfoodfacts.org/images/products/762/220/227/1861/front_en.9.400.jpg', badges: [{ label: 'Bestseller', addedDaysAgo: 20 }], salesRank: 183, listedDaysAgo: 220,
  },
  {
    id: 'CK-119', name: 'Fresho Spinach Bunch 250 g', brand: 'Fresho', category: 'Fruits & Vegetables',
    keywords: ['spinach', 'palak', 'vegetable', 'leafy'], packSize: '250 g', unitGrams: 250, unitBasis: 'weight',
    mrp: 30, sellingPrice: 26, discountPctShown: 13, pricePerUnitShown: 104,
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/23/Bunch_of_Spinach_%2816752368240%29.jpg/400px-Bunch_of_Spinach_%2816752368240%29.jpg', badges: [], salesRank: 47, listedDaysAgo: 300,
  },
  {
    id: 'CK-120', name: 'McCain French Fries 420 g', brand: 'McCain', category: 'Frozen Foods',
    keywords: ['fries', 'frozen', 'potato'], packSize: '420 g', unitGrams: 420, unitBasis: 'weight',
    mrp: 115, sellingPrice: 105, discountPctShown: 9, pricePerUnitShown: 250,
    imageUrl: 'https://images.openfoodfacts.org/images/products/871/043/812/3784/front_en.23.400.jpg', badges: [], salesRank: 66, listedDaysAgo: 140,
  },
  {
    id: 'CK-121', name: 'Organic India Tulsi Green Tea Classic 25 Tea Bags Pack of 2 Herbal Green Tea for Immunity', brand: 'Organic India', category: 'Beverages',
    keywords: ['tea', 'green', 'tulsi', 'beverage'], packSize: '2 x 25 bags', unitGrams: 100, unitBasis: 'weight',
    mrp: 320, sellingPrice: 288, discountPctShown: 10, pricePerUnitShown: 2880,
    imageUrl: 'https://images.openfoodfacts.org/images/products/080/154/107/0435/front_fr.19.400.jpg', badges: [], salesRank: 88, listedDaysAgo: 110,
  },
  {
    id: 'CK-122', name: 'Amul Butter 100 g', brand: 'Amul', category: 'Dairy & Eggs',
    keywords: ['butter', 'dairy'], packSize: '100 g', unitGrams: 100, unitBasis: 'weight',
    mrp: 58, sellingPrice: 58, discountPctShown: null, pricePerUnitShown: 580,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/126/201/0320/front_en.3.400.jpg', badges: [], salesRank: 16, listedDaysAgo: 400,
  },
  {
    id: 'CK-123', name: 'Harpic Original Toilet Cleaner 500 ml', brand: 'Harpic', category: 'Household',
    keywords: ['cleaner', 'toilet', 'disinfectant'], packSize: '500 ml', unitGrams: 500, unitBasis: 'volume',
    mrp: 99, sellingPrice: 89, discountPctShown: 10, pricePerUnitShown: 178,
    imageUrl: 'https://images.openproductsfacts.org/images/products/890/139/615/2002/front_en.21.400.jpg', badges: [], salesRank: 52, listedDaysAgo: 310,
  },
  {
    id: 'CK-124', name: 'Real Mixed Fruit Juice 1 L', brand: 'Real', category: 'Beverages',
    keywords: ['juice', 'fruit', 'drink', 'beverage'], packSize: '1 L', unitGrams: 1000, unitBasis: 'weight',
    mrp: 130, sellingPrice: 117, discountPctShown: 10, pricePerUnitShown: 117,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/188/800/5748/front_en.4.400.jpg', badges: [], salesRank: 31, listedDaysAgo: 275,
  },
];

// --- Simulated API responses (fixtures, not a live backend) ---

export interface ApiFixture {
  id: string;
  label: string;
  request: string;
  status: number;
  statusText: string;
  latencyMs: number;
  body: unknown;
  note: string;
}

export const API_FIXTURES: ApiFixture[] = [
  {
    id: 'products-ok',
    label: 'List products (healthy)',
    request: 'GET /api/v2/products?category=dairy-eggs&limit=2',
    status: 200,
    statusText: 'OK',
    latencyMs: 84,
    body: {
      data: [
        { id: 'CK-101', name: 'Amul Taaza Toned Fresh Milk 500 ml', category: 'Dairy & Eggs', mrp: 27, sellingPrice: 27, imageUrl: 'cdn/img/ck101.webp', inStock: true },
        { id: 'CK-110', name: 'Mother Dairy Curd Cup 400 g', category: 'Dairy & Eggs', mrp: 35, sellingPrice: 35, imageUrl: 'cdn/img/ck110.webp', inStock: true },
      ],
      page: 1,
      total: 2,
    },
    note: 'Baseline: a well-formed page of results. Validate field types and spot-check two records before trusting a feed.',
  },
  {
    id: 'product-misshapen',
    label: 'Single product (schema drift)',
    request: 'GET /api/v2/products/CK-104',
    status: 200,
    statusText: 'OK',
    latencyMs: 61,
    body: {
      id: 'CK-104',
      name: 'Nestle Milkmaid Sweetened Condensed Milk 400 g',
      category: 'Dairy & Eggs',
      mrp: 145,
      sellingPrice: '138',
      inStock: 'yes',
    },
    note: 'Seeded fault: a 200 that still breaks the contract. sellingPrice arrives as a string, inStock as "yes", imageUrl is missing. A grid that trusts this payload renders a broken tile without any error.',
  },
  {
    id: 'product-inverted',
    label: 'Single product (price inversion)',
    request: 'GET /api/v2/products/CK-118',
    status: 200,
    statusText: 'OK',
    latencyMs: 72,
    body: {
      id: 'CK-118',
      name: 'Cadbury Dairy Milk Silk Chocolate Bar 60 g',
      category: 'Snacks & Munchies',
      mrp: 85,
      sellingPrice: 95,
      imageUrl: 'cdn/img/ck118.webp',
      inStock: true,
    },
    note: 'Seeded fault: selling price above MRP. Type checks pass; only a business rule catches it. This is why validation is more than schema.',
  },
  {
    id: 'category-500',
    label: 'Category feed (server error)',
    request: 'GET /api/v2/categories/frozen-foods/products',
    status: 500,
    statusText: 'Internal Server Error',
    latencyMs: 1210,
    body: { error: 'upstream_timeout', message: 'catalog-service did not respond within 1000ms', traceId: 'demo-7f3a9c' },
    note: 'Seeded fault: the category page fails while every other aisle loads. An ops pass documents the failing endpoint, the trace id and the blast radius before escalating.',
  },
];
