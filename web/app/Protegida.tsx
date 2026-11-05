'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessao } from './sessao';

export default function Protegida({ children }: { children: React.ReactNode }) {
  const { sessao, pronto } = useSessao();
  const router = useRouter();

  useEffect(() => {
    if (pronto && !sessao) router.replace('/login');
  }, [pronto, sessao, router]);

  if (!pronto) {
    return (
      <main className="container py-16">
        <div className="esqueleto h-10 w-56" />
        <div className="mt-4 esqueleto h-5 w-80" />
      </main>
    );
  }
  if (!sessao) return null;
  return <>{children}</>;
}
