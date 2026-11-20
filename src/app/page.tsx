'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { ProductArt } from '@/components/product-art';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { api, getUid } from '@/lib/client';
import { formatPrice } from '@/lib/utils';

type Product = {
  id: number;
  name: string;
  description: string;
  priceCents: number;
  category: string;
  art: string;
};

export default function ShopPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [added, setAdded] = useState<number | null>(null);

  useEffect(() => {
    api<{ products: Product[] }>('/api/products').then((res) => {
      if (res.ok) setProducts(res.data.products);
    });
  }, []);

  async function addToCart(productId: number) {
    // The UI sends the shopper id it read from its own cookie.
    const res = await api('/api/cart/items', {
      method: 'POST',
      body: JSON.stringify({ userId: getUid(), productId, quantity: 1 }),
    });
    if (res.status === 401) return router.push('/login');
    if (res.ok) {
      setAdded(productId);
      setTimeout(() => setAdded((current) => (current === productId ? null : current)), 1500);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-lg border-2 border-border bg-secondary p-8 shadow-stall">
        <Badge variant="outline">Autumn market</Badge>
        <h1 className="mt-3 max-w-xl text-4xl font-bold sm:text-5xl">
          Small-batch goods, straight to your door.
        </h1>
        <p className="mt-3 max-w-lg text-lg">
          Hand-picked homeware, stationery and plants from makers we actually know. Free delivery
          over €50.
        </p>
      </section>

      <section aria-labelledby="catalogue" className="space-y-4">
        <h2 id="catalogue" className="text-2xl font-bold">
          The catalogue
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <Card key={p.id}>
              <ProductArt name={p.art} />
              <CardHeader>
                <Badge variant="outline">{p.category}</Badge>
                <CardTitle>{p.name}</CardTitle>
                <CardDescription>{p.description}</CardDescription>
              </CardHeader>
              <CardContent />
              <CardFooter className="justify-between">
                <span className="font-display text-xl font-bold">{formatPrice(p.priceCents)}</span>
                <Button
                  variant={added === p.id ? 'secondary' : 'accent'}
                  size="sm"
                  onClick={() => addToCart(p.id)}
                >
                  {added === p.id ? <Check /> : <Plus />}
                  {added === p.id ? 'Added' : 'Add'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
