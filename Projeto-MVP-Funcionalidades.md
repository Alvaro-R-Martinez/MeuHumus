# Funcionalidades MVP — MeuHumus (PWA Simples)

## 1. Onboarding e Acesso
- **Cadastro Rápido de Produtores:** Formulário PWA responsivo com dados mínimos (contato, endereço, horários) e volume médio diário disponível.
- **Cadastro Rápido de Receptores:** Coleta da capacidade diária em quilos, tipos de resíduo aceitos e janelas disponíveis.
- **Autenticação Firebase (Email/Senha ou Link Mágico):** Sessões persistentes via cookies seguros e refresh automático silencioso.
- **Instalação como App:** Banner orientando usuários a instalar o PWA e guardar o ícone na tela inicial.

## 2. Perfil Essencial & Selo Sustentável
- **Visão Geral Compacta:** Cartões com streak atual, capacidade restante do dia, último volume entregue e próximas coletas, acessível offline.
- **QRCode do Selo:** Página estática cacheada com QR code que exibe o selo, streak e total de resíduos redirecionados.
- **Atualização Automática do Selo:** Sincronização leve sempre que uma entrega é validada, garantindo dados em tempo quase real.

## 3. Descoberta & Conexão
- **Lista Geolocalizada de Receptores:** Catálogo filtrável por raio, tipo de resíduo e janela disponível. Receptores sem capacidade para a data selecionada não aparecem como opção.
- **Favoritos & Compatibilidade Básica:** Produtores podem marcar receptores confiáveis e ver avisos de compatibilidade de horários/capacidade.

## 4. Gestão de Entregas Simplificada
- **Agendamento com Volume:** Formulário curto para informar quilos a entregar, data/hora e observações, com salvamento offline (IndexedDB) até sincronizar.
- **Reserva de Capacidade:** Ao confirmar, o sistema abate o volume do limite diário do receptor; se o limite zerar, o perfil não aparece para novos agendamentos naquele dia.
- **Confirmação do Receptor:** Aceitar, ajustar horário ou recusar mantendo justificativa; respostas atualizam a disponibilidade automaticamente.
- **Registro de Entrega:** Tela server-side com checklist de qualidade, registro do peso real entregue e observações rápidas.

## 5. Fluxo de Qualidade & Streak
- **Validação do Receptor:** Botão único para aprovar, ajustar peso recebido ou reportar divergência; reprovações quebram o streak automaticamente.
- **Histórico Essencial:** Linha do tempo leve com status (agendado, pendente, validada, rejeitada) acessível mesmo offline.
- **Indicadores de Confiança:** Taxa de entregas corretas e média de ocupação diária exibidas no perfil.

## 6. Comunicação Leve
- **Emails Transacionais:** Disparo para eventos críticos (solicitação recebida, entrega confirmada, divergência registrada).
- **Alertas In-App:** Toasts/cache de notificações via service worker para lembretes de entrega ou solicitações pendentes.

## 7. Upload & Evidências
- **Foto Opcional da Entrega:** Upload single-file com compressão no client e assinatura Cloudinary segura.
- **Galeria Resumida:** Miniatura cacheada localmente com indicação do agendamento associado.

## 8. PWA, Offline & Segurança
- **Manifest & Ícones Oficiais:** Configuração completa para exibir nome, cores e ícones nas telas instaladas.
- **Service Worker com Estratégias Mistas:** Cache-first para shell, network-first para dados recentes e sync em segundo plano para agendamentos e ajustes de capacidade pendentes.
- **Regras Firebase Restringindo Acesso:** Garantia de que cada usuário só edita seus registros (streak, entregas, QR code).
- **Proteção de Dados:** Sanitização das entradas (Zod/Yup), cookies `httpOnly` e logs mínimos com scrubbing de PII.
