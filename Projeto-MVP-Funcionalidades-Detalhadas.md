# Funcionalidades MVP — MeuHumus (PWA Detalhado)

## 1. Onboarding e Acesso
### 1.1 Cadastro Rápido de Produtores
- **Objetivo:** Registrar restaurantes/cafés com dados mínimos para habilitar agendamentos de resíduos.
- **Fluxo:**
  1. Usuário acessa `/cadastro-produtor` (segmento público) e autentica via Firebase antes de avançar.
  2. Formulário `step-by-step` (contato → endereço → disponibilidade → volume médio diário) com salvamento provisório em IndexedDB.
  3. Validação client-side via schema Zod e feedback inline utilizando componentes `ui/FormField`.
  4. Submission invoca Server Action `register-producer.action.ts`, que persiste no Firestore (`producers/{uid}`) e inicializa `dailyCapacityKg`.
- **Campos obrigatórios:** nome fantasia/razão social, CNPJ/CPF, telefone, e-mail operacional, endereço completo (geocodificado), horários de entrega, volume médio diário (kg).
- **Regras:**
  - Formulário só pode ser finalizado se todos os campos estiverem válidos (modo offline mostra aviso e agenda sincronização posterior).
  - Em modo offline, dados ficam em cache local e são reprocessados quando a conexão retorna (sync pelo service worker).
  - Após o cadastro, usuário é redirecionado para dashboard de produtor e onboarding não deve reaparecer.

### 1.2 Cadastro Rápido de Receptores
- **Objetivo:** Coletar capacidade diária e preferências críticas dos compostadores.
- **Fluxo:**
  1. Rota protegida `/cadastro-receptor` disponível apenas para usuários autenticados com flag `isReceiver`.
  2. Etapas: informações básicas → capacidade diária por dia da semana → tipos de resíduos aceitos → janelas de recebimento.
  3. Dados temporários armazenados em IndexedDB e enviados por Server Action `register-receiver.action.ts`.
- **Campos obrigatórios:** nome comercial, endereço de coleta, capacidade diária (kg/dia) com limites individuais por dia da semana, lista de resíduos aceitos, janela inicial/final de recebimento.
- **Regras:**
  - Capacidade diária precisa ser > 0 kg; difere por plano (Grátis vs Pro) com mensagens de upgrade conforme @Projeto-Ideia.md#24-33.
  - Mudanças posteriores devem atualizar `receivers/{uid}` e snapshot em `capacitySnapshots` para auditoria.
  - Ao concluir cadastro, receptor é exibido na busca apenas quando houver capacidade disponível.

### 1.3 Autenticação Firebase (Email/Senha + Link Mágico)
- **Objetivo:** Garantir login seguro, rápido e reutilizável em ambiente PWA.
- **Implementação:**
  - Página `/login` com tabs "Entrar com senha" e "Receber link mágico"; ambos usam `useAuthForm` para estado local.
  - Login senha: chama `Firebase Auth` client → envia `idToken` para Server Action `loginWithPassword.action.ts` → cria cookie `mh_session` (`httpOnly`, `secure`, `sameSite=lax`).
  - Link mágico: route handler `/api/auth/send-link` dispara e-mail; ao invocar link, `oobCode` convertido em token e criado cookie via `createSession` @Projeto-Estrutura-Detalhada.md#121-145.
- **Regras de sessão:**
  - Middleware `auth.ts` protege rotas sob `/app/(protected)` e redireciona usuários não autenticados.
  - Logout remove cookie e revoga tokens no Admin SDK.
  - Service worker registra tentativas offline e reaplica login quando volta conexão.

### 1.4 Instalação como App (PWA)
- **Objetivo:** Incentivar experiência "app-like" e acesso rápido.
- **Implementação:**
  - Componente `pwa-install-banner.tsx` observa evento `beforeinstallprompt` e exibe CTA customizado.
  - Para iOS, fallback com modal explicativo (instruções para adicionar à tela inicial).
  - Estado da instalação persistido em IndexedDB para não reaparecer após aceitação/dispensa.
  - Página `/onboarding` atualizada com passo dedicado à instalação, incluindo vídeo curto e QR code do selo.

## 2. Perfil Essencial & Selo Sustentável
### 2.1 Visão Geral Compacta (Produtor e Receptor)
- **Objetivo:** Exibir, em uma só tela, dados críticos para acompanhamento sem sobrecarregar o bundle client.
- **Elementos:**
  - Streak atual, capacidade restante do dia (receitor), volume agendado e histórico curto; todos renderizados em Server Components.
  - Botões de ação rápidos (novo agendamento, ver QR code, ajustar capacidade) habilitados via `use client` apenas onde necessário.
  - Dados cacheados em revalidate curto (SSR + ISR a cada 5 min) para equilibrar frescor e custo.

### 2.2 QR Code do Selo
- **Objetivo:** Permitir que produtores exibam certificação em pontos físicos e digitais.
- **Implementação:**
  - Página estática `/selo/{producerId}` com route handler que passa dados de streak e total (kg) para componente QR (render server-side).
  - Dados atualizados sempre que streak muda: Server Action aciona `revalidatePath('/selo/...')`.
  - PWA: manifest inclui deep link para página de selo; service worker cacheia última versão para exibição offline.

### 2.3 Atualização Automática do Selo
- **Objetivo:** Garantir marketing em tempo quase real.
- **Fluxo:**
  - Ao validar entrega, Server Action `validate-delivery.action.ts` calcula novo streak e total de resíduos desviados.
  - Função publica evento em `firestore/producer-metrics` e chama `revalidateTag('producer-metrics')`.
  - Clientes (dashboard, page de selo) usam `fetch` tagged com `next: { tags: ['producer-metrics'] }` @Projeto-Estrutura-Detalhada.md#22-25.

## 3. Descoberta & Conexão
### 3.1 Lista Geolocalizada de Receptores
- **Objetivo:** Facilitar encontro entre produtores e receptores com disponibilidade real.
- **Detalhes:**
  - Página `/encontrar-receptor` é Server Component que renderiza lista inicial; mapa (`Leaflet` ou Mapbox) carregado via `next/dynamic` (SSR false) para reduzir bundle.
  - Filtros: raio (slider), tipos de resíduo (checkbox), janela desejada (select), data desejada (date picker).
  - Query Firestore usa índices compostos (localização + capacidade restante). Receptores com capacidade zero para data selecionada são excluídos do resultado.
  - Modo lista fallback (sem mapa) para dispositivos com restrições de GPU ou offline.

### 3.2 Favoritos & Compatibilidade Básica
- **Objetivo:** Permitir relacionamentos preferenciais e alertar sobre incompatibilidades.
- **Implementação:**
  - Botão "Favoritar" salva referência em `producers/{id}/favorites/{receiverId}`.
  - Alerta de compatibilidade: se produção diária > capacidade restante do receptor, exibir badge "Ajuste volume".
  - Dados de favoritos cacheados localmente para acesso offline e sincronizados quando a conexão volta.

## 4. Gestão de Entregas Simplificada
### 4.1 Agendamento com Volume
- **Objetivo:** Formalizar intenção de entrega com clareza de datas e quantidades.
- **Fluxo:**
  1. Produtor seleciona receptor disponível (verificações: capacidade >= volume solicitado, janela compatível).
  2. Formulário (quilos, data/hora, observações, fotos opcionais) salva estado temporário em IndexedDB.
  3. Server Action `schedule-delivery.action.ts` cria documento `deliveries/{id}` com status `agendado`, reservando capacidade daquele dia.
- **Regra de reserva:**
  - O volume é abatido de `receiverCapacity/{receiverId}/{date}`. Caso a operação falhe, rollback remove agendamento.
  - Se volume exceder limite, feedback orienta produtor a ajustar ou escolher outro dia/receptor.

### 4.2 Reserva de Capacidade
- **Objetivo:** Garantir que receptores não recebam mais resíduos que o suportado.
- **Implementação:**
  - Cloud Function/Server Action mantém documento `capacityLedger` com entradas por data.
  - Quando `availableKg` chega a 0, receptor fica invisível em buscas para aquele dia.
  - Ajustes de capacidade feitos pelo receptor atualizam ledger e disparam revalidação dos resultados de busca.

### 4.3 Confirmação do Receptor
- **Objetivo:** Permitir aceitação ou replanejamento em um toque.
- **Fluxo:**
  - Receptor recebe notificação (email + in-app). PWA offline mostra item pendente.
  - Botões: "Aceitar" (status `confirmado`), "Sugerir novo horário" (abre modal com nova hora e mensagem), "Recusar" (exige motivo).
  - Ação responde e atualiza ledger (`capacityLedger` é restaurado se recusar).

### 4.4 Registro de Entrega
- **Objetivo:** Fechar ciclo com dados de qualidade e peso real.
- **Fluxo:**
  - Após entrega, receptor acessa item e preenche checklist (limpeza, segregação, condição).
  - Campo peso real permite ajuste em relação ao agendado; ledger é recalculado (diferença devolvida para disponibilidade futura se menor volume).
  - Possibilidade de anexar nova foto (opcional) e comentários.
  - Ao concluir, Server Action atualiza `deliveries` → `status: validada` ou `rejeitada`, dispara update do streak.

## 5. Fluxo de Qualidade & Streak
### 5.1 Validação do Receptor
- **Objetivo:** Garantir qualidade do resíduo e manter selo confiável.
- **Detalhes:**
  - Botão principal "Validar entrega" abre modal com opções: Aprovar (pode ajustar peso), Reportar divergência (escolher motivo), Adiar análise (mantém pendente).
  - Divergências zeram streak do produtor e registram evento em coleção `qualityReports`.
  - Dados alimentam métricas para selo e alertas de treinamento.

### 5.2 Histórico Essencial
- **Objetivo:** Fornecer visão rápida das entregas passadas mesmo offline.
- **Implementação:**
  - Timeline `deliveriesHistory` com 30 itens recentes, cacheada localmente (IndexedDB) para leitura offline.
  - Cores/ícones indicam status (agendado, pendente, validada, rejeitada) e se há notas de divergência.
  - Carregamento server-side com fallback offline sincronizado pelo service worker.

### 5.3 Indicadores de Confiança
- **Objetivo:** Exibir reputação de maneira simples.
- **Cálculo:**
  - Taxa de entregas corretas = entregas aprovadas / entregas totais (últimos 90 dias).
  - Média de ocupação diária = peso recebido / capacidade disponível (últimos 30 dias). Exibida apenas para receptores.
  - Indicadores alimentam badge de confiabilidade e priorizam resultados na busca.

## 6. Comunicação Leve
### 6.1 Emails Transacionais
- **Eventos cobertos:** cadastro concluído, nova solicitação de entrega, confirmação/rejeição, validação, divergência.
- **Tecnologia:** Firebase Functions + SendGrid (ou similar). Templates armazenados em `config/email-templates` com variáveis seguras.
- **Requisitos:** Mensagens multilíngue futuro (estrutura para i18n), logs de envio anônimos (sem dados sensíveis).

### 6.2 Alertas In-App
- **Objetivo:** Informar mudanças críticas sem depender apenas de email.
- **Implementação:**
  - Service worker intercepta eventos push (via Firebase Cloud Messaging) e exibe notificações.
  - In-app toasts (componente `ui/Toast`) surgem ao abrir o app; itens não lidos ficam em `notifications` local.
  - Offline: alertas pendentes são armazenados e marcados como vistos apenas após o usuário abrir.

## 7. Upload & Perfil Visual
### 7.1 Foto de Perfil de Produtores e Receptores
- **Objetivo:** Humanizar a plataforma e facilitar reconhecimento em agendamentos presenciais.
- **Fluxo:**
  - Durante o onboarding (passo opcional), usuário pode selecionar uma imagem (JPEG/PNG) de até 2 MB.
  - Compressão client-side (`browser-image-compression`) antes do upload para reduzir consumo de dados.
  - Chamada ao route handler `/api/uploads` gera assinatura Cloudinary; arquivo é enviado direto do cliente.
  - Metadados salvos no Firestore (`profilePhotoUrl`, `updatedAt`) associados a `producers/{uid}` ou `receivers/{uid}`.

### 7.2 Atualização e Cache de Fotos
- **Objetivo:** Exibir fotos recentes em dashboards, QR code e agendamentos, com suporte offline.
- **Detalhes:**
  - Componente `profile-avatar.tsx` usa `<Image>` do Next.js com `priority` quando exibido em dashboards.
  - Service worker armazena última imagem em cache; ao ficar offline, exibe versão cacheada.
  - Alterações de foto disparam `revalidateTag('profile-media')` para atualizar layouts e página do selo.

## 8. PWA, Offline & Segurança
### 8.1 Manifest & Ícones Oficiais
- Arquivo `public/manifest.json` com nome "MeuHumus", cores do branding e ícones 192/512px. Atender requisitos Lighthouse PWA.
- Pasta `public/icons/` contém variações para iOS, maskable etc.

### 8.2 Service Worker com Estratégias Mistas
- **Shell:** cache-first (`SHELL_CACHE`) para rotas principais e assets estáticos.
- **Dados dinâmicos:** network-first com fallback para cache quando offline (entregas, perfis, capacidade).
- **Sync:** background sync para agendamentos pendentes e ajustes de capacidade. Jobs enfileirados em `syncManager` e repetidos até confirmação.
- **Limpeza:** versionamento de cache (`shell-v2`, `dynamic-v1`) e remoção de versões antigas em `activate`.

### 8.3 Regras Firebase Restringindo Acesso
- `producers/{uid}` acessível apenas pelo próprio produtor autenticado.
- `receivers/{uid}` idem, com validações de campos (email do auth == email cadastrado).
- `deliveries/{id}` leitura pública (para transparência mínima) mas escrita restrita (produtor cria, receptor valida).
- Regras incluem checagem de status permitido (`pending`, `scheduled`, `validated`, `rejected`).

### 8.4 Proteção de Dados
- Validação centralizada com Zod; sanitização de strings (`trim`, `escape`).
- Cookies `httpOnly`, `secure`, `sameSite=lax`, com expiração 24h e renovação silenciosa.
- Logs estruturados no server (padrão JSON) com scrubbing de PII; integração Sentry com `beforeSend` para anonimizar dados.
- Checklist de segurança inclui verificação de CORS (`NEXT_PUBLIC_APP_URL`), rate limiting (upload/login) e backups automáticos do Firestore.

---

**Checklist geral do documento**
- [x] Cobertura total das funcionalidades MVP existentes, agora em nível detalhado.
- [x] Alinhamento com padrões arquiteturais e snippets @Projeto-Estrutura-Detalhada.md.
- [x] Consideração dos requisitos de negócio (agendamento, selo, streak) @Projeto-Ideia.md.
- [x] Ênfase em execução PWA: offline-first, sincronização e instalação.
