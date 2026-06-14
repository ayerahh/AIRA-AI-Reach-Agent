import { NextResponse } from "next/server";
import { getCustomers, getOrders } from "@/lib/store";
import type { Customer, Order, OrderItem, OrderStatus, ProductCategory, CustomerTier, CustomerStatus, PreferredChannel } from "@/lib/types";

// Gender-neutral Indian names
const INDIAN_NAMES = [
  "Priya", "Amit", "Rajesh", "Meera", "Vikram",
  "Neha", "Rohan", "Anjali", "Karthik", "Divya",
  "Arjun", "Sneha", "Manish", "Pooja", "Suresh", "Kavita"
];

// Cities list
const CITIES = ["Bangalore", "Mumbai", "Pune", "Delhi", "Chennai", "Hyderabad"];

// Helper to calculate favorite category from orders (based on highest order count/items)
function calculateFavoriteCategory(orders: any[]): string {
  const counts: Record<string, number> = {};
  for (const order of orders) {
    if (order.category) {
      counts[order.category] = (counts[order.category] || 0) + 1;
    } else if (order.items && order.items.length > 0) {
      const cat = order.items[0].category;
      counts[cat] = (counts[cat] || 0) + 1;
    }
  }
  let fav = "general";
  let max = -1;
  for (const [cat, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      fav = cat;
    }
  }
  return fav;
}

// Helper to determine customer tier
function getTier(totalSpend: number): CustomerTier {
  if (totalSpend < 10000) return "bronze";
  if (totalSpend < 20000) return "silver";
  if (totalSpend < 40000) return "gold";
  return "platinum";
}

// Helper to generate witty observation with Groq API
async function generateWittyObservation(customer: any): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return "";

  try {
    const prompt = `You are AIRA, a clever and elegant CRM assistant. Write a short, witty, and elegant observation sentence about this customer based on their shopping behavior.
Do not use cringe jokes, emojis, or exclamation marks. Be sophisticated, clever, and elegant.
Keep it under 20 words.
Customer Name: ${customer.name}
Persona: ${customer.persona || "Regular Customer"}
Total Spend: INR ${customer.totalSpend}
Total Orders: ${customer.orderCount}
Favorite Category: ${customer.favoriteCategory || "general"}
Preferred Channel: ${customer.preferredChannel}

Examples of the style:
- 'Akhil has purchased protein 14 times this year and still has supplements waiting in cart.'
- 'Priya has explored 37 premium products this month and purchased 6. Her standards are refreshingly high.'
- 'Rahul has redesigned his living room three times this quarter. The lighting situation remains under active review.'

Observation:`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 60,
      }),
    });

    if (!response.ok) {
      console.error("Groq API error inside import:", response.statusText);
      return "";
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";
    return content.replace(/^["']|["']$/g, "");
  } catch (error) {
    console.error("Failed to generate witty observation with Groq:", error);
    return "";
  }
}

// Find top customer by weighted score and enrich with witty observation
async function enrichTopCustomerWithWittyObservation(customers: any[]) {
  if (customers.length === 0 || !process.env.GROQ_API_KEY) return;

  const maxSpend = Math.max(...customers.map(c => Number(c.totalSpend || 0))) || 1;
  const maxOrders = Math.max(...customers.map(c => Number(c.orderCount || 0))) || 1;
  
  const maxDateStr = customers.reduce((max: string, c: any) => c.lastOrderDate > max ? c.lastOrderDate : max, "2025-02-14");
  const maxDateTime = new Date(maxDateStr).getTime();

  let topCustomer: any = null;
  let topScore = -1;

  for (const c of customers) {
    const spendScore = ((c.totalSpend || 0) / maxSpend) * 100;
    const orderScore = ((c.orderCount || 0) / maxOrders) * 100;

    let recencyScore = 0;
    if (c.lastOrderDate) {
      const diffTime = maxDateTime - new Date(c.lastOrderDate).getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
      if (diffDays <= 30) {
        recencyScore = 100;
      }
    }

    // Weighted Score: 50% totalSpend, 30% orderCount, 20% recency
    const score = (spendScore * 0.5) + (orderScore * 0.3) + (recencyScore * 0.2);
    if (score > topScore) {
      topScore = score;
      topCustomer = c;
    }
  }

  if (topCustomer) {
    const wittyObs = await generateWittyObservation(topCustomer);
    if (wittyObs) {
      topCustomer.wittyObservation = wittyObs;
    }
  }
}

// Helper to get season name and order amount multiplier
function getSeasonAndMultiplier(dateStr: string): { season: string; multiplier: number } {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.getMonth(); // 0 is January, 11 is December. Last 60 days covers April (3), May (4), June (5)
  
  // 1. Salary Day: 30, 31, 1, 2, 3, 4, 5 of any month
  if (day >= 30 || day <= 5) {
    return { season: "Salary Day", multiplier: 1.2 };
  }
  // 2. Black Friday: if day of month is 24, 25, 26, 27 (simulated)
  if (day >= 24 && day <= 27) {
    return { season: "Black Friday", multiplier: 2.0 };
  }
  // 3. Diwali: if day of month is 10, 11, 12, 13, 14, 15 (simulated)
  if (day >= 10 && day <= 15) {
    return { season: "Diwali", multiplier: 1.8 };
  }
  // 4. New Year: if day of month is 28, 29 (simulated)
  if (day === 28 || day === 29) {
    return { season: "New Year", multiplier: 1.3 };
  }
  // 5. IPL Season: April (3) and May (4)
  if (month === 3 || month === 4) {
    return { season: "IPL Season", multiplier: 1.1 };
  }
  // 6. Wedding Season: June (5)
  if (month === 5) {
    return { season: "Wedding Season", multiplier: 1.4 };
  }
  
  return { season: "Regular Season", multiplier: 1.0 };
}

// Product generation maps
const BRAND_PRODUCTS: Record<string, Record<string, string[]>> = {
  "beauty-brand": {
    skincare: ["Hydrating Serum", "Daily Moisturizer", "Squalane Cleanser", "SPF 50 Sunscreen", "Retinol Night Cream", "Clay Face Mask"],
    makeup: ["Matte Lipstick", "Liquid Foundation", "Volumizing Mascara", "Setting Powder", "Dewy Blush", "Eye Shadow Palette"],
    haircare: ["Nourishing Shampoo", "Argan Oil Conditioner", "Hair Repair Mask", "Scalp Serum", "Volumizing Spray"],
    fragrance: ["Citrus Eau de Parfum", "Vanilla Body Mist", "Sandalwood Cologne", "Lavender Rollerball"]
  },
  "fitness-brand": {
    supplements: ["Whey Protein Isolate", "Creatine Monohydrate", "Pre-Workout Powder", "Vegan Protein Blend", "BCAA Energy Drink"],
    equipment: ["Resistance Bands Set", "Adjustable Dumbbells", "Yoga Mat Pro", "Kettlebell 12kg", "Jump Rope Speed"],
    apparel: ["Dry-Fit Athletic Tee", "High-Waisted Leggings", "Running Shorts", "Compression Socks", "Sports Bra Pro"],
    accessories: ["Insulated Water Bottle", "Gym Duffel Bag", "Sweat Wristbands", "Shaker Bottle", "Lifting Straps"]
  }
};

export async function POST(req: Request) {
  try {
    const storeCustomers = getCustomers();
    const storeOrders = getOrders();

    // 1. Safeguard check
    if (storeCustomers.length >= 2000) {
      return NextResponse.json(
        { success: false, error: "Memory limit reached. Cannot import more than 2000 customers." },
        { status: 400 }
      );
    }

    // 2. Parse request body
    const body = await req.json();
    const { type, customerCount, ordersPerCustomer, source, customers } = body;

    // Handle source === 'paste'
    if (source === "paste") {
      if (!Array.isArray(customers)) {
        return NextResponse.json(
          { success: false, error: "Invalid data format. Expected an array of customers." },
          { status: 400 }
        );
      }

      const addedCustomersList: Customer[] = [];
      const addedOrdersList: Order[] = [];
      let duplicatesSkipped = 0;

      const existingEmails = new Set(storeCustomers.map(c => c.email.toLowerCase()));

      for (const rawCust of customers) {
        // Validate each customer has name, email, totalSpend, orderCount
        if (!rawCust.name || !rawCust.email || rawCust.totalSpend === undefined || rawCust.orderCount === undefined) {
          return NextResponse.json(
            { success: false, error: "Each customer must have name, email, totalSpend, and orderCount." },
            { status: 400 }
          );
        }

        const email = rawCust.email.toLowerCase();
        if (existingEmails.has(email)) {
          duplicatesSkipped++;
          continue;
        }

        const customerId = rawCust.id || `cust_paste_${Math.random().toString(36).substring(2, 9)}`;
        const totalSpend = Number(rawCust.totalSpend);
        const orderCount = Number(rawCust.orderCount);
        const avgOrderValue = orderCount > 0 ? Math.round(totalSpend / orderCount) : 0;
        const lastOrderDate = rawCust.lastOrderDate || new Date().toISOString().split("T")[0];
        
        // Joined date
        const lastDateObj = new Date(lastOrderDate);
        lastDateObj.setDate(lastDateObj.getDate() - 30);
        const joinedDate = lastDateObj.toISOString().split("T")[0];

        const phone = rawCust.phone || `+91-${["9", "8", "7", "6"][Math.floor(Math.random() * 4)]}${Math.random().toString().substring(2, 11)}`.substring(0, 15);
        const city = rawCust.city || "Bangalore";
        const tier = rawCust.tier || getTier(totalSpend);
        const preferredChannel = rawCust.preferredChannel || "email";
        const persona = rawCust.persona || "Regular Customer";
        
        // Status based on days since last order
        const now = new Date();
        const lastOrderDateObj = new Date(lastOrderDate);
        const daysSinceLastOrder = Math.max(0, Math.floor((now.getTime() - lastOrderDateObj.getTime()) / (1000 * 3600 * 24)));
        const status = daysSinceLastOrder > 45 ? "lapsed" : daysSinceLastOrder > 30 ? "at_risk" : "active";

        const tags = [persona, "pasted-data"];
        if (rawCust.tags && Array.isArray(rawCust.tags)) {
          tags.push(...rawCust.tags);
        }

        const customer: Customer = {
          id: customerId,
          name: rawCust.name,
          email: rawCust.email,
          phone,
          city,
          tier: tier as CustomerTier,
          status,
          totalSpend,
          orderCount,
          avgOrderValue,
          lastOrderDate,
          joinedDate,
          preferredChannel: preferredChannel as PreferredChannel,
          tags,
          engagementScore: rawCust.engagementScore || Math.floor(60 + Math.random() * 31)
        };

        // Create orders for this customer to sync the store
        for (let j = 0; j < orderCount; j++) {
          const orderId = `ord_paste_${Math.random().toString(36).substring(2, 9)}`;
          // Distribute order dates slightly
          const orderDateObj = new Date(lastOrderDate);
          orderDateObj.setDate(orderDateObj.getDate() - Math.floor(Math.random() * 15));
          const orderDateStr = orderDateObj.toISOString().split("T")[0];

          const orderItem: OrderItem = {
            productId: `prod_paste_${Math.random().toString(36).substring(2, 9)}`,
            productName: "Pasted Product",
            category: "merchandise",
            quantity: 1,
            unitPrice: avgOrderValue
          };

          const order: Order = {
            id: orderId,
            customerId,
            items: [orderItem],
            totalAmount: avgOrderValue,
            status: "delivered",
            orderDate: orderDateStr,
            channel: "web"
          };

          addedOrdersList.push(order);
        }

        addedCustomersList.push(customer);
      }

      await enrichTopCustomerWithWittyObservation(addedCustomersList);

      storeCustomers.push(...addedCustomersList);
      storeOrders.push(...addedOrdersList);

      return NextResponse.json({
        success: true,
        customersAdded: addedCustomersList.length,
        ordersAdded: addedOrdersList.length,
        duplicatesSkipped,
        totalCustomers: storeCustomers.length,
        totalOrders: storeOrders.length,
        preview: addedCustomersList.slice(0, 5),
        importedCustomers: addedCustomersList
      });
    }

    // Validate request inputs (fallback logic for standard demo generation)
    if (type !== "beauty-brand" && type !== "fitness-brand") {
      return NextResponse.json(
        { success: false, error: "Invalid type. Must be 'beauty-brand' or 'fitness-brand'." },
        { status: 400 }
      );
    }

    const count = parseInt(customerCount, 10);
    const ordersCount = parseInt(ordersPerCustomer, 10);

    if (isNaN(count) || count < 1 || count > 100) {
      return NextResponse.json(
        { success: false, error: "customerCount must be a number between 1 and 100." },
        { status: 400 }
      );
    }

    if (isNaN(ordersCount) || ordersCount < 1 || ordersCount > 10) {
      return NextResponse.json(
        { success: false, error: "ordersPerCustomer must be a number between 1 and 10." },
        { status: 400 }
      );
    }

    // Enforce maximum 500 orders per import
    if (count * ordersCount > 500) {
      return NextResponse.json(
        { success: false, error: "Total generated orders exceeds the limit of 500 per import." },
        { status: 400 }
      );
    }

    const existingEmails = new Set(storeCustomers.map(c => c.email.toLowerCase()));
    
    const addedCustomersList: Customer[] = [];
    const addedOrdersList: Order[] = [];
    let duplicatesSkipped = 0;

    const brandConfig = BRAND_PRODUCTS[type];
    const categories = Object.keys(brandConfig);

    const priceMin = type === "beauty-brand" ? 500 : 800;
    const priceMax = type === "beauty-brand" ? 3000 : 2500;
    const medianAov = type === "beauty-brand" ? 1750 : 1650;

    for (let i = 0; i < count; i++) {
      // Pick a random name
      const name = INDIAN_NAMES[Math.floor(Math.random() * INDIAN_NAMES.length)];
      // Generate email (name + random number + @example.com)
      const email = `${name.toLowerCase()}${Math.floor(100 + Math.random() * 900)}@example.com`;

      // 3. Deduplication check
      if (existingEmails.has(email.toLowerCase())) {
        duplicatesSkipped++;
        continue;
      }

      // Customer unique ID
      const customerId = `cust_import_${Math.random().toString(36).substring(2, 9)}`;

      // Generate orders first for this customer
      const customerOrders: any[] = [];
      let totalSpend = 0;
      const orderDates: string[] = [];

      for (let j = 0; j < ordersCount; j++) {
        // Generate random date in last 60 days
        const daysAgo = Math.floor(Math.random() * 60);
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        const orderDateStr = date.toISOString().split("T")[0];
        orderDates.push(orderDateStr);

        // Generate product and category
        const category = categories[Math.floor(Math.random() * categories.length)];
        const productOptions = brandConfig[category];
        const productName = productOptions[Math.floor(Math.random() * productOptions.length)];

        // Generate base amount
        const baseAmount = Math.floor(priceMin + Math.random() * (priceMax - priceMin + 1));
        
        // Seasonal Metadata & Multiplier check
        const { season, multiplier } = getSeasonAndMultiplier(orderDateStr);
        const amount = Math.round(baseAmount * multiplier);
        totalSpend += amount;

        // Apply discount to 30% of orders
        const discountApplied = Math.random() < 0.3;

        const orderId = `ord_import_${Math.random().toString(36).substring(2, 9)}`;
        const orderItem: OrderItem = {
          productId: `prod_import_${Math.random().toString(36).substring(2, 9)}`,
          productName,
          category: category as ProductCategory,
          quantity: 1,
          unitPrice: amount
        };

        const order: Order = {
          id: orderId,
          customerId,
          items: [orderItem],
          totalAmount: amount,
          status: "delivered" as OrderStatus,
          orderDate: orderDateStr,
          channel: "web" as const,
        };

        // Add top-level fields for specific user specifications
        (order as any).productName = productName;
        (order as any).category = category;
        (order as any).amount = amount;
        (order as any).discountApplied = discountApplied;
        (order as any).season = season;

        customerOrders.push(order);
      }

      // Aggregate RFM values
      orderDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      const lastOrderDate = orderDates[0];
      const oldestOrderDate = orderDates[orderDates.length - 1];

      // joinedDate: oldest order date minus 10-30 random days
      const joinedDateObj = new Date(oldestOrderDate);
      joinedDateObj.setDate(joinedDateObj.getDate() - Math.floor(10 + Math.random() * 21));
      const joinedDate = joinedDateObj.toISOString().split("T")[0];

      // Calculate days since last order
      const now = new Date();
      const lastOrderDateObj = new Date(lastOrderDate);
      const daysSinceLastOrder = Math.max(0, Math.floor((now.getTime() - lastOrderDateObj.getTime()) / (1000 * 3600 * 24)));

      const phoneStart = ["9", "8", "7", "6"][Math.floor(Math.random() * 4)];
      const phoneRest = Math.random().toString().substring(2, 11);
      const phone = `+91-${phoneStart}${phoneRest}`.substring(0, 15);

      const city = CITIES[Math.floor(Math.random() * CITIES.length)];
      const tier = getTier(totalSpend);
      const engagementScore = Math.floor(40 + Math.random() * 61); // 40 to 100

      const randChannel = Math.random();
      const preferredChannel: PreferredChannel = randChannel < 0.6 ? "email" : randChannel < 0.9 ? "whatsapp" : "sms";

      // Calculate discount rate and average order value (AOV)
      const aov = totalSpend / ordersCount;
      const discountCount = customerOrders.filter(o => o.discountApplied).length;
      const discountRate = discountCount / ordersCount;

      // 4. Persona Assignment
      let persona = "Regular Customer"; // Default persona
      
      if (daysSinceLastOrder > 45) {
        persona = "Inactive Customer";
      } else if (type === "fitness-brand" && ordersCount >= 6) {
        persona = "Fitness Freak";
      } else if (totalSpend > 30000 && ordersCount < 5) {
        persona = "Luxury Buyer";
      } else if (ordersCount >= 8 && aov < 800) {
        persona = "Impulse Shopper";
      } else if (ordersCount > 5 && aov >= 1000 && aov <= 2000) {
        persona = "Loyal Customer";
      } else if (discountRate > 0.5 && aov < medianAov) {
        persona = "Discount Hunter";
      } else if (aov < 1000) {
        persona = "Discount Hunter";
      }

      // Determine customer status based on days since last order
      const status: CustomerStatus = daysSinceLastOrder > 45 ? "lapsed" : daysSinceLastOrder > 30 ? "at_risk" : "active";

      const favoriteCategory = calculateFavoriteCategory(customerOrders);

      // Create tags list
      const tags = [persona, favoriteCategory, type === "beauty-brand" ? "beauty-lover" : "fitness-enthusiast"];

      const customer: Customer = {
        id: customerId,
        name,
        email,
        phone,
        city,
        tier,
        status,
        totalSpend,
        orderCount: ordersCount,
        avgOrderValue: Math.round(aov),
        lastOrderDate,
        joinedDate,
        preferredChannel,
        tags,
        engagementScore
      };

      // Add extra preview fields to customer directly for ease
      (customer as any).LTV = totalSpend;
      (customer as any).favoriteCategory = favoriteCategory;

      addedCustomersList.push(customer);
      addedOrdersList.push(...customerOrders);
    }

    await enrichTopCustomerWithWittyObservation(addedCustomersList);

    // Append to in-memory store
    storeCustomers.push(...addedCustomersList);
    storeOrders.push(...addedOrdersList);

    // Prepare preview of first 5 added customers
    const preview = addedCustomersList.slice(0, 5);

    return NextResponse.json({
      success: true,
      customersAdded: addedCustomersList.length,
      ordersAdded: addedOrdersList.length,
      duplicatesSkipped,
      totalCustomers: storeCustomers.length,
      totalOrders: storeOrders.length,
      preview,
      importedCustomers: storeCustomers
    });

  } catch (error: unknown) {
    console.error("Data import error:", error);
    const message = error instanceof Error ? error.message : "Failed to import brand data";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
