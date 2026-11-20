// GET /api/products — the public catalogue.
import { json } from '@/lib/api';
import { listProducts } from '@/lib/shop';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return json({ products: await listProducts() });
}
