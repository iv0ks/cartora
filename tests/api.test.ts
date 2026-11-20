// Route-handler tests that do not need a live database.
//
// The full exploit (log in as alice, change the uid cookie to bob's, read bob's
// order and the flag) is verified end-to-end against the Docker stack (see
// SOLUTION.md). Here the data layer is replaced by a spy, which lets us pin the
// two things that matter without Postgres:
//   1. every protected route still demands a valid *session* (authentication), and
//   2. the vulnerable routes then use the CLIENT-supplied id — cookie or body —
//      not the session's (the lab, CWE-639).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const shop = vi.hoisted(() => ({
  getCart: vi.fn(async (userId: number) => ({ userId, items: [], totalCents: 0 })),
  listOrders: vi.fn(async () => []),
  addToCart: vi.fn(async () => true),
  removeFromCart: vi.fn(async () => undefined),
  checkout: vi.fn(async (userId: number) => ({ id: 99, userId, items: [] })),
  findUserByUsername: vi.fn(),
  findUserById: vi.fn(),
  listProducts: vi.fn(async () => []),
}));
vi.mock('../src/lib/shop', () => shop);

import { GET as healthz } from '../src/app/healthz/route';
import { POST as login } from '../src/app/api/login/route';
import { GET as me } from '../src/app/api/me/route';
import { GET as cart } from '../src/app/api/cart/route';
import { DELETE as removeItem, POST as addItem } from '../src/app/api/cart/items/route';
import { POST as placeOrder } from '../src/app/api/checkout/route';
import { GET as orders } from '../src/app/api/orders/route';
import { createSessionToken } from '../src/lib/session';

const ALICE = 1;
const BOB = 2;

function req(path: string, init: { method?: string; body?: unknown; cookie?: string } = {}) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: init.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(init.cookie ? { cookie: init.cookie } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

// A valid session for alice, plus a uid cookie the caller chooses.
const asAlice = (uid: number | string = ALICE) =>
  `cartora_session=${createSessionToken(ALICE)}; cartora_uid=${uid}`;

beforeEach(() => vi.clearAllMocks());

describe('cartora http surface', () => {
  it('serves the health check', async () => {
    const res = healthz();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });

  it('rejects a login without credentials', async () => {
    const res = await login(req('/api/login', { method: 'POST', body: {} }));
    expect(res.status).toBe(400);
  });

  it.each([
    ['GET /api/me', () => me(req('/api/me'))],
    ['GET /api/cart', () => cart(req('/api/cart'))],
    ['POST /api/cart/items', () => addItem(req('/api/cart/items', { method: 'POST', body: {} }))],
    [
      'DELETE /api/cart/items',
      () => removeItem(req('/api/cart/items', { method: 'DELETE', body: {} })),
    ],
    ['POST /api/checkout', () => placeOrder(req('/api/checkout', { method: 'POST', body: {} }))],
    ['GET /api/orders', () => orders(req('/api/orders'))],
  ])('requires a session: %s', async (_name, call) => {
    expect((await call()).status).toBe(401);
  });

  it('does not accept a forged uid cookie in place of a session', async () => {
    const res = await orders(req('/api/orders', { cookie: `cartora_uid=${BOB}` }));
    expect(res.status).toBe(401);
    expect(shop.listOrders).not.toHaveBeenCalled();
  });

  it('does not accept a tampered session cookie', async () => {
    const [, signature] = createSessionToken(ALICE).split('.');
    const forged = Buffer.from(JSON.stringify({ userId: BOB, exp: 9999999999 })).toString(
      'base64url',
    );
    const res = await cart(req('/api/cart', { cookie: `cartora_session=${forged}.${signature}` }));
    expect(res.status).toBe(401);
  });
});

describe('the lab: identity comes from the client (CWE-639)', () => {
  it("GET /api/cart serves the cart the uid COOKIE names, not the session user's", async () => {
    const res = await cart(req('/api/cart', { cookie: asAlice(BOB) }));
    expect(res.status).toBe(200);
    expect(shop.getCart).toHaveBeenCalledWith(BOB);
  });

  it("GET /api/orders serves the orders the uid COOKIE names, not the session user's", async () => {
    const res = await orders(req('/api/orders', { cookie: asAlice(BOB) }));
    expect(res.status).toBe(200);
    expect(shop.listOrders).toHaveBeenCalledWith(BOB);
  });

  it('POST /api/cart/items modifies the cart the BODY userId names', async () => {
    const res = await addItem(
      req('/api/cart/items', {
        method: 'POST',
        cookie: asAlice(),
        body: { userId: BOB, productId: 7, quantity: 1 },
      }),
    );
    expect(res.status).toBe(201);
    expect(shop.addToCart).toHaveBeenCalledWith(BOB, 7, 1);
  });

  it('POST /api/checkout places the order for the BODY userId', async () => {
    const res = await placeOrder(
      req('/api/checkout', {
        method: 'POST',
        cookie: asAlice(),
        body: { userId: BOB, shippingAddress: '1 Attacker St' },
      }),
    );
    expect(res.status).toBe(201);
    expect(shop.checkout).toHaveBeenCalledWith(BOB, '1 Attacker St', '');
  });

  it('rejects a malformed uid cookie before it reaches the data layer', async () => {
    const res = await cart(req('/api/cart', { cookie: asAlice('1 OR 1=1') }));
    expect(res.status).toBe(400);
    expect(shop.getCart).not.toHaveBeenCalled();
  });

  it('rejects a checkout without a shipping address', async () => {
    const res = await placeOrder(
      req('/api/checkout', { method: 'POST', cookie: asAlice(), body: { userId: ALICE } }),
    );
    expect(res.status).toBe(400);
  });
});
