# cartora: Learning Guide

![CWE-639](https://img.shields.io/badge/CWE--639-IDOR-red?style=flat-square)
![Next.js](https://img.shields.io/badge/Node-Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Lab-Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

**cartora is an intentionally vulnerable application built for security education.** It contains a deliberate [IDOR / broken access control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
(CWE-639) flaw so you can practice finding and exploiting it in a safe and controlled environment.

<br>

> [!TIP]
> A guided, **non-spoiler** path to solving this lab. It teaches the *method*, not the answer — the exact winning request and the flag stay in [SOLUTION.md](SOLUTION.md).

<br>

## 🧬 What broken access control is

Here is the whole idea in one sentence:

> **Broken access control happens when an app checks _who you are_ but forgets
> to check _whether you're allowed to touch this particular thing_.**

Logging in answers "who are you?" — that's **authentication**. Deciding whether
*this* user may read or change *this* cart is a separate question — that's
**authorization**. This lab is an **IDOR** (Insecure Direct Object Reference):
the app lets a client-supplied value decide which object it acts on, never
asking whether that object belongs to the caller.

The twist here is **where that value lives**. In the earlier labs the object
reference was in the URL (`/api/invoices/4`), and you tampered with it. In
cartora there is **nothing in the URL at all**: `/api/cart` and `/api/orders`
look perfectly innocent. The reference to "whose data" travels somewhere less
obvious — in a **cookie** and in the **request body**. The app signs you in
properly, and then asks *you* to tell it who you are.

Think of a hotel that checks your passport at the front desk and hands you a
key card — then lets you write the room number on a slip of paper every time
you want to open a door. The receptionist did their job; the doors just believe
the slip.

> Want the deeper background — horizontal vs vertical escalation, why id format
> is never the control, and the full workflow with **Burp Suite** and **OWASP
> ZAP**? Read the shared
> **[Broken Access Control field guide](https://github.com/iv0ks/appsec-labs/blob/main/docs/broken-access-control.md)**.
> This lab is a hands-on application of it.

<br>

## 🎓 What this level teaches

**Level 7 — client-controlled identity: the app trusts who the *client* says it is.**
The endpoints that work on your cart and your orders never look at who the
signed session says you are. They take the shopper's identity from values the
client sends — and the client can send anything.

- **Entry points:**
  - `GET /api/cart` and `GET /api/orders` — read a shopper's cart and orders.
  - `POST /api/cart/items` and `DELETE /api/cart/items` — change a cart.
  - `POST /api/checkout` — place an order.
- **The broken defence:** "you must be logged in, and the browser always sends
  your own id" — the app trusts the id that comes back.
- **What you can see legitimately:** your own cart and orders, through the UI.
- **The target:** another shopper's data. There is no URL to edit; you have to
  work out **which part of your own requests names "you"**, and change it.

## 🪧 How to approach it

1. Sign in as `alice` through your proxy. Browse the shop, add something to the
   cart, open your orders. Keep **Proxy > HTTP history** open.
2. Pick the request that loads your orders. There is no id in the path. Read the
   whole request instead: the **cookies** it carries, and — for the requests that
   *change* something — the **JSON body**.
3. Look at your cookies one by one. Which one is HttpOnly? Which one can be read
   by the page's JavaScript? What does each one appear to contain?
4. Now look at the requests that modify data (adding to the cart, checking out).
   Is there a field in the body that says *whose* cart this is?
5. Send one of those requests to **Repeater** and change the value that
   identifies you to someone else's. Compare the response with your baseline.
   Whose data is it now? Did the server object?
6. Find the shopper whose purchase was meant as a gift, and read what they left
   for the courier. Then ask yourself which of the *writing* endpoints you can
   abuse the same way.

## 🕵️♂️ Going further

Once you realise the server believes whatever the client says about identity,
every shopper is reachable: read anyone's history, fill anyone's cart, even place
an order that is billed to someone else. Notice also that the **signed session
is genuinely secure** — you cannot forge it, and one endpoint trusts it
correctly. The flaw is not in the login; it is in the handlers that authenticate
you and then ignore the result. Try to find the one endpoint that does it right,
and compare it with the ones that don't.

Be careful with the write endpoints on shared lab data: an order placed in
someone else's name is irreversible until you re-seed the stack.

## 🤔 Why it matters

"Never trust the client" is the oldest rule in web security, and still the most
broken one. Real applications leak this way when a front-end convenience (a
`userId` cookie so the page can show your name, a hidden form field, a `userId`
in the request body "because the form already has it") quietly becomes the
thing the back end authorizes with. It survives code review because it works
perfectly for honest users — the browser always sends *their own* id. Testing for
it means asking, for every request, **"where does the server learn who I am?"**
and trying to change the answer.

---

When you have captured the flag (or want to check the fix and the *why* behind
it), continue to **[SOLVE → SOLUTION.md](SOLUTION.md)**.

<br>

> **Legal / ethics.** This is an educational, deliberately vulnerable lab. Run it
> only locally, on owned, isolated infrastructure, and never use these techniques
> against systems without explicit written authorization.
