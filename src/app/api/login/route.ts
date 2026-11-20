// POST /api/login — verify credentials and start a session.
//
// Sets TWO cookies: the signed, HttpOnly `cartora_session` (who authenticated)
// and a plain `cartora_uid` that the UI reads to show "signed in as …". The
// second one is the trap: the cart and order endpoints end up trusting it.
import type { NextRequest } from 'next/server';
import { error, json, readJson } from '@/lib/api';
import { verifyPassword } from '@/lib/password';
import { createSessionToken, SESSION_COOKIE, sessionMaxAge, UID_COOKIE } from '@/lib/session';
import { findUserByUsername } from '@/lib/shop';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<Response> {
  const body = await readJson(request);
  const username = typeof body?.username === 'string' ? body.username : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!username || !password) return error('username and password are required', 400);

  const user = await findUserByUsername(username);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return error('invalid credentials', 401);
  }

  const response = json({
    ok: true,
    user: { id: user.id, username: user.username, displayName: user.displayName },
  });
  response.cookies.set(SESSION_COOKIE, createSessionToken(user.id), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: sessionMaxAge,
  });
  response.cookies.set(UID_COOKIE, String(user.id), {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: sessionMaxAge,
  });
  return response;
}
