// POST   /api/cart/items — add a product to the cart.
// DELETE /api/cart/items — remove a product from the cart.
import type { NextRequest } from 'next/server';
import { error, json, readJson, requireSession, toId } from '@/lib/api';
import { addToCart, getCart, removeFromCart } from '@/lib/shop';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<Response> {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const body = await readJson(request);
  // ⚠️ WRITE IDOR (identity in the body). The cart to modify is named by the
  // request's own `userId` field, not by the session.
  const userId = toId(body?.userId);
  const productId = toId(body?.productId);
  const quantity = body?.quantity === undefined ? 1 : toId(body.quantity);
  if (!userId || !productId || !quantity || quantity > 20) {
    return error('userId, productId and a quantity between 1 and 20 are required', 400);
  }

  if (!(await addToCart(userId, productId, quantity))) return error('product not found', 404);
  return json(await getCart(userId), 201);
}

export async function DELETE(request: NextRequest): Promise<Response> {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const body = await readJson(request);
  // ⚠️ WRITE IDOR (identity in the body) — same flaw on the remove path.
  const userId = toId(body?.userId);
  const productId = toId(body?.productId);
  if (!userId || !productId) return error('userId and productId are required', 400);

  await removeFromCart(userId, productId);
  return json(await getCart(userId));
}
