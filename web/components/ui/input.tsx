import * as React from 'react';
import { cn } from '@/lib/utils';

export const Campo = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} {...props}
      className={cn(
        'h-11 w-full rounded-xl border border-borda bg-white px-4 text-sm text-grafite-900',
        'placeholder:text-grafite-400 transition-colors',
        'focus:border-marca focus:outline-none focus:ring-2 focus:ring-marca/25',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className)} />
  ),
);
Campo.displayName = 'Campo';

export const Selecao = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} {...props}
      className={cn(
        'h-11 w-full appearance-none rounded-xl border border-borda bg-white px-4 pr-9 text-sm',
        'text-grafite-900 transition-colors bg-[length:16px] bg-no-repeat',
        '[background-position:right_.75rem_center]',
        "bg-[url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%23625E6E' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
        'focus:border-marca focus:outline-none focus:ring-2 focus:ring-marca/25',
        className)} />
  ),
);
Selecao.displayName = 'Selecao';

export const Rotulo = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn('text-[13px] font-semibold text-grafite-700', className)} {...props} />
);
