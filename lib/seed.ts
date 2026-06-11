/**
 * AIRA Seed Data
 * Realistic fashion/lifestyle brand data — "Velour" brand (apparel + coffee accessories).
 * 25 customers × ~4 orders each ≈ 100 orders.
 * Call `loadSeedData()` to hydrate the in-memory store.
 */

import type {
  Customer,
  Order,
  CustomerTier,
  CustomerStatus,
  PreferredChannel,
  OrderStatus,
  ProductCategory,
} from "./types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Customers ───────────────────────────────────────────────────────────────

export const SEED_CUSTOMERS: Customer[] = [
  {
    id: "cust_001",
    name: "Priya Mehta",
    email: "priya.mehta@gmail.com",
    phone: "+91-9876543210",
    city: "Mumbai",
    tier: "gold",
    status: "active",
    totalSpend: 28450,
    orderCount: 9,
    avgOrderValue: 3161,
    lastOrderDate: daysAgo(8),
    joinedDate: daysAgo(420),
    preferredChannel: "email",
    tags: ["loyal", "high-aov", "fashion-forward"],
    engagementScore: 87,
  },
  {
    id: "cust_002",
    name: "Arjun Sharma",
    email: "arjun.s@outlook.com",
    phone: "+91-9123456789",
    city: "Delhi",
    tier: "silver",
    status: "lapsed",
    totalSpend: 11200,
    orderCount: 4,
    avgOrderValue: 2800,
    lastOrderDate: daysAgo(95),
    joinedDate: daysAgo(310),
    preferredChannel: "sms",
    tags: ["lapsed-90d", "price-sensitive"],
    engagementScore: 31,
  },
  {
    id: "cust_003",
    name: "Sneha Iyer",
    email: "sneha.iyer@yahoo.com",
    phone: "+91-9988776655",
    city: "Bengaluru",
    tier: "platinum",
    status: "active",
    totalSpend: 67300,
    orderCount: 21,
    avgOrderValue: 3205,
    lastOrderDate: daysAgo(3),
    joinedDate: daysAgo(720),
    preferredChannel: "email",
    tags: ["vip", "loyal", "high-aov", "repeat-buyer"],
    engagementScore: 96,
  },
  {
    id: "cust_004",
    name: "Rahul Gupta",
    email: "rahul.gupta@proton.me",
    phone: "+91-8765432109",
    city: "Pune",
    tier: "bronze",
    status: "new",
    totalSpend: 2190,
    orderCount: 1,
    avgOrderValue: 2190,
    lastOrderDate: daysAgo(12),
    joinedDate: daysAgo(14),
    preferredChannel: "whatsapp",
    tags: ["new-customer", "first-order"],
    engagementScore: 62,
  },
  {
    id: "cust_005",
    name: "Kavya Nair",
    email: "kavya.nair@gmail.com",
    phone: "+91-7654321098",
    city: "Chennai",
    tier: "gold",
    status: "active",
    totalSpend: 34100,
    orderCount: 12,
    avgOrderValue: 2842,
    lastOrderDate: daysAgo(21),
    joinedDate: daysAgo(500),
    preferredChannel: "push",
    tags: ["loyal", "accessory-lover", "seasonal-buyer"],
    engagementScore: 78,
  },
  {
    id: "cust_006",
    name: "Vikram Bose",
    email: "vikram.bose@rediffmail.com",
    phone: "+91-6543210987",
    city: "Kolkata",
    tier: "silver",
    status: "at_risk",
    totalSpend: 15600,
    orderCount: 6,
    avgOrderValue: 2600,
    lastOrderDate: daysAgo(74),
    joinedDate: daysAgo(280),
    preferredChannel: "email",
    tags: ["at-risk", "lapsed-60d", "discount-responsive"],
    engagementScore: 42,
  },
  {
    id: "cust_007",
    name: "Ananya Krishnan",
    email: "ananya.k@gmail.com",
    phone: "+91-9321456780",
    city: "Hyderabad",
    tier: "gold",
    status: "active",
    totalSpend: 41200,
    orderCount: 14,
    avgOrderValue: 2943,
    lastOrderDate: daysAgo(15),
    joinedDate: daysAgo(600),
    preferredChannel: "whatsapp",
    tags: ["loyal", "high-aov", "outerwear-fan"],
    engagementScore: 83,
  },
  {
    id: "cust_008",
    name: "Rohan Malhotra",
    email: "rohan.m@icloud.com",
    phone: "+91-8901234567",
    city: "Gurugram",
    tier: "bronze",
    status: "lapsed",
    totalSpend: 4320,
    orderCount: 2,
    avgOrderValue: 2160,
    lastOrderDate: daysAgo(112),
    joinedDate: daysAgo(130),
    preferredChannel: "sms",
    tags: ["lapsed-90d", "low-engagement"],
    engagementScore: 18,
  },
  {
    id: "cust_009",
    name: "Meera Pillai",
    email: "meera.pillai@gmail.com",
    phone: "+91-9456781230",
    city: "Kochi",
    tier: "silver",
    status: "active",
    totalSpend: 18900,
    orderCount: 7,
    avgOrderValue: 2700,
    lastOrderDate: daysAgo(30),
    joinedDate: daysAgo(365),
    preferredChannel: "email",
    tags: ["moderate-buyer", "coffee-fan"],
    engagementScore: 65,
  },
  {
    id: "cust_010",
    name: "Aditya Joshi",
    email: "aditya.j@gmail.com",
    phone: "+91-7890123456",
    city: "Nagpur",
    tier: "bronze",
    status: "active",
    totalSpend: 7650,
    orderCount: 3,
    avgOrderValue: 2550,
    lastOrderDate: daysAgo(45),
    joinedDate: daysAgo(200),
    preferredChannel: "push",
    tags: ["app-user", "occasional-buyer"],
    engagementScore: 54,
  },
  {
    id: "cust_011",
    name: "Pooja Desai",
    email: "pooja.desai@hotmail.com",
    phone: "+91-9876012345",
    city: "Ahmedabad",
    tier: "platinum",
    status: "active",
    totalSpend: 89500,
    orderCount: 28,
    avgOrderValue: 3196,
    lastOrderDate: daysAgo(5),
    joinedDate: daysAgo(900),
    preferredChannel: "email",
    tags: ["vip", "brand-ambassador", "high-aov", "loyal"],
    engagementScore: 98,
  },
  {
    id: "cust_012",
    name: "Siddharth Rao",
    email: "sid.rao@gmail.com",
    phone: "+91-8765901234",
    city: "Bengaluru",
    tier: "silver",
    status: "at_risk",
    totalSpend: 13400,
    orderCount: 5,
    avgOrderValue: 2680,
    lastOrderDate: daysAgo(68),
    joinedDate: daysAgo(350),
    preferredChannel: "whatsapp",
    tags: ["at-risk", "lapsed-60d"],
    engagementScore: 38,
  },
  {
    id: "cust_013",
    name: "Divya Saxena",
    email: "divya.s@gmail.com",
    phone: "+91-7654890123",
    city: "Lucknow",
    tier: "bronze",
    status: "new",
    totalSpend: 3100,
    orderCount: 1,
    avgOrderValue: 3100,
    lastOrderDate: daysAgo(7),
    joinedDate: daysAgo(9),
    preferredChannel: "sms",
    tags: ["new-customer", "first-order"],
    engagementScore: 70,
  },
  {
    id: "cust_014",
    name: "Nikhil Verma",
    email: "nikhil.v@outlook.com",
    phone: "+91-6543789012",
    city: "Jaipur",
    tier: "gold",
    status: "active",
    totalSpend: 22800,
    orderCount: 8,
    avgOrderValue: 2850,
    lastOrderDate: daysAgo(18),
    joinedDate: daysAgo(445),
    preferredChannel: "email",
    tags: ["loyal", "footwear-fan", "high-aov"],
    engagementScore: 76,
  },
  {
    id: "cust_015",
    name: "Tanvi Kulkarni",
    email: "tanvi.k@gmail.com",
    phone: "+91-9012678901",
    city: "Pune",
    tier: "silver",
    status: "active",
    totalSpend: 16500,
    orderCount: 6,
    avgOrderValue: 2750,
    lastOrderDate: daysAgo(28),
    joinedDate: daysAgo(390),
    preferredChannel: "push",
    tags: ["moderate-buyer", "seasonal-buyer"],
    engagementScore: 68,
  },
  {
    id: "cust_016",
    name: "Karan Bajaj",
    email: "karan.b@proton.me",
    phone: "+91-8901567890",
    city: "Mumbai",
    tier: "bronze",
    status: "lapsed",
    totalSpend: 5400,
    orderCount: 2,
    avgOrderValue: 2700,
    lastOrderDate: daysAgo(130),
    joinedDate: daysAgo(160),
    preferredChannel: "sms",
    tags: ["lapsed-90d", "price-sensitive"],
    engagementScore: 22,
  },
  {
    id: "cust_017",
    name: "Simran Kaur",
    email: "simran.kaur@gmail.com",
    phone: "+91-7890456789",
    city: "Chandigarh",
    tier: "gold",
    status: "active",
    totalSpend: 31700,
    orderCount: 11,
    avgOrderValue: 2882,
    lastOrderDate: daysAgo(10),
    joinedDate: daysAgo(510),
    preferredChannel: "email",
    tags: ["loyal", "fashion-forward", "tops-fan"],
    engagementScore: 85,
  },
  {
    id: "cust_018",
    name: "Abhishek Pandey",
    email: "abhi.pandey@yahoo.com",
    phone: "+91-6789345678",
    city: "Varanasi",
    tier: "bronze",
    status: "active",
    totalSpend: 6800,
    orderCount: 3,
    avgOrderValue: 2267,
    lastOrderDate: daysAgo(55),
    joinedDate: daysAgo(240),
    preferredChannel: "whatsapp",
    tags: ["occasional-buyer", "merchandise-fan"],
    engagementScore: 49,
  },
  {
    id: "cust_019",
    name: "Ritu Agarwal",
    email: "ritu.a@gmail.com",
    phone: "+91-9678234567",
    city: "Delhi",
    tier: "platinum",
    status: "active",
    totalSpend: 54200,
    orderCount: 18,
    avgOrderValue: 3011,
    lastOrderDate: daysAgo(6),
    joinedDate: daysAgo(650),
    preferredChannel: "email",
    tags: ["vip", "loyal", "high-aov", "repeat-buyer"],
    engagementScore: 94,
  },
  {
    id: "cust_020",
    name: "Harsh Tiwari",
    email: "harsh.t@icloud.com",
    phone: "+91-8567123456",
    city: "Bhopal",
    tier: "silver",
    status: "at_risk",
    totalSpend: 9800,
    orderCount: 4,
    avgOrderValue: 2450,
    lastOrderDate: daysAgo(78),
    joinedDate: daysAgo(300),
    preferredChannel: "push",
    tags: ["at-risk", "lapsed-60d"],
    engagementScore: 34,
  },
  {
    id: "cust_021",
    name: "Neha Soni",
    email: "neha.soni@gmail.com",
    phone: "+91-7456012345",
    city: "Indore",
    tier: "bronze",
    status: "new",
    totalSpend: 1890,
    orderCount: 1,
    avgOrderValue: 1890,
    lastOrderDate: daysAgo(4),
    joinedDate: daysAgo(5),
    preferredChannel: "sms",
    tags: ["new-customer", "first-order"],
    engagementScore: 58,
  },
  {
    id: "cust_022",
    name: "Varun Choudhary",
    email: "varun.c@rediffmail.com",
    phone: "+91-6345901234",
    city: "Udaipur",
    tier: "gold",
    status: "active",
    totalSpend: 26400,
    orderCount: 9,
    avgOrderValue: 2933,
    lastOrderDate: daysAgo(25),
    joinedDate: daysAgo(470),
    preferredChannel: "whatsapp",
    tags: ["loyal", "accessories-fan"],
    engagementScore: 81,
  },
  {
    id: "cust_023",
    name: "Ishita Ghosh",
    email: "ishita.g@gmail.com",
    phone: "+91-9234890123",
    city: "Kolkata",
    tier: "silver",
    status: "lapsed",
    totalSpend: 12100,
    orderCount: 5,
    avgOrderValue: 2420,
    lastOrderDate: daysAgo(100),
    joinedDate: daysAgo(320),
    preferredChannel: "email",
    tags: ["lapsed-90d", "coffee-fan"],
    engagementScore: 27,
  },
  {
    id: "cust_024",
    name: "Manish Dubey",
    email: "manish.d@gmail.com",
    phone: "+91-8123789012",
    city: "Raipur",
    tier: "bronze",
    status: "active",
    totalSpend: 8200,
    orderCount: 3,
    avgOrderValue: 2733,
    lastOrderDate: daysAgo(40),
    joinedDate: daysAgo(180),
    preferredChannel: "push",
    tags: ["occasional-buyer"],
    engagementScore: 55,
  },
  {
    id: "cust_025",
    name: "Swati Reddy",
    email: "swati.r@gmail.com",
    phone: "+91-7012678901",
    city: "Hyderabad",
    tier: "gold",
    status: "active",
    totalSpend: 38900,
    orderCount: 13,
    avgOrderValue: 2992,
    lastOrderDate: daysAgo(14),
    joinedDate: daysAgo(555),
    preferredChannel: "email",
    tags: ["loyal", "high-aov", "outerwear-fan", "coffee-fan"],
    engagementScore: 89,
  },
];

// ─── Orders ──────────────────────────────────────────────────────────────────

const PRODUCTS: Array<{
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
}> = [
  { id: "prod_t01", name: "Linen Relaxed Tee", category: "tops", price: 1290 },
  { id: "prod_t02", name: "Stripe Oversized Shirt", category: "tops", price: 2190 },
  { id: "prod_t03", name: "Ribbed Tank Set", category: "tops", price: 1890 },
  { id: "prod_b01", name: "Tailored Wide-Leg Trousers", category: "bottoms", price: 3490 },
  { id: "prod_b02", name: "High-Rise Straight Jeans", category: "bottoms", price: 3990 },
  { id: "prod_b03", name: "Pleated Midi Skirt", category: "bottoms", price: 2890 },
  { id: "prod_o01", name: "Wool Blend Overcoat", category: "outerwear", price: 8990 },
  { id: "prod_o02", name: "Cropped Puffer Jacket", category: "outerwear", price: 5490 },
  { id: "prod_a01", name: "Leather Mini Tote", category: "accessories", price: 2990 },
  { id: "prod_a02", name: "Silk Scrunchie Set", category: "accessories", price: 890 },
  { id: "prod_a03", name: "Straw Raffia Hat", category: "accessories", price: 1490 },
  { id: "prod_f01", name: "Canvas Low-Top Sneakers", category: "footwear", price: 3290 },
  { id: "prod_f02", name: "Block Heel Mules", category: "footwear", price: 4190 },
  { id: "prod_c01", name: "Cold Brew Kit", category: "coffee", price: 1990 },
  { id: "prod_c02", name: "Pour-Over Set", category: "coffee", price: 2490 },
  { id: "prod_m01", name: "Velour Tote Bag", category: "merchandise", price: 1190 },
  { id: "prod_m02", name: "Brand Enamel Mug", category: "merchandise", price: 890 },
];

function makeOrder(
  id: string,
  customerId: string,
  daysBack: number,
  status: OrderStatus = "delivered"
): Order {
  const itemCount = randomBetween(1, 3);
  const shuffled = [...PRODUCTS].sort(() => Math.random() - 0.5);
  const items = shuffled.slice(0, itemCount).map((p) => ({
    productId: p.id,
    productName: p.name,
    category: p.category,
    quantity: 1,
    unitPrice: p.price,
  }));
  const total = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const channels = ["web", "app", "store"] as const;

  return {
    id,
    customerId,
    items,
    totalAmount: total,
    status,
    orderDate: daysAgo(daysBack),
    deliveryDate: status === "delivered" ? daysAgo(daysBack - 4) : undefined,
    channel: channels[randomBetween(0, 2)],
  };
}

export const SEED_ORDERS: Order[] = [
  // cust_001 — 5 orders
  makeOrder("ord_001_1", "cust_001", 8),
  makeOrder("ord_001_2", "cust_001", 45),
  makeOrder("ord_001_3", "cust_001", 120),
  makeOrder("ord_001_4", "cust_001", 220),
  makeOrder("ord_001_5", "cust_001", 350),

  // cust_002 — 4 orders
  makeOrder("ord_002_1", "cust_002", 95),
  makeOrder("ord_002_2", "cust_002", 160),
  makeOrder("ord_002_3", "cust_002", 250),
  makeOrder("ord_002_4", "cust_002", 305),

  // cust_003 — 5 orders (recent)
  makeOrder("ord_003_1", "cust_003", 3),
  makeOrder("ord_003_2", "cust_003", 28),
  makeOrder("ord_003_3", "cust_003", 65),
  makeOrder("ord_003_4", "cust_003", 140),
  makeOrder("ord_003_5", "cust_003", 280),

  // cust_004 — 1 order
  makeOrder("ord_004_1", "cust_004", 12),

  // cust_005 — 4 orders
  makeOrder("ord_005_1", "cust_005", 21),
  makeOrder("ord_005_2", "cust_005", 80),
  makeOrder("ord_005_3", "cust_005", 180),
  makeOrder("ord_005_4", "cust_005", 350),

  // cust_006 — 4 orders
  makeOrder("ord_006_1", "cust_006", 74),
  makeOrder("ord_006_2", "cust_006", 130),
  makeOrder("ord_006_3", "cust_006", 200),
  makeOrder("ord_006_4", "cust_006", 270),

  // cust_007 — 5 orders
  makeOrder("ord_007_1", "cust_007", 15),
  makeOrder("ord_007_2", "cust_007", 60),
  makeOrder("ord_007_3", "cust_007", 130),
  makeOrder("ord_007_4", "cust_007", 240),
  makeOrder("ord_007_5", "cust_007", 400),

  // cust_008 — 2 orders
  makeOrder("ord_008_1", "cust_008", 112),
  makeOrder("ord_008_2", "cust_008", 128),

  // cust_009 — 4 orders
  makeOrder("ord_009_1", "cust_009", 30),
  makeOrder("ord_009_2", "cust_009", 95),
  makeOrder("ord_009_3", "cust_009", 200),
  makeOrder("ord_009_4", "cust_009", 310),

  // cust_010 — 3 orders
  makeOrder("ord_010_1", "cust_010", 45),
  makeOrder("ord_010_2", "cust_010", 130),
  makeOrder("ord_010_3", "cust_010", 190),

  // cust_011 — 5 orders
  makeOrder("ord_011_1", "cust_011", 5),
  makeOrder("ord_011_2", "cust_011", 35),
  makeOrder("ord_011_3", "cust_011", 80),
  makeOrder("ord_011_4", "cust_011", 180),
  makeOrder("ord_011_5", "cust_011", 390),

  // cust_012 — 4 orders
  makeOrder("ord_012_1", "cust_012", 68),
  makeOrder("ord_012_2", "cust_012", 140),
  makeOrder("ord_012_3", "cust_012", 220),
  makeOrder("ord_012_4", "cust_012", 340),

  // cust_013 — 1 order
  makeOrder("ord_013_1", "cust_013", 7),

  // cust_014 — 4 orders
  makeOrder("ord_014_1", "cust_014", 18),
  makeOrder("ord_014_2", "cust_014", 90),
  makeOrder("ord_014_3", "cust_014", 200),
  makeOrder("ord_014_4", "cust_014", 380),

  // cust_015 — 4 orders
  makeOrder("ord_015_1", "cust_015", 28),
  makeOrder("ord_015_2", "cust_015", 100),
  makeOrder("ord_015_3", "cust_015", 220),
  makeOrder("ord_015_4", "cust_015", 360),

  // cust_016 — 2 orders
  makeOrder("ord_016_1", "cust_016", 130),
  makeOrder("ord_016_2", "cust_016", 158),

  // cust_017 — 4 orders
  makeOrder("ord_017_1", "cust_017", 10),
  makeOrder("ord_017_2", "cust_017", 70),
  makeOrder("ord_017_3", "cust_017", 180),
  makeOrder("ord_017_4", "cust_017", 390),

  // cust_018 — 3 orders
  makeOrder("ord_018_1", "cust_018", 55),
  makeOrder("ord_018_2", "cust_018", 150),
  makeOrder("ord_018_3", "cust_018", 230),

  // cust_019 — 5 orders
  makeOrder("ord_019_1", "cust_019", 6),
  makeOrder("ord_019_2", "cust_019", 40),
  makeOrder("ord_019_3", "cust_019", 100),
  makeOrder("ord_019_4", "cust_019", 220),
  makeOrder("ord_019_5", "cust_019", 430),

  // cust_020 — 3 orders
  makeOrder("ord_020_1", "cust_020", 78),
  makeOrder("ord_020_2", "cust_020", 170),
  makeOrder("ord_020_3", "cust_020", 290),

  // cust_021 — 1 order
  makeOrder("ord_021_1", "cust_021", 4),

  // cust_022 — 4 orders
  makeOrder("ord_022_1", "cust_022", 25),
  makeOrder("ord_022_2", "cust_022", 110),
  makeOrder("ord_022_3", "cust_022", 250),
  makeOrder("ord_022_4", "cust_022", 420),

  // cust_023 — 4 orders
  makeOrder("ord_023_1", "cust_023", 100),
  makeOrder("ord_023_2", "cust_023", 180),
  makeOrder("ord_023_3", "cust_023", 270),
  makeOrder("ord_023_4", "cust_023", 310),

  // cust_024 — 3 orders
  makeOrder("ord_024_1", "cust_024", 40),
  makeOrder("ord_024_2", "cust_024", 130),
  makeOrder("ord_024_3", "cust_024", 170),

  // cust_025 — 5 orders
  makeOrder("ord_025_1", "cust_025", 14),
  makeOrder("ord_025_2", "cust_025", 60),
  makeOrder("ord_025_3", "cust_025", 140),
  makeOrder("ord_025_4", "cust_025", 280),
  makeOrder("ord_025_5", "cust_025", 450),
];

// ─── Loader ──────────────────────────────────────────────────────────────────

/**
 * Returns a fresh deep copy of seed data.
 * Call this in the store initialiser — never mutate the constants directly.
 */
export function loadSeedData(): { customers: Customer[]; orders: Order[] } {
  return {
    customers: JSON.parse(JSON.stringify(SEED_CUSTOMERS)),
    orders: JSON.parse(JSON.stringify(SEED_ORDERS)),
  };
}
