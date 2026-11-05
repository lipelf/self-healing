import * as React from 'react';
import { cn } from '@/lib/utils';

export const Cartao = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-2xl border border-borda bg-white shadow-suave', className)} {...props} />
  ),
);
Cartao.displayName = 'Cartao';

export const CartaoTopo = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1 p-6 pb-3', className)} {...props} />
);

export const CartaoTitulo = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('font-titulo text-base font-bold tracking-tight text-grafite-900', className)} {...props} />
);

export const CartaoDescricao = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm text-grafite-500', className)} {...props} />
);

export const CartaoCorpo = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-6 pt-0', className)} {...props} />
);

export const CartaoRodape = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center gap-3 p-6 pt-0', className)} {...props} />
);
