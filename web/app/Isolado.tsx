'use client';
import { NESTED } from './ui';

// Envoltorio que so existe no cenario C4: embrulhar o elemento em um <div>
// faz o texto dos irmaos deixar de identifica-lo, porque neighbor_text le os
// irmaos dentro do mesmo pai. E o que destroi a vizinhanca de verdade.
export default function Isolado({ children, className }:
                                { children: React.ReactNode; className?: string }) {
  if (!NESTED) return <>{children}</>;
  return <div className={className}>{children}</div>;
}
