# cartora

![CWE-639](https://img.shields.io/badge/CWE--639-IDOR-red?style=flat-square)
![Next.js](https://img.shields.io/badge/Node-Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Lab-Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
[![GHCR](https://img.shields.io/badge/ghcr.io-iv0ks%2Fcartora-blue?logo=docker)](https://github.com/iv0ks/cartora/pkgs/container/cartora)

**cartora is an intentionally vulnerable application built for security education.** It contains a deliberate [IDOR / broken access control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
(CWE-639) flaw in an **online shop** — proving that a valid login is not the same as "this cart and these orders are yours" when the server lets the *client* say who it is.

<br>

<div align="center">

| 🛡️ Vulnerability | 🎯 Difficulty | 🛠️ Stack | 🚩 Entry point |
| :--- | :--- | :--- | :--- |
| Client-controlled identity IDOR (CWE-639) | ⭐⭐⭐⭐⭐ Level 7 | Node · Next.js | `GET /api/cart` · `GET /api/orders` · `POST /api/cart/items` · `POST /api/checkout` |

</div>

<br>

> [!NOTE]
> The guided, spoiler-free path is [GUIDE.md](GUIDE.md); the full answer waits in [SOLUTION.md](SOLUTION.md) whenever you want it.

<br>

## 📂 Project layout

The repository is organised so the vulnerable code is easy to find and reason
about. The **application** is a Next.js (App Router) project in `src/` — React
pages styled with Tailwind and shadcn/ui, plus **Route Handlers** that form the
API. The **data layer** is Drizzle ORM over Postgres (`src/db/` + `drizzle/`
migrations), and the **tooling** around it (Docker, CI/CD, linters) turns the
lab into a production-shaped project. The challenge flag is never in the repo —
it is baked into the image and seeded into the victim's order.

```
cartora/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── page.tsx             # the shop (catalogue)
│   │   ├── cart/ orders/ login/ # the other pages
│   │   ├── healthz/route.ts     # GET /healthz → "ok"
│   │   └── api/                 # Route Handlers (the bug lives here)
│   │       ├── login/ logout/ me/ products/
│   │       ├── cart/route.ts        # GET  cart   (identity from a cookie)
│   │       ├── cart/items/route.ts  # POST/DELETE (identity from the body)
│   │       ├── checkout/route.ts    # POST order  (identity from the body)
│   │       └── orders/route.ts      # GET  orders (identity from a cookie)
│   ├── components/              # shadcn/ui components + header
│   ├── lib/
│   │   ├── session.ts           # signed session cookie (done right)
│   │   ├── api.ts               # requireSession() — authentication only
│   │   ├── shop.ts              # queries (cart · checkout · orders)
│   │   └── password.ts          # password hashing
│   ├── db/
│   │   ├── schema.ts            # Drizzle schema (users, products, carts, orders)
│   │   ├── client.ts            # Postgres connection
│   │   ├── migrate.ts           # applies migrations on startup
│   │   └── seed.ts              # seeds 3 shoppers (flag on the victim's order)
│   └── config.ts                # env-backed configuration
├── drizzle/                     # generated SQL migrations
├── tests/                       # route-handler tests (vitest)
├── GUIDE.md                     # non-spoiler learning guide
├── SOLUTION.md                  # exploit writeup + the fix (spoilers)
├── SECURITY.md                  # security policy (it's a lab — read before reporting)
├── .github/workflows/           # integration · delivery · security · release
├── Dockerfile                   # hardened multi-stage image (node:26-slim, standalone)
├── docker-compose.yml           # postgres + cartora + traefik stack
├── docker-entrypoint.sh         # migrates + seeds, then starts the app
└── .env.example                 # DB creds, session secret, Traefik ACME
```

The flag is **not** in the repo: the `Dockerfile` bakes it in via a build arg
and the seed writes it into the victim's order.

<br>

## 🚀 The Lab

The lab ships as a Docker Compose stack with three services:

- **`postgres`** — Postgres 16. The app waits until it is *healthy* before migrating.
- **`cartora`** — the shop UI + API, published on port `3000`.
- **`traefik`** — an optional reverse proxy for HTTPS on a real hostname.

Because the stack attaches to an **external** Docker network (`iv0ks-dev`),
create it once before the first run:

```bash
docker network create iv0ks-dev
```

<br>

#### Option A — app + database (quickest)

Copy the example environment file, then build and start the database and the app
(Compose skips `traefik` when you name services explicitly):

```bash
cp .env.example .env
docker compose up -d --build postgres cartora
```

The entrypoint migrates the schema and seeds the data automatically, so the app
is ready at:

- **<http://localhost:3000>**

Sign in with the seeded demo account **`alice` / `password123`**. That is all
you need to start playing with Burp Suite.

<br>

#### Option B — full stack with Traefik (HTTPS + hostname)

Bring up everything to also expose the app through Traefik with TLS:

```bash
docker compose up -d --build
```

Now the _same_ app is reachable two ways at once:

- **<http://localhost:3000>** — direct, no TLS (handy for quick testing).
- **<https://cartora.iv0ks.dev>** — proxied by Traefik with a real certificate.

Traefik routing is defined in `tools/traefik/`. TLS uses the ACME DNS-01
challenge via Namecheap, so Traefik needs those API credentials — fill them in
`.env` (it is gitignored). The dashboard is at `https://traefik.iv0ks.dev`.

<br>

> [!CAUTION]
> The `cartora.iv0ks.dev` hostname must resolve to the host running the stack.
> For purely local experiments, Option A (localhost) is simpler and needs no
> DNS or certificates.

<br>

## 🎯 The Challenge

### The Scenario

cartora is a small online shop for homeware and stationery. Every shopper has a
**cart** and an **order history**. You sign in as **alice**, and the shop lists
*your* cart and *your* orders. A legitimate shopper only ever sees their own.
The login is real — your session is cryptographically signed — so surely the
shop knows exactly who you are. You're going to find out whether it actually
*uses* that.

### Your objective

Reach the **order of another shopper** — specifically, the gift order of *bob* —
and capture the flag hidden in its delivery instructions. You'll also want to
prove you can **act on his behalf**: change his cart, even place an order for him.

> [!NOTE]
> The flag has the format `FLAG{...}`.

### The rules

Everything happens over HTTP against the running app — no need to read the
source to win (though you can). The flag is **not** in the repo: it lives in
another shopper's order in the database, reachable only by breaking access
control on the running app. There are no ids in the URLs to tamper with — so
look at **everything else** your browser sends with each request.

> [!TIP]
> For the full method, the **[Learning Guide](GUIDE.md)** walks you through it.

<br>

## ⚖️ Legal / ethics

This is an **educational, deliberately vulnerable** lab. Run it only locally, on
owned, isolated infrastructure (Docker). Never deploy it publicly, and never use
these techniques against systems without explicit written authorization.
