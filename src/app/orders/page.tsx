'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/client';
import { formatPrice } from '@/lib/utils';

type Order = {
  id: number;
  status: string;
  totalCents: number;
  shippingAddress: string;
  notes: string;
  createdAt: string;
  items: { id: number; name: string; unitPriceCents: number; quantity: number }[];
};

const statusVariant = { paid: 'secondary', shipped: 'accent', delivered: 'default' } as const;

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    api<{ orders: Order[] }>('/api/orders').then((res) => {
      if (res.status === 401) router.push('/login');
      else if (res.ok) setOrders(res.data.orders);
    });
  }, [router]);

  if (!orders) return <p className="text-muted-foreground">Loading your orders…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Your orders</h1>
      {orders.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No orders yet</CardTitle>
            <CardDescription>Your purchases will show up here.</CardDescription>
          </CardHeader>
        </Card>
      )}
      {orders.map((order) => (
        <Card key={order.id}>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>Order #{order.id}</CardTitle>
            <div className="flex items-center gap-3">
              <Badge
                variant={statusVariant[order.status as keyof typeof statusVariant] ?? 'outline'}
              >
                {order.status}
              </Badge>
              <span className="font-display text-lg font-bold">
                {formatPrice(order.totalCents)}
              </span>
            </div>
          </CardHeader>
          <ul className="divide-y-2 divide-dashed divide-border/30 text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between py-1.5">
                <span>
                  {item.quantity} × {item.name}
                </span>
                <span>{formatPrice(item.unitPriceCents * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-1 rounded-md border-2 border-dashed border-border/40 bg-muted/50 p-3 text-sm">
            <p className="flex items-center gap-2 font-semibold">
              <Truck className="size-4" /> {order.shippingAddress}
            </p>
            {order.notes && <p className="text-muted-foreground">“{order.notes}”</p>}
          </div>
        </Card>
      ))}
    </div>
  );
}
