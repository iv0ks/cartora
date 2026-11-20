// Data access for the shop. Every function takes the owning `userId` as an
// argument and trusts the caller to pass the right one — the route handlers are
// where that value comes from.
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { cartItems, orderItems, orders, products, users } from '@/db/schema';

export async function listProducts() {
  return db.select().from(products).orderBy(asc(products.id));
}

export async function findUserByUsername(username: string) {
  const [row] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return row;
}

export async function findUserById(id: number) {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row;
}

export async function getCart(userId: number) {
  const items = await db
    .select({
      productId: cartItems.productId,
      name: products.name,
      art: products.art,
      unitPriceCents: products.priceCents,
      quantity: cartItems.quantity,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, userId))
    .orderBy(asc(cartItems.id));
  const totalCents = items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
  return { userId, items, totalCents };
}

export async function addToCart(userId: number, productId: number, quantity: number) {
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return false;
  await db
    .insert(cartItems)
    .values({ userId, productId, quantity })
    .onConflictDoUpdate({
      target: [cartItems.userId, cartItems.productId],
      set: { quantity: sql`${cartItems.quantity} + ${quantity}` },
    });
  return true;
}

export async function removeFromCart(userId: number, productId: number) {
  await db
    .delete(cartItems)
    .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)));
}

// Turn the cart into an order, in one transaction. Returns null on an empty cart.
export async function checkout(userId: number, shippingAddress: string, notes: string) {
  return db.transaction(async (tx) => {
    const lines = await tx
      .select({
        productId: cartItems.productId,
        name: products.name,
        unitPriceCents: products.priceCents,
        quantity: cartItems.quantity,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.userId, userId));
    if (lines.length === 0) return null;

    const totalCents = lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
    const [order] = await tx
      .insert(orders)
      .values({ userId, status: 'paid', totalCents, shippingAddress, notes })
      .returning();
    await tx.insert(orderItems).values(lines.map((l) => ({ orderId: order!.id, ...l })));
    await tx.delete(cartItems).where(eq(cartItems.userId, userId));
    return { ...order!, items: lines };
  });
}

export async function listOrders(userId: number) {
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.id));
  if (rows.length === 0) return [];

  const lines = await db
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        rows.map((o) => o.id),
      ),
    )
    .orderBy(asc(orderItems.id));
  return rows.map((o) => ({
    ...o,
    items: lines.filter((l) => l.orderId === o.id),
  }));
}
