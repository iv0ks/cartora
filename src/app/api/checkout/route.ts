// POST /api/checkout — place an order for everything in the cart.
import type { NextRequest } from 'next/server';
import { error, json, readJson, requireSession, toId } from '@/lib/api';
import { checkout } from '@/lib/shop';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<Response> {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const body = await readJson(request);
  // ⚠️ WRITE IDOR (identity in the body). The order is placed for whichever
  // `userId` the client names: their cart is emptied and their account billed.
  const userId = toId(body?.userId);
  if (!userId) return error('userId is required', 400);

  const shippingAddress = typeof body?.shippingAddress === 'string' ? body.shippingAddress : '';
  const notes = typeof body?.notes === 'string' ? body.notes.slice(0, 500) : '';
  if (!shippingAddress.trim()) return error('shippingAddress is required', 400);

  const order = await checkout(userId, shippingAddress.slice(0, 200), notes);
  if (!order) return error('cart is empty', 409);
  return json({ order }, 201);
}
