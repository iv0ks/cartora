'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogIn, LogOut, Receipt, ShoppingCart, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/client';
import { cn } from '@/lib/utils';

type Me = { user: { id: number; username: string; displayName: string } };

const nav = [
  { href: '/', label: 'Shop', icon: Store },
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
  { href: '/orders', label: 'Orders', icon: Receipt },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api<Me>('/api/me').then((res) => {
      if (live) setName(res.ok ? res.data.user.displayName : null);
    });
    return () => {
      live = false;
    };
  }, [pathname]);

  async function logout() {
    await api('/api/logout', { method: 'POST' });
    setName(null);
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-10 border-b-2 border-border bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-display text-2xl font-bold">
          <span className="grid size-9 place-items-center rounded-md border-2 border-border bg-secondary text-secondary-foreground shadow-[2px_2px_0_0_var(--border)]">
            <ShoppingCart className="size-5" />
          </span>
          cartora
        </Link>
        <nav className="flex gap-1" aria-label="Main">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-white/10',
                pathname === href && 'bg-white/15',
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {name ? (
            <>
              <span>
                Signed in as <strong>{name}</strong>
              </span>
              <Button variant="secondary" size="sm" onClick={logout}>
                <LogOut /> Sign out
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="sm" asChild>
              <Link href="/login">
                <LogIn /> Sign in
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
