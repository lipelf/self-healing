import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const variantes = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide',
  {
    variants: {
      variante: {
        marca: 'bg-marca-50 text-marca-700',
        sucesso: 'bg-emerald-50 text-sucesso',
        alerta: 'bg-amber-50 text-alerta',
        neutra: 'bg-grafite-100 text-grafite-600',
      },
    },
    defaultVariants: { variante: 'neutra' },
  },
);

export interface SeloProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof variantes> {}

export const Selo = ({ className, variante, ...props }: SeloProps) => (
  <span className={cn(variantes({ variante }), className)} {...props} />
);
