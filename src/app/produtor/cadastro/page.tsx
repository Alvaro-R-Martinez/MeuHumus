'use client';

export default function ProdutorCadastroPage() {
  return (
    <main className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-12 sm:px-8 sm:py-16">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">Cadastro de produtor</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Informações de produtor</h1>
          <p className="max-w-2xl text-sm text-[var(--muted)] sm:text-base">
            Aqui você poderá, em breve, completar o cadastro detalhado como produtor de resíduos orgânicos: endereço,
            volume gerado, horários de coleta e outras informações importantes.
          </p>
        </header>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 px-5 py-6 text-sm text-[var(--muted)] shadow-sm sm:px-6 sm:py-7 sm:text-base">
          <p>
            Esta é uma tela placeholder. O formulário completo de cadastro de produtores será implementado em uma próxima
            etapa do projeto.
          </p>
        </section>
      </div>
    </main>
  );
}
