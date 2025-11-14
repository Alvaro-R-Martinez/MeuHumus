# Projeto Estrutura Detalhada — MeuHumus

## 1. Resumo Executivo
- **Objetivo:** Definir padrões técnicos, convenções e exemplos mínimos para orientar a implementação do projeto MeuHumus.
- **Público-alvo:** Equipe de desenvolvimento (front-end, back-end/serverless), líderes técnicos e responsáveis por DevOps/CI.

## 2. Decisões Arquiteturais
### 2.1 Renderização (SSR, SSG, ISR)
- **SSR (Server-Side Rendering):** Usar para telas personalizadas por usuário autenticado (ex.: dashboard de receptores) garantindo dados atualizados e proteção por sessão.
- **SSG (Static Site Generation):** Indicada para páginas públicas com conteúdo estático ou raramente alterado (ex.: página institucional com benefícios do selo sustentável).
- **ISR (Incremental Static Regeneration):** Aplicar a páginas públicas que consumam dados de Firestore com baixa cadência de atualização (ex.: vitrine de compostadores). Configurar `revalidate` conforme SLA de frescor desejado (p.ex. 10 minutos).
- **Streaming + Suspense:** Para SSR com grandes payloads (ex.: relatórios), usar streaming para enviar shells rápidos e componentes carregados incrementalmente.

### 2.2 Server Components vs Client Components
- **Server Components (default):** Para páginas que apenas exibem dados obtidos no servidor (ex.: listagens gerais) ou que dependem de dados sensíveis, reduzindo bundle e expondo menos lógica ao cliente.
- **Client Components:** Quando houver interação com estado local, hooks do browser (ex.: geolocalização) ou integrações com APIs do navegador (PWA, uploads) exigindo `use client`.
- **Limites claros:** Encapsular componentes client em boundaries específicos (`<Suspense>`) para evitar promover árvores inteiras a client-side.
- **Metadata API:** Usar `export const metadata` por rota para títulos/SEO dinâmicos sem carregar dados no cliente.

### 2.3 Route Handlers & Server Actions
- **Route Handlers (`src/app/api/.../route.ts`):** Centralizar integrações externas (Cloudinary, webhooks do Firebase Auth) e lógica que precise de HTTP handlers dedicados.
- **Server Actions:** Úteis para mutações simples, vinculadas a formulários ou interações que dispensam uma rota dedicada. Devem encapsular validações de entrada e usar `Zod` (ou similar) antes de chamar Firestore.
- **Combinação:** Para flows autenticados intensivos (ex.: registrar entrega), preferir Server Actions acionando services. Para uploads/integrações, usar Route Handlers com autenticação tokenizada.
- **Observabilidade:** Logar entradas/saídas críticas via `server-only` helpers e ativar tracing de performance do Next.js em ações que consultam Firestore.

### 2.4 Dados e Estado
- **Firestore:** Fonte única de verdade para entidades do marketplace (produtores, receptores, entregas, streaks).
- **Cache:** Next.js `fetch` com opções `cache`, `revalidate` alinhadas com os modos SSR/ISR. `React Query` ou `SWR` opcionais somente para dados altamente interativos no cliente.
- **Sessão:** Session cookies assinados via Firebase Auth + Next.js Middleware para proteger rotas.

## 3. Requisitos Não Funcionais
- **PWA:** Manifest válido, service worker com cache "offline-first" para shell, tratamento de fallback em modo offline.
- **Performance:** Core Web Vitals monitorados; lazy loading de componentes pesados, compressão em Vercel automática.
- **Offline-first:** Cache para assets estáticos, fallback para dados críticos (últimas entregas confirmadas) em IndexedDB opcional. Definir estratégia por recurso (cache-first para assets, network-first para dados dinâmicos, stale-while-revalidate para listagens).
- **Segurança:** Não expor chaves; validação server-side; rate limiting em route handlers sensíveis; regras Firestore restritivas; uso de HTTPS/TLS.
- **Privacidade:** Guardar apenas dados necessários; aplicar políticas de retenção para dados de entregas; LGPD: consentimento para uso de dados pessoais e opção de exclusão.
- **Observabilidade:** Configurar logs estruturados e monitoramento (Sentry/LogRocket) para mapear erros client/server antes de releases estáveis.

## 4. Estrutura de Pastas Sugerida
```text
src/
  app/
    (routes...)
    api/
      auth/
      uploads/
  components/
    ui/
    domain/
  lib/
    firebase/
    cloudinary/
    validators/
  services/
    auth/
    firestore/
    uploads/
  server/
    actions/
    middleware/
  hooks/
  styles/
  utils/
public/
  manifest.json
  icons/
scripts/
  ci/
  vercel/
config/
  lint/
  testing/
```
- **`src/app`**: Rotas App Router, separando pastas com parênteses para agrupamentos lógicos e segmentos protegidos/publicos.
- **`src/app/api`**: Route handlers (REST) para integrações externas.
- **`src/components/ui`**: Componentes agnósticos (design system simplificado).
- **`src/components/domain`**: Componentes ligados ao domínio (cards de entrega, tabelas).
- **`src/lib/firebase|cloudinary|validators`**: Configurações e helpers cross-cutting.
- **`src/services/auth|firestore`**: Camadas de serviço para encapsular chamadas a SDKs no server/client.
- **`src/services/uploads`**: Orquestração de upload e interfaces com Cloudinary.
- **`src/server/actions|middleware`**: Server Actions declarativas e middlewares server-side.
- **`src/hooks`**: Hooks React de reuso (prefira nomear `useSomething`).
- **`src/styles`**: CSS Modules, Tailwind config ou tokens.
- **`src/utils`**: Funções puras e helpers sem dependências externas.
- **`public/manifest.json`**: Manifest PWA e ícones.
- **`scripts/ci|vercel`**: Scripts auxiliares (lint, seeding, vercel env sync).
- **`config/`**: Configurações compartilhadas de lint/test/format.

## 5. Convenções de Código e Nomenclatura
- **TypeScript:** `strict` ativo; proibir `any` implícito; usar `satisfies` para literais; preferir tipos `type` a `interface` para formas simples.
- **Naming:** Pastas e arquivos em `kebab-case` (exceto componentes React em `PascalCase.tsx`). Hooks sempre `useXYZ.ts`. Server Actions `actionName.action.ts`.
- **Lint/Format:** ESLint + Prettier integrados; usar `@typescript-eslint` + regras recomendadas Next.js. Automatizar com `lint-staged` e pre-commit.
- **Imports:** Absolutos via `@/` (configurar `tsconfig.paths`). Ordenar: libs externas, internos (`@/src/...`), relativos. Habilitar `eslint-plugin-import` para enforcing consistente.
- **Hooks & Serviços:** Colocar lógica de dados (Firestore/Auth) em `services/` e login no server preferindo wrappers puros. Hooks apenas conectam UI a services.
- **Estilos:** Se usar Tailwind, centralizar config em `tailwind.config.ts`. Evitar CSS global a menos que necessário.
- **Dynamic Imports:** Usar `next/dynamic` para componentes volumosos (mapas, charts) com `loading` customizado para evitar layout shift.

## 6. Exemplos de Arquivos
### 6.1 Firebase Config (Server & Client Safe)
```ts
// src/lib/firebase/admin.ts
import { getApps, initializeApp, cert } from 'firebase-admin/app';

const app = getApps()[0] ?? initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS ?? '{}')),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

export const firebaseAdminApp = app;
```
```ts
// src/lib/firebase/client.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

export const getFirebaseClient = (): FirebaseApp => {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  return getApps()[0]!;
};
```

### 6.2 Fluxo de Autenticação (Server-Side Session)
```ts
// src/services/auth/session.ts
import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';

const SESSION_COOKIE = 'mh_session';

export const createSession = async (idToken: string) => {
  const expiresIn = 1000 * 60 * 60 * 24; // 24h
  const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn });
  cookies().set(SESSION_COOKIE, sessionCookie, { httpOnly: true, secure: true, sameSite: 'lax' });
};

export const verifySession = async () => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return await getAuth().verifySessionCookie(token, true);
  } catch {
    cookies().delete(SESSION_COOKIE);
    return null;
  }
};
```

### 6.3 Route Handler (Cloudinary Upload Assinado) + Cliente
```ts
// src/app/api/uploads/route.ts
import { NextResponse } from 'next/server';
import { verifySession } from '@/services/auth/session';
import { v2 as cloudinary } from 'cloudinary';

export async function POST() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request({ timestamp, folder: 'meuhumus' }, process.env.CLOUDINARY_SECRET!);

  return NextResponse.json({
    uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    params: { timestamp, folder: 'meuhumus', api_key: process.env.CLOUDINARY_KEY, signature },
  });
}
```
```ts
// src/services/uploads/client.ts
export const uploadImage = async (file: File) => {
  const { uploadUrl, params } = await fetch('/api/uploads', { method: 'POST' }).then((res) => res.json());
  const body = new FormData();
  Object.entries(params).forEach(([key, value]) => body.append(key, String(value)));
  body.append('file', file);

  return fetch(uploadUrl, { method: 'POST', body });
};
```

### 6.4 Regras Básicas do Firestore
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId &&
        request.resource.data.email == request.auth.token.email;
    }

    match /deliveries/{deliveryId} {
      allow read: if true;
      allow create: if request.auth != null && request.resource.data.receiverId == request.auth.uid &&
        request.resource.data.status in ['pending', 'validated'];
      allow update: if request.auth != null && request.auth.uid == resource.data.receiverId &&
        request.resource.data.updatedAt > resource.data.updatedAt;
    }
  }
}
```

### 6.5 Manifest & Service Worker (PWA)
```json
// public/manifest.json
{
  "name": "MeuHumus",
  "short_name": "Humus",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#22c55e",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```
```ts
// public/sw.js
const SHELL_CACHE = 'meuhumus-shell-v2';
const DYNAMIC_CACHE = 'meuhumus-dynamic-v1';
const SHELL_ASSETS = ['/', '/manifest.json', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => ![SHELL_CACHE, DYNAMIC_CACHE].includes(key)).map((key) => caches.delete(key)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) =>
      cached ||
      fetch(request)
        .then((response) => {
          if (response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached)
    )
  );
});
```

### 6.6 Metadata & Dynamic Import (Next.js App Router)
```ts
// src/app/(dashboard)/layout.tsx
import dynamic from 'next/dynamic';

export const metadata = {
  title: 'Painel | MeuHumus',
  description: 'Gerencie entregas, streaks e recompensas.',
};

const MetricsPanel = dynamic(() => import('@/components/domain/metrics-panel'), {
  loading: () => <p>Carregando métricas...</p>,
  ssr: false,
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="grid gap-6">
      <MetricsPanel />
      {children}
    </section>
  );
}
```

## 7. Checklist de Segurança
- [ ] Variáveis sensíveis (`Firebase`, `Cloudinary`, `NextAuth` ou equivalente) somente em variáveis de ambiente.
- [ ] Server Actions e route handlers validam entradas com schema.
- [ ] Regras Firestore restringem leitura/escrita por usuário.
- [ ] Cookies de sessão `httpOnly`, `secure`, `sameSite` adequados.
- [ ] Política de CORS configurada apenas para domínios confiáveis.
- [ ] Rate limiting aplicado em endpoints de upload e login.
- [ ] Logs sanitizados (sem dados PII completos).
- [ ] Service worker realiza versionamento de cache e limpeza de versões antigas.
- [ ] Dados sensíveis não são armazenados em cache e sempre passam por HTTPS.
- [ ] Monitoramento ativo (Sentry/LogRocket) com scrubbing de dados pessoais.

## 8. Testes & CI
- **Testes Unitários:** `vitest` ou `jest` para services (auth, firestore), utilitários e hooks puros.
- **Testes de Integração:** `@testing-library/react` para componentes críticos; rotas API com `supertest` em ambiente simulado.
- **e2e (opcional):** `Playwright` para fluxos principais (login, cadastro de entrega).
- **CI (GitHub Actions):** Workflow com etapas `install`, `lint`, `test`, `build`. Bloqueia merge se falhar. Configurar cache de `pnpm` ou `yarn`.
- **Vercel Preview:** Integração automática com PRs; validar Core Web Vitals nos previews.
- **Auditoria PWA:** Adicionar etapa Lighthouse CI para garantir performance, acessibilidade e PWA badges em cada PR.
- **Smoke Tests:** Scripts de health-check rodando após deploy (Vercel) para garantir disponibilidade de APIs críticas.

## 9. Deploy & Comandos Locais
- **Pré-requisitos:** Node LTS (>=18), gerenciador PNPM ou Yarn, conta Firebase + Cloudinary.
- **Comandos:**
  - `pnpm install` — instala dependências.
  - `pnpm dev` — roda Next.js localmente com service worker em modo dev.
  - `pnpm lint` / `pnpm test` — garantias de qualidade.
  - `pnpm build` — build de produção antes do deploy.
- **Variáveis de Ambiente (exemplos):**
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `FIREBASE_ADMIN_CREDENTIALS` (JSON stringificado).
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_KEY`, `CLOUDINARY_SECRET`.
  - `NEXT_PUBLIC_APP_URL` (para PWA start_url).
- **Deploy na Vercel:**
  1. Conectar repo (GitHub/GitLab/Bitbucket).
  2. Definir variáveis de ambiente no dashboard Vercel (incluindo as secretas).
  3. Habilitar `Serverless Functions` (default) e checar logs de Edge Functions se aplicável.
  4. Registrar service worker em `_app` ou layout raiz com `useEffect` apenas em client e validar atualização de SW após cada release.
  5. Configurar Vercel Analytics e monitoramento de erros (ex.: Sentry) para ambientes Preview/Production.

## 10. Critérios de Aceitação
- Documento inclui árvore de pastas comentada.
- Contém pelo menos cinco snippets técnicos exemplificativos.
- Define políticas de segurança e checklist.
- Lista requisitos PWA, performance e offline.
- Aborda testes/CI e fluxo de deploy.
- Referências e próximos passos claros para desenvolvedores.
- Contém orientações específicas sobre streaming, metadata e caching estratégico.
- Documenta versionamento de caches, auditoria Lighthouse e monitoramento contínuo.

## 11. Referências para Leitura
- [Next.js App Router Docs](https://nextjs.org/docs/app) — validar versão estável antes de aplicar.
- [Firebase Web Docs](https://firebase.google.com/docs) — confirmar SDK compatível com browser e admin.
- [Cloudinary Upload API](https://cloudinary.com/documentation/image_upload_api_reference) — verificar parâmetros atualizados.
- [MDN Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps) — revisar guias de PWA.
- [Vercel Deployment Guides](https://vercel.com/docs/deployments/overview) — checar práticas mais recentes.
- [Next.js Best Practices 2025](https://medium.com/@GoutamSingha/next-js-best-practices-in-2025-build-faster-cleaner-scalable-apps-7efbad2c3820) — validar recomendações com a versão atual do framework.
- [PWA Offline Caching Strategies](https://blog.pixelfreestudio.com/best-practices-for-pwa-offline-caching-strategies/) — verificar técnicas de cache antes de implementar.
