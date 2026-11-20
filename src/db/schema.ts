// Database schema (Drizzle ORM).
//
// cartora is a small online shop. Every shopper owns one cart (a set of
// `cart_items` rows) and any number of `orders`. The ownership column is
// `user_id` on both `cart_items` and `orders`.
//
// Ids are plain sequential integers on purpose. The lab is not about guessing
// ids: the identity that decides *whose* cart or orders a request touches comes
// from the client (a cookie and a request body), not from the session. That
// missing server-side binding between "who is logged in" and "whose data" is
// the flaw (CWE-639).
import { pgTable, integer, serial, text, timestamp, unique } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: integer('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
});

export const products = pgTable('products', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  // Prices are stored as integer cents to avoid floating-point money.
  priceCents: integer('price_cents').notNull(),
  category: text('category').notNull(),
  // Key into the UI's illustration set (no remote images).
  art: text('art').notNull(),
});

export const cartItems = pgTable(
  'cart_items',
  {
    id: serial('id').primaryKey(),
    // Whose cart this row belongs to — the boundary the vulnerable endpoints
    // take from the client instead of the session.
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    quantity: integer('quantity').notNull().default(1),
  },
  (t) => [unique('cart_items_user_product_uq').on(t.userId, t.productId)],
);

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  // 'paid' | 'shipped' | 'delivered'
  status: text('status').notNull().default('paid'),
  totalCents: integer('total_cents').notNull(),
  shippingAddress: text('shipping_address').notNull(),
  // Free-form delivery instructions. The victim's gift order carries the FLAG
  // here.
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id),
  // Snapshot of the product at purchase time.
  name: text('name').notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
  quantity: integer('quantity').notNull(),
});

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
