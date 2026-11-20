import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import './globals.css';

export const metadata: Metadata = {
  title: 'cartora — small-batch goods, delivered',
  description: 'An intentionally vulnerable shop for practising IDOR (CWE-639).',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 text-sm text-muted-foreground">
          cartora is an intentionally vulnerable lab — run it locally, never expose it.
        </footer>
      </body>
    </html>
  );
}
