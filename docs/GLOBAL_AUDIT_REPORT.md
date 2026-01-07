# GLOBAL AUDIT REPORT — Hub da Jet

**Versão:** 1.0  
**Data:** 2026-01-07  
**TCR Referência:** v2.7.0  
**Auditor:** Lovable AI

---

## 📊 RESUMO EXECUTIVO

| Área | Status | Crítico | Médio | Baixo |
|------|--------|---------|-------|-------|
| **Segurança** | ⚠️ PARTIAL | 0 | 2 | 1 |
| **Permissões** | ✅ PASS | 0 | 0 | 1 |
| **BU Scope** | ⚠️ PARTIAL | 1 | 2 | 0 |
| **Performance** | ✅ PASS | 0 | 1 | 2 |
| **Notificações** | ✅ PASS | 0 | 0 | 2 |
| **Usabilidade** | ✅ PASS | 0 | 1 | 1 |
| **TOTAL** | ⚠️ PARTIAL | 1 | 6 | 7 |

**Conclusão:** Sistema estável e funcional. 1 débito crítico identificado (uso de supabase raw em módulos operacionais). Ações corretivas documentadas.

---

## 1. SEGURANÇA

### 1.1 Autenticação e JWT

| Item | Status | Evidência |
|------|--------|-----------|
| Magic Link via SendGrid | ✅ PASS | `supabase/functions/send-magic-link/` |
| Validação de domínio por BU | ✅ PASS | `allowed_email_domains` em `bu_units` |
| JWT refresh automático | ✅ PASS | `supabase/client.ts` |
| Proteção de rotas | ✅ PASS | `ProtectedRoute`, `AdminRoute` |

### 1.2 RLS Policies

| Tabela | RLS Ativo | Política Correta | Status |
|--------|-----------|------------------|--------|
| `profiles` | ✅ | user_has_bu_access | ✅ PASS |
| `teams` | ✅ | user_has_bu_access + is_current_bu | ✅ PASS |
| `tickets` | ✅ | user_has_bu_access + is_current_bu | ✅ PASS |
| `okr_org_objectives` | ✅ | user_has_bu_access + is_current_bu | ✅ PASS |
| `asset_inventory` | ✅ | user_has_bu_access + asset_permissions | ✅ PASS |
| `notification_events` | ✅ | super_admin only | ✅ PASS |

### 1.3 Edge Functions Security

| Function | Auth Validada | BU Validada | Logging | Status |
|----------|---------------|-------------|---------|--------|
| `global-search` | ✅ JWT | ✅ membership | ⚠️ Básico | ⚠️ PARTIAL |
| `process-notification-outbox` | N/A (service) | N/A | ✅ Console | ✅ PASS |
| `get-public-asset` | N/A (público) | N/A | ⚠️ Básico | ⚠️ PARTIAL |
| `invoke-vic` | ✅ JWT | ⚠️ header only | ⚠️ Básico | ⚠️ PARTIAL |

### 1.4 Riscos Identificados

| Risco | Severidade | Mitigação |
|-------|------------|-----------|
| Edge Functions sem logging estruturado | 🟡 Médio | Implementar middleware com request_id, latency_ms |
| Sem rate limiting explícito em Edge Functions | 🟡 Médio | Adicionar rate limiting via Supabase ou middleware |
| `get-public-asset` expõe dados públicos | 🟢 Baixo | Aceitável - campos públicos sanitizados |

---

## 2. PERMISSÕES

### 2.1 Frontend Authorization

| Componente | Pattern | Status |
|------------|---------|--------|
| `usePermissions()` | ✅ Hook centralizado | ✅ PASS |
| `PermissionGuard` | ✅ Component guard | ✅ PASS |
| `RequirePermission` | ✅ Route guard | ✅ PASS |
| Wildcard para admins | ✅ `['*']` | ✅ PASS |

### 2.2 Permission Keys em Uso

```
Módulo: tickets
├── tickets.read
├── tickets.create
├── tickets.settings.view
└── tickets.settings.manage

Módulo: okrs
├── okrs.read
├── okrs.write
└── okrs.manage

Módulo: assets
├── assets.read
├── assets_admin, inventory_admin, keys_admin, gifts_admin
└── (roles via asset_permissions)

Módulo: teams
├── teams.team.create:bu
└── teams.team.manage:bu

Módulo: users
└── users.profile.manage:bu
```

### 2.3 Coerência Front x RLS

| Permission Key | Frontend Usage | Backend Enforcement | Status |
|----------------|----------------|---------------------|--------|
| `tickets.read` | LeaderDashboard.tsx | RLS + is_current_bu | ✅ OK |
| `okrs.read` | LeaderDashboard.tsx | RLS + is_current_bu | ✅ OK |
| `teams.team.create:bu` | TeamsPage.tsx | RLS (admin only) | ✅ OK |
| `users.profile.manage:bu` | Users.tsx | RLS (admin only) | ✅ OK |
| `hub.global.manage` | HubLayout.tsx | is_super_admin() | ✅ OK |

### 2.4 Gaps Identificados

| Gap | Severidade | Recomendação |
|-----|------------|--------------|
| Sem helpers semânticos (can.manageAssets) | 🟢 Baixo | Opcional - has("key") funciona bem |

---

## 3. BU SCOPE

### 3.1 Uso de useBuScopedSupabase

| Módulo | Arquivos Migrados | Arquivos Pendentes | Status |
|--------|-------------------|-------------------|--------|
| **Home** | 3 (useLeaderTeams, useLeaderDashboard, useLeaderScope) | 0 | ✅ PASS |
| **Teams** | 1 (useTeamManagement) | 2 (useTeams, useSquads) | ⚠️ PARTIAL |
| **OKRs** | 0 | 6+ (useOkrData, useOkrMutations, etc.) | ❌ FAIL |
| **Assets** | 0 | 4+ (useInventory, useKeys, etc.) | ❌ FAIL |
| **Tickets** | 0 | 3+ (useTickets, useTicketMessages, etc.) | ❌ FAIL |
| **KPIs** | 0 | 1 (useKpiData) | ❌ FAIL |

### 3.2 Colunas bu_id Nullable

| Tabela | Nullable | Deveria ser NOT NULL | Risco |
|--------|----------|----------------------|-------|
| `okr_org_objectives` | YES | ✅ SIM | 🔴 Alto |
| `okr_org_key_results` | YES | ✅ SIM | 🔴 Alto |
| `okr_team_objectives` | YES | ✅ SIM | 🔴 Alto |
| `okr_team_key_results` | YES | ✅ SIM | 🔴 Alto |
| `okr_initiatives` | YES | ✅ SIM | 🟡 Médio |
| `okr_checkins` | YES | ✅ SIM | 🟡 Médio |
| `teams` | YES | ✅ SIM | 🔴 Alto |
| `kpi_metrics` | YES | ⚠️ Depende (is_global) | 🟡 Médio |
| `cycles` | YES | ✅ SIM | 🟡 Médio |
| `profiles` | YES | ⚠️ Pode ser NULL (sem BU) | 🟢 Baixo |
| `notifications` | YES | ⚠️ Legado | 🟢 Baixo |
| `mentions` | YES | ⚠️ Legado | 🟢 Baixo |

### 3.3 Tabelas Corretamente NOT NULL

✅ Todas as tabelas de Assets: `asset_inventory`, `asset_movements`, `asset_keyrings`, etc.
✅ Todas as tabelas de Tickets: `tickets`, `ticket_messages`, `ticket_attachments`, etc.
✅ Tabelas de parceiros: `partner_companies`, `partner_contacts`, etc.
✅ Tabelas de notificação v2: `notification_outbox`, `user_notification_preferences_v2`, `bu_notification_channels`

### 3.4 Débito Crítico

```
🔴 CRÍTICO: 15+ arquivos usam supabase client raw em módulos operacionais

Arquivos afetados:
- src/modules/okrs/hooks/useOkrData.ts
- src/modules/okrs/hooks/useOkrMutations.ts
- src/modules/okrs/hooks/usePendingCheckins.ts
- src/modules/okrs/components/CheckinDialog.tsx
- src/modules/okrs/components/CreateOrgObjectiveDialog.tsx
- src/modules/okrs/components/EditTeamObjectiveDialog.tsx
- src/modules/assets/hooks/useInventory.ts
- src/modules/assets/hooks/useKeys.ts
- src/modules/assets/hooks/useAssetPermissions.ts
- src/modules/tickets/hooks/useTickets.ts
- src/modules/tickets/hooks/useTicketMessages.ts
- src/modules/kpis/hooks/useKpiData.ts
- src/modules/teams/hooks/useTeams.ts
- src/modules/teams/hooks/useSquads.ts

Impacto: Potencial vazamento de dados entre BUs se RLS falhar
Prioridade: ALTA
Ação: Migrar para useBuScopedSupabase()
```

---

## 4. PERFORMANCE

### 4.1 Índices Existentes

✅ 23+ índices de performance implementados (TCR v1.4.0)
✅ Índices compostos em tabelas principais
✅ Índices parciais para soft delete

### 4.2 Queries Críticas Auditadas

| Query | Fonte | Índice Adequado | Status |
|-------|-------|-----------------|--------|
| Dashboard Home | useHomeDashboard | ✅ (bu_id, status) | ✅ OK |
| OKRs Overview | useOrgObjectives | ✅ (bu_id, year, status) | ✅ OK |
| Tickets List | useTickets | ✅ (bu_id, status, created_at) | ✅ OK |
| Global Search | Edge Function | ✅ Múltiplos índices | ✅ OK |

### 4.3 Oportunidades de Melhoria

| Área | Melhoria | Prioridade |
|------|----------|------------|
| Home Dashboard | Edge Function agregada | 🟡 Médio |
| OKRs página inicial | Pré-computar progresso | 🟢 Baixo |
| Busca Global | Cache de resultados | 🟢 Baixo |

---

## 5. NOTIFICAÇÕES V1

### 5.1 Arquitetura

| Componente | Status | Observação |
|------------|--------|------------|
| Catálogo de eventos | ✅ PASS | 18 eventos em 6 módulos |
| Catálogo de canais | ✅ PASS | 5 canais configurados |
| BU notification channels | ✅ PASS | Configuração por BU |
| User preferences | ✅ PASS | Preferências individuais |
| Outbox pattern | ✅ PASS | Envio assíncrono |
| Edge Function processamento | ✅ PASS | Retry com backoff |

### 5.2 Idempotência

| Aspecto | Status | Evidência |
|---------|--------|-----------|
| `dedupe_key` obrigatória | ✅ PASS | UNIQUE INDEX em notification_outbox |
| Formato determinístico | ✅ PASS | `{event}:{recipient}:{channel}:{context_type}:{context_id}` |
| Proteção in-app | ✅ PASS | Verificação 5 minutos |

### 5.3 Observabilidade

| View | Status | Uso |
|------|--------|-----|
| `v_notification_delivery_health` | ✅ PASS | Métricas por BU/canal |
| `v_notification_failures` | ✅ PASS | Últimas 100 falhas |

### 5.4 Pendências V2

- ❌ Digest (daily/weekly)
- ❌ Quiet hours
- ❌ Slack integration completa
- ❌ WhatsApp integration

---

## 6. USABILIDADE

### 6.1 Links Compartilháveis

| Área | Pattern Correto | Status |
|------|-----------------|--------|
| Busca Global | `/go/:entity/:id` | ✅ PASS |
| Notificações | `/go/:entity/:id` | ✅ PASS |
| QR Codes | `/assets/:code` → `/go/asset/:uuid` | ✅ PASS |
| Copiar link | `getShareableAbsoluteUrl()` | ⚠️ Verificar uso |

### 6.2 Estados de UI

| Componente | EmptyState | ErrorState | Status |
|------------|------------|------------|--------|
| OKRs | ✅ | ✅ | ✅ PASS |
| Tickets | ✅ | ✅ | ✅ PASS |
| Assets | ✅ | ✅ | ✅ PASS |
| Teams | ✅ | ⚠️ Parcial | ⚠️ PARTIAL |

### 6.3 Feedback ao Usuário

| Ação | Toast/Feedback | Status |
|------|----------------|--------|
| Criar registro | ✅ toast.success | ✅ PASS |
| Erro de permissão | ⚠️ Genérico | 🟡 Melhorar mensagem |
| Erro de rede | ✅ ErrorState | ✅ PASS |

---

## 7. DÉBITOS TÉCNICOS

### 7.1 Críticos (Resolver Imediatamente)

| ID | Débito | Impacto | Esforço |
|----|--------|---------|---------|
| DT-001 | Migrar hooks para useBuScopedSupabase | Alto | Médio |

### 7.2 Médios (Próximo Sprint)

| ID | Débito | Impacto | Esforço |
|----|--------|---------|---------|
| DT-002 | Adicionar NOT NULL em bu_id de OKRs | Médio | Alto (migração) |
| DT-003 | Middleware de logging em Edge Functions | Médio | Baixo |
| DT-004 | Rate limiting em Edge Functions | Médio | Médio |
| DT-005 | ErrorState em Teams | Baixo | Baixo |
| DT-006 | Mensagens de erro de permissão | Baixo | Baixo |

### 7.3 Baixos (Backlog)

| ID | Débito | Impacto | Esforço |
|----|--------|---------|---------|
| DT-007 | Edge Function home-dashboard agregada | Baixo | Médio |
| DT-008 | Helpers semânticos de permissão | Baixo | Baixo |
| DT-009 | Cache de busca global | Baixo | Médio |

---

## 8. PRÓXIMOS PASSOS RECOMENDADOS

### Imediato (Esta Sprint)
1. ✅ Documentar findings neste relatório
2. 🔲 Criar PR para migrar OKRs hooks para useBuScopedSupabase
3. 🔲 Criar PR para migrar Assets hooks para useBuScopedSupabase
4. 🔲 Criar PR para migrar Tickets hooks para useBuScopedSupabase

### Curto Prazo (Próximas 2 Sprints)
1. 🔲 Migrar colunas bu_id para NOT NULL (com migração de dados)
2. 🔲 Implementar middleware de logging em Edge Functions
3. 🔲 Adicionar rate limiting

### Médio Prazo (Próximo Mês)
1. 🔲 Implementar Slack integration completa
2. 🔲 Implementar WhatsApp integration
3. 🔲 Avaliar necessidade de Edge Function agregada para dashboard

---

## 9. CONCLUSÃO

O Hub está em estado **funcional e seguro** para operação. O principal débito técnico é o uso inconsistente do `useBuScopedSupabase` em módulos operacionais, que deve ser priorizado para evitar riscos de vazamento de dados.

A Central de Notificações V1 está completa e operacional. O sistema de permissões funciona corretamente. RLS policies estão ativas e configuradas adequadamente.

**Recomendação Final:** Priorizar DT-001 (migração de hooks) antes de expandir funcionalidades.

---

*Relatório gerado automaticamente. Última atualização: 2026-01-07*
