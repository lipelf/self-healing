'use client';
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const variantes = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold ' +
  'transition-all duration-150 active:scale-[.97] disabled:pointer-events-none disabled:opacity-50 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca focus-visible:ring-offset-2',
  {
    variants: {
      variante: {
        primaria: 'bg-marca text-white shadow-marca hover:bg-marca-600',
        secundaria: 'bg-white text-grafite-800 border border-borda hover:border-grafite-300 hover:bg-grafite-50',
        fantasma: 'text-grafite-600 hover:bg-grafite-100 hover:text-grafite-900',
        perigo: 'text-erro hover:bg-red-50',
        contorno: 'border-2 border-marca text-marca hover:bg-marca-50',
      },
      tamanho: {
        sm: 'h-9 px-3.5 text-[13px]',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-7 text-[15px]',
        icone: 'h-10 w-10 p-0',
      },
      bloco: { true: 'w-full', false: '' },
    },
    defaultVariants: { variante: 'primaria', tamanho: 'md', bloco: false },
  },
);

export interface BotaoProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variantes> {
  asChild?: boolean;
}

export const Botao = React.forwardRef<HTMLButtonElement, BotaoProps>(
  ({ className, variante, tamanho, bloco, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(variantes({ variante, tamanho, bloco }), className)}
            ref={ref} {...props} />
    );
  },
);
Botao.displayName = 'Botao';
export { variantes as variantesBotao };
