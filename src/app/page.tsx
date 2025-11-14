"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const personas = [
  {
    title: 'Produtores',
    description:
      'Restaurantes, cafés, escolas, universidades, indivíduos e mercados liberam espaço na cozinha ao enviar resíduos limpos e ganham o selo de destino correto.',
    href: '/cadastro',
    cta: 'Cadastrar produtor',
  },
  {
    title: 'Receptores',
    description:
      'Composteiras urbanas e pequenos produtores definem capacidade diária, resíduos aceitos e janelas de recebimento.',
    href: '/cadastro',
    cta: 'Cadastrar receptor',
  },
];

const steps = [
  'Cadastre-se com dados básicos.',
  'Combine horários para levar ou receber resíduos frescos.',
  'Confirme cada entrega e acompanhe o impacto positivo.',
];

export default function Home() {
  const [sealCode, setSealCode] = useState('');
  const router = useRouter();

  const handleValidateSeal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = sealCode.trim();
    if (!code) return;
    router.push(`/selo/${code}`);
  };
  return (
    <main className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[color-mix(in_srgb,var(--border) 80%,black 20%)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
          <Link href="/" className="text-sm font-semibold uppercase tracking-[0.4em] text-[var(--accent)]">
            MeuHúmus
          </Link>
          <nav className="flex items-center gap-3 text-sm font-semibold text-[var(--muted)]">
            <Link
              href="/login"
              className="rounded-full border border-[var(--border)] px-4 py-2 text-[var(--muted)] transition-colors duration-150 hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent) 20%,transparent)] hover:text-[var(--color-trufa)]"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="rounded-full border border-[var(--border)] px-4 py-2 text-[var(--accent)] transition-colors duration-150 hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent) 20%,transparent)] hover:text-[var(--color-trufa)] hover:shadow-lg hover:shadow-[rgba(0,0,0,0.25)]"
            >
              Cadastro
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-5 py-12 sm:px-8 sm:py-16">
        <section className="grid gap-8 sm:grid-cols-[1.1fr_1fr] sm:items-center">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--accent)]">Marketplace de resíduos orgânicos</p>
            <h1 className="text-3xl font-semibold sm:text-4xl md:text-5xl">
              Dê um destino inteligente aos restos orgânicos da cidade
            </h1>
            <p className="text-sm text-[var(--muted)] sm:text-base">
              Produtores de resíduos orgânicos evitam o lixo caro e conquistam clientes com ações reais. Receptores recebem matéria-prima limpa para criar
              compostos e adubos em pequena escala. Tudo começa com um cadastro simples e combinações diretas.
            </p>
            <div className="flex flex-col gap-3 text-sm sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--accent) 85%,white 15%)] px-5 py-3 font-semibold text-[var(--color-trufa)] transition-transform duration-150 hover:scale-[1.01] hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent) 25%,transparent)] hover:text-[var(--color-trufa)]"
              >
                Já faço parte
              </Link>
              <Link
                href="/cadastro"
                className="inline-flex items-center justify-center rounded-full border border-[var(--border)] px-5 py-3 font-semibold text-[var(--muted)] transition-colors duration-150 hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent) 20%,transparent)] hover:text-[var(--color-trufa)]"
              >
                Quero fazer parte!
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface) 94%,black 6%)] p-6 text-sm text-[var(--muted)] shadow-2xl shadow-black/25">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Como funciona</h2>
            <ul className="mt-4 space-y-3">
              {steps.map((step, index) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-[var(--color-trufa)]">
                    {index + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {personas.map((persona) => (
            <article
              key={persona.title}
              className="space-y-4 rounded-3xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface) 94%,black 6%)] px-6 py-6 text-sm text-[var(--muted)] shadow-inner shadow-black/20"
            >
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">Para {persona.title.toLowerCase()}</p>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">{persona.title}</h3>
                <p>{persona.description}</p>
              </div>
              <Link
                href={persona.href}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] transition-colors duration-150 hover:text-[var(--color-trufa)]"
              >
                {persona.cta}
              </Link>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-[color-mix(in_srgb,var(--border) 78%,black 22%)] bg-[color-mix(in_srgb,var(--surface) 92%,black 8%)] px-6 py-8 text-sm text-[var(--muted)] shadow-inner shadow-black/25 sm:px-10 sm:py-10">
          <div className="space-y-6 sm:grid sm:grid-cols-3 sm:gap-6">
            <article className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">Menos lixo, mais economia</p>
              <p className="text-sm leading-relaxed">
                Comercios que compostam reduzem custos com coleta tradicional e mostram compromisso real com clientes que valorizam o meio ambiente.
              </p>
            </article>
            <article className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">Composteiras com insumo garantido</p>
              <p className="text-sm leading-relaxed">
                Pequenas operações conquistam matéria-prima constante e de qualidade, gerando adubos locais e fortalecendo hortas urbanas.
              </p>
            </article>
            <article className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">Comunidade conectada</p>
              <p className="text-sm leading-relaxed">
                Restaurantes e recebedores trocam experiências, fortalecem a economia do bairro e provam que sustentabilidade cabe na rotina.
              </p>
            </article>
          </div>
        </section>
      </div>

      <footer className="border-t border-[color-mix(in_srgb,var(--border) 80%,black 20%)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-6 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>MeuHúmus</p>
          <form onSubmit={handleValidateSeal} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Código do selo"
              value={sealCode}
              onChange={(e) => setSealCode(e.target.value)}
              className="rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-[var(--color-creme)] focus:border-[var(--accent)] focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-full bg-[var(--accent)] px-4 py-1.5 font-semibold text-[var(--color-trufa)] hover:opacity-90"
            >
              Validar
            </button>
          </form>
        </div>
      </footer>
    </main>
  );
}
