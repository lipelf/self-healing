'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessao } from './sessao';

export default function Home() {
  const { sessao, pronto } = useSessao();
  const router = useRouter();

  useEffect(() => {
    if (!pronto) return;
    router.replace(sessao ? '/catalogo' : '/login');
  }, [pronto, sessao, router]);

  return (
    <main className="container py-20" id="redirecionando">
      <div className="esqueleto h-11 w-64" />
      <div className="mt-4 esqueleto h-5 w-96" />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="esqueleto h-64" />)}
      </div>
    </main>
  );
}
