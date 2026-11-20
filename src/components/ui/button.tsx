import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-md border-2 border-border text-sm font-semibold whitespace-nowrap shadow-stall transition-all outline-none hover:translate-x-px hover:translate-y-px hover:shadow-[3px_3px_0_0_var(--border)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        accent: 'bg-accent text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'bg-card text-foreground',
        ghost: 'border-transparent bg-transparent shadow-none hover:bg-muted hover:shadow-none',
        destructive: 'bg-destructive text-white',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
