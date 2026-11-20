import {
  BookOpen,
  Coffee,
  CupSoda,
  Headphones,
  Lamp,
  Package,
  Shirt,
  ShoppingBag,
  Sprout,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const art: Record<string, { icon: LucideIcon; tile: string }> = {
  coffee: { icon: Coffee, tile: 'bg-[#f2b134]' },
  shirt: { icon: Shirt, tile: 'bg-[#e4572e]' },
  lamp: { icon: Lamp, tile: 'bg-[#f0d37a]' },
  book: { icon: BookOpen, tile: 'bg-[#9bc4a5]' },
  bag: { icon: ShoppingBag, tile: 'bg-[#c9b79c]' },
  plant: { icon: Sprout, tile: 'bg-[#7fb069]' },
  headphones: { icon: Headphones, tile: 'bg-[#8fb8de]' },
  mug: { icon: CupSoda, tile: 'bg-[#e8a598]' },
};

export function ProductArt({ name, className }: { name: string; className?: string }) {
  const { icon: Icon, tile } = art[name] ?? { icon: Package, tile: 'bg-muted' };
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex aspect-[4/3] items-center justify-center rounded-md border-2 border-border',
        tile,
        className,
      )}
    >
      <Icon className="size-14 text-foreground" strokeWidth={1.5} />
    </div>
  );
}
