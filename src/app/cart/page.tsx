'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PackageCheck, Trash2 } from 'lucide-react';
import { ProductArt } from '@/components/product-art';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, getUid } from '@/lib/client';
import { formatPrice } from '@/lib/utils';

type Cart = {
  items: {
    productId: number;
    name: string;
    art: string;
    unitPriceCents: number;
    quantity: number;
  }[];
  totalCents: number;
};

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Cart>('/api/cart').then((res) => {
      if (res.status === 401) router.push('/login');
      else if (res.ok) setCart(res.data);
    });
  }, [router]);

  async function remove(productId: number) {
    const res = await api<Cart>('/api/cart/items', {
      method: 'DELETE',
      body: JSON.stringify({ userId: getUid(), productId }),
    });
    if (res.ok) setCart(res.data);
  }

  async function placeOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    const res = await api<{ order?: { id: number }; error?: string }>('/api/checkout', {
      method: 'POST',
      body: JSON.stringify({
        userId: getUid(),
        shippingAddress: form.get('shippingAddress'),
        notes: form.get('notes'),
      }),
    });
    setBusy(false);
    if (res.ok) router.push('/orders');
    else setMessage(res.data.error ?? 'Something went wrong.');
  }

  if (!cart) return <p className="text-muted-foreground">Loading your cart…</p>;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <section className="space-y-4">
        <h1 className="text-3xl font-bold">Your cart</h1>
        {cart.items.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Nothing here yet</CardTitle>
              <CardDescription>Browse the shop and add something you like.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          cart.items.map((item) => (
            <Card key={item.productId} className="flex-row items-center gap-4">
              <ProductArt name={item.art} className="w-24 shrink-0" />
              <div className="flex-1">
                <p className="font-display text-lg font-bold">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  {item.quantity} × {formatPrice(item.unitPriceCents)}
                </p>
              </div>
              <p className="font-display text-lg font-bold">
                {formatPrice(item.unitPriceCents * item.quantity)}
              </p>
              <Button
                variant="outline"
                size="icon"
                aria-label={`Remove ${item.name}`}
                onClick={() => remove(item.productId)}
              >
                <Trash2 />
              </Button>
            </Card>
          ))
        )}
      </section>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Checkout</CardTitle>
          <CardDescription>
            Total: <strong>{formatPrice(cart.totalCents)}</strong>
          </CardDescription>
        </CardHeader>
        <form onSubmit={placeOrder} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="shippingAddress">Shipping address</Label>
            <Input
              id="shippingAddress"
              name="shippingAddress"
              required
              placeholder="14 Carrer del Rec, Barcelona"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Delivery instructions</Label>
            <Textarea id="notes" name="notes" placeholder="Door code, neighbour, safe place…" />
          </div>
          {message && (
            <p role="alert" className="text-sm font-semibold text-destructive">
              {message}
            </p>
          )}
          <Button
            type="submit"
            variant="accent"
            size="lg"
            disabled={busy || cart.items.length === 0}
          >
            <PackageCheck /> Place order
          </Button>
        </form>
      </Card>
    </div>
  );
}
