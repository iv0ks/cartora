// GET /api/cart — the shopper's cart.
import type { NextRequest } from 'next/server';
import { error, json, requireSession, toId } from '@/lib/api';
import { UID_COOKIE } from '@/lib/session';
import { getCart } from '@/lib/shop';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  // Authentication: a valid signed session must exist …
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  // ⚠️ READ IDOR (identity in a cookie). … but whose cart is it? The handler
  // takes the owner from the `cartora_uid` cookie — a value the client sets —
  // instead of `auth.session.userId`, which is what the server signed.
  const userId = toId(request.cookies.get(UID_COOKIE)?.value);
  if (!userId) return error('missing or invalid uid cookie', 400);

  return json(await getCart(userId));
}
