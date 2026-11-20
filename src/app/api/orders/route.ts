// GET /api/orders — the shopper's order history.
import type { NextRequest } from 'next/server';
import { error, json, requireSession, toId } from '@/lib/api';
import { UID_COOKIE } from '@/lib/session';
import { listOrders } from '@/lib/shop';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  // ⚠️ READ IDOR (identity in a cookie). Same flaw as the cart: the history of
  // whoever `cartora_uid` names is returned — delivery notes included.
  const userId = toId(request.cookies.get(UID_COOKIE)?.value);
  if (!userId) return error('missing or invalid uid cookie', 400);

  return json({ userId, orders: await listOrders(userId) });
}
