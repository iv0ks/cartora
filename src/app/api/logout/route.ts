// POST /api/logout — clear both cookies.
import { json } from '@/lib/api';
import { SESSION_COOKIE, UID_COOKIE } from '@/lib/session';

export const dynamic = 'force-dynamic';

export function POST(): Response {
  const response = json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(UID_COOKIE);
  return response;
}
