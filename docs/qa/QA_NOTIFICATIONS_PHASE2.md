# QA Checklist - Central de Notificações Phase 2

## Data: 2026-01-09
## Versão: Phase 2 - UI Global + BU + URL State

---

## 1. UI Global `/hub/notifications` (Super Admin)

### 1.1 Tab Eventos
- [ ] Lista todos eventos do catálogo
- [ ] Filtro por busca (q) funciona e persiste na URL
- [ ] Filtro por módulo funciona e persiste na URL
- [ ] Filtro por severidade funciona e persiste na URL
- [ ] Botão "Novo Evento" abre dialog
- [ ] Edição de evento funciona
- [ ] Deleção de evento funciona
- [ ] Eventos mandatory mostram ícone de lock

### 1.2 Tab Canais
- [ ] Lista todos canais globais (in_app, email, slack, whatsapp, webhook)
- [ ] Mostra status (active/inactive)
- [ ] Mostra "Requer Configuração" corretamente
- [ ] Toggle de status funciona (exceto in_app)

### 1.3 Tab Diagnóstico
- [ ] Cards mostram totais corretos (Total, Pending, Sent, Failed)
- [ ] Mostra última notificação enviada
- [ ] Mostra taxa de sucesso
- [ ] Mostra contagem de canais ativos
- [ ] Mostra contagem de eventos

### 1.4 URL State
- [ ] Tab persiste na URL (?tab=events|channels|diagnostics)
- [ ] Filtros persistem na URL (?q=..&module=..&severity=..)
- [ ] Refresh mantém estado

---

## 2. UI BU `/settings/notifications` (Admin BU)

### 2.1 Tab Canais
- [ ] Mostra bu_notification_channels para a BU atual
- [ ] in_app e email mostram como enabled
- [ ] slack, whatsapp, webhook mostram como TODO/disabled
- [ ] Toggle enable/disable funciona

### 2.2 Tab Eventos (Event Settings)
- [ ] Lista bu_notification_event_settings
- [ ] Permite toggle por evento/canal
- [ ] Eventos mandatory não podem ser desabilitados (toggle disabled + tooltip)
- [ ] Filtros funcionam (busca, canal)

### 2.3 Tab Outbox
- [ ] Lista notification_outbox para a BU
- [ ] Filtro por status (pending/sent/failed) funciona
- [ ] Filtro por canal funciona
- [ ] Paginação funciona
- [ ] Botão "Retry" aparece para items failed
- [ ] Retry funciona e atualiza lista

### 2.4 Tab In-App Logs
- [ ] Lista notifications (in_app) para a BU
- [ ] Filtro por is_read funciona
- [ ] Paginação funciona
- [ ] Mostra recipient, title, type, created_at

### 2.5 Tab Teste
- [ ] Dropdown de destinatário lista profiles da BU
- [ ] Checkboxes in_app e email funcionam
- [ ] Botão "Enviar Teste" chama RPC
- [ ] Resultado mostra notification_id e outbox_id
- [ ] Mensagem de sucesso aparece

### 2.6 URL State
- [ ] Tab persiste na URL (?tab=channels|events|outbox|inapp|test)
- [ ] Filtros de outbox persistem (?status=..&channel=..&page=..)
- [ ] Refresh mantém estado

---

## 3. Teste End-to-End

### 3.1 Cenário: Enviar notificação teste
1. [ ] Acessar `/settings/notifications?tab=test`
2. [ ] Selecionar destinatário (profile ativo na BU)
3. [ ] Marcar in_app e email
4. [ ] Clicar "Enviar Teste"
5. [ ] Verificar resultado mostra IDs

### 3.2 Verificar criação
- [ ] Tab Outbox mostra novo registro com event_slug=notifications.test
- [ ] Tab In-App mostra novo registro com type=test
- [ ] NotificationCenter (bell) mostra notificação para destinatário

### 3.3 Verificar contadores globais
- [ ] `/hub/notifications?tab=diagnostics` mostra total incrementado

---

## 4. Permission Guards

### 4.1 Usuário comum (sem permissões)
- [ ] Não consegue acessar `/hub/notifications`
- [ ] Não consegue ver tabs restritas em `/settings/notifications`

### 4.2 Admin BU (com notifications.bu.manage:bu)
- [ ] Acessa todas tabs de `/settings/notifications`
- [ ] Pode enviar teste
- [ ] Pode fazer retry no outbox

### 4.3 Super Admin
- [ ] Acessa `/hub/notifications`
- [ ] Pode editar catálogo de eventos
- [ ] Pode toggle canais globais

---

## 5. Validações de Segurança

- [ ] Queries usam useBuScopedSupabase (post-BU)
- [ ] Nenhum select('*') no código
- [ ] QueryKeys centralizadas
- [ ] RLS funciona (troca de BU isola dados)

---

## Status Final

| Área | Status |
|------|--------|
| UI Global | ⬜ PENDING |
| UI BU | ⬜ PENDING |
| URL State | ⬜ PENDING |
| Test E2E | ⬜ PENDING |
| Guards | ⬜ PENDING |
| Segurança | ⬜ PENDING |

**Status Geral: ⬜ PENDING**

---

## Notas

- Testar com diferentes BUs para validar isolamento
- Verificar console para erros
- Validar que process-notification-outbox está rodando para testar fluxo completo de email
