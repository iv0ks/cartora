// Seed script — idempotent.
//
// Three shoppers, eight products, a cart each and a few past orders. Orders use
// a **sequential counter** (1–5).
//
//   alice (id 1, you)        orders 1, 5   cart: 2 items
//   bob   (id 2, the victim) orders 2, 3   cart: 2 items
//   carol (id 3, bystander)  order 4       cart: 1 item
//
// Bob's order 3 is a gift whose delivery instructions carry the FLAG. alice can
// only legitimately see her own orders; reaching bob's is the lab.
import { sql as rawSql } from 'drizzle-orm';
import { db, sql } from './client';
import { cartItems, orderItems, orders, products, users } from './schema';
import { hashPassword } from '../lib/password';
import { config } from '../config';

const seedUsers = [
  { id: 1, username: 'alice', password: 'password123', displayName: 'Alice Martins' },
  {
    id: 2,
    username: 'bob',
    password: 'correct-horse-battery-staple',
    displayName: 'Bob Keller',
  },
  { id: 3, username: 'carol', password: 'hunter2hunter2', displayName: 'Carol Nwosu' },
];

const seedProducts = [
  {
    id: 1,
    name: 'Stoneware pour-over set',
    description: 'Hand-glazed dripper, carafe and two cups. Dishwasher safe.',
    priceCents: 4800,
    category: 'Kitchen',
    art: 'coffee',
  },
  {
    id: 2,
    name: 'Merino ribbed beanie',
    description: 'Warm, itch-free and made to be lost on a train. Three colours.',
    priceCents: 3200,
    category: 'Apparel',
    art: 'shirt',
  },
  {
    id: 3,
    name: 'Brass reading lamp',
    description: 'Adjustable arm, warm 2700K bulb, a switch that clicks properly.',
    priceCents: 8900,
    category: 'Home',
    art: 'lamp',
  },
  {
    id: 4,
    name: 'Dot-grid notebook (2-pack)',
    description: 'A5, 120 gsm, lay-flat binding. Fountain-pen friendly.',
    priceCents: 1800,
    category: 'Stationery',
    art: 'book',
  },
  {
    id: 5,
    name: 'Waxed canvas tote',
    description: 'Fits a laptop and a baguette. Gets better with every scuff.',
    priceCents: 5400,
    category: 'Apparel',
    art: 'bag',
  },
  {
    id: 6,
    name: 'Monstera in terracotta',
    description: 'Medium plant, arrives potted. Forgives the occasional missed watering.',
    priceCents: 3600,
    category: 'Home',
    art: 'plant',
  },
  {
    id: 7,
    name: 'Wired studio headphones',
    description: 'Closed-back, detachable cable, flat and honest sound.',
    priceCents: 12900,
    category: 'Audio',
    art: 'headphones',
  },
  {
    id: 8,
    name: 'Enamel camp mug',
    description: 'Speckled enamel, 350 ml. Survives campfires and dishwashers.',
    priceCents: 1400,
    category: 'Kitchen',
    art: 'mug',
  },
];

type SeedOrder = {
  id: number;
  userId: number;
  status: string;
  shippingAddress: string;
  notes: string;
  items: { productId: number; quantity: number }[];
};

const seedOrders: SeedOrder[] = [
  {
    id: 1,
    userId: 1,
    status: 'delivered',
    shippingAddress: '14 Carrer del Rec, 08003 Barcelona',
    notes: 'Leave with the neighbour on the 2nd floor if nobody answers.',
    items: [
      { productId: 4, quantity: 2 },
      { productId: 8, quantity: 1 },
    ],
  },
  {
    id: 2,
    userId: 2,
    status: 'delivered',
    shippingAddress: '221 Maple Row, Leeds LS1 4AP',
    notes: '',
    items: [{ productId: 3, quantity: 1 }],
  },
  {
    // Bob's gift order — the target. Carries the flag in the delivery notes.
    id: 3,
    userId: 2,
    status: 'shipped',
    shippingAddress: '221 Maple Row, Leeds LS1 4AP',
    notes: `Gift for the board. Hand to the concierge, door code: ${config.flag}`,
    items: [
      { productId: 7, quantity: 1 },
      { productId: 1, quantity: 1 },
    ],
  },
  {
    id: 4,
    userId: 3,
    status: 'paid',
    shippingAddress: '9 Harbour Lane, Lagos 101233',
    notes: 'Please ring twice.',
    items: [{ productId: 6, quantity: 2 }],
  },
  {
    id: 5,
    userId: 1,
    status: 'paid',
    shippingAddress: '14 Carrer del Rec, 08003 Barcelona',
    notes: '',
    items: [{ productId: 2, quantity: 1 }],
  },
];

const seedCarts = [
  { userId: 1, productId: 5, quantity: 1 },
  { userId: 1, productId: 8, quantity: 2 },
  { userId: 2, productId: 3, quantity: 1 },
  { userId: 2, productId: 6, quantity: 1 },
  { userId: 3, productId: 4, quantity: 3 },
];

async function main(): Promise<void> {
  console.log('[seed] seeding shoppers …');
  for (const u of seedUsers) {
    const passwordHash = hashPassword(u.password);
    await db
      .insert(users)
      .values({
        id: u.id,
        username: u.username,
        passwordHash,
        displayName: u.displayName,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: { username: u.username, passwordHash, displayName: u.displayName },
      });
  }

  console.log('[seed] seeding products …');
  for (const p of seedProducts) {
    await db
      .insert(products)
      .values(p)
      .onConflictDoUpdate({
        target: products.id,
        set: {
          name: p.name,
          description: p.description,
          priceCents: p.priceCents,
          category: p.category,
          art: p.art,
        },
      });
  }

  console.log('[seed] seeding orders …');
  const price = new Map(seedProducts.map((p) => [p.id, p]));
  for (const o of seedOrders) {
    const totalCents = o.items.reduce(
      (sum, i) => sum + price.get(i.productId)!.priceCents * i.quantity,
      0,
    );
    await db
      .insert(orders)
      .values({
        id: o.id,
        userId: o.userId,
        status: o.status,
        totalCents,
        shippingAddress: o.shippingAddress,
        notes: o.notes,
      })
      .onConflictDoUpdate({
        target: orders.id,
        set: {
          userId: o.userId,
          status: o.status,
          totalCents,
          shippingAddress: o.shippingAddress,
          notes: o.notes,
        },
      });
    // Re-create the line items so re-seeding converges to the same state.
    await db.delete(orderItems).where(rawSql`${orderItems.orderId} = ${o.id}`);
    for (const i of o.items) {
      const p = price.get(i.productId)!;
      await db.insert(orderItems).values({
        orderId: o.id,
        productId: p.id,
        name: p.name,
        unitPriceCents: p.priceCents,
        quantity: i.quantity,
      });
    }
  }

  console.log('[seed] seeding carts …');
  // Carts are mutable at runtime, so reset them to the known state on each boot.
  await db.delete(cartItems);
  await db.insert(cartItems).values(seedCarts);

  // We inserted explicit order ids, so move the serial sequence past them or the
  // first real checkout would collide with a seeded order.
  await db.execute(
    rawSql`SELECT setval(pg_get_serial_sequence('orders', 'id'), (SELECT max(id) FROM orders))`,
  );

  console.log(
    "[seed] done. shoppers: alice, bob, carol. flag seeded in bob's gift order (id 3) delivery notes.",
  );
  await sql.end();
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
