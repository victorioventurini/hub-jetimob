# 📊 Análise de Débitos Técnicos e Plano de Ação

**Data:** 2026-01-12  
**Versão TCR:** 2.21.0  
**Status:** Análise completa

---

## 📋 Sumário Executivo

Análise abrangente do Hub da Jet identificando oportunidades de melhoria em 5 eixos:

| Eixo | Débitos Identificados | Prioridade | Esforço |
|------|----------------------|------------|---------|
| 1. Atualização TCR/Docs | 3 items | P1 | 2h |
| 2. Higienização | 12 items | P1-P2 | 4h |
| 3. Refatoração | 8 items | P2-P3 | 8h |
| 4. Centralização | 6 items | P2 | 4h |
| 5. Performance | 9 items | P2-P3 | 6h |

**Status Geral:** ✅ Projeto em excelente saúde técnica. Débitos são majoritariamente de otimização, não de correção crítica.

---

## 1. ATUALIZAÇÃO TCR E DOCUMENTAÇÃO

### 1.1 Status Atual do TCR

| Documento | Versão | Status |
|-----------|--------|--------|
| TECHNICAL_CONTEXT_REGISTRY.md | v2.21.0 | ✅ Atualizado |
| DEVELOPMENT_STANDARDS.md | v1.2.0 | ✅ Atualizado |
| DATA_MODEL_REGISTRY.md | — | ✅ Atualizado |
| HYGIENE_AND_OPTIMIZATION_PLAN_2026-01.md | v1.1.0 | ✅ Completo |
| HEALTH_REPORT_2026-01-11.md | — | ✅ Atual |

### 1.2 Débitos de Documentação

| Item | Problema | Ação | Prioridade |
|------|----------|------|------------|
| Versão do DOCUMENTATION_INDEX.md | Referencia TCR v2.15.0 | Atualizar para v2.21.0 | P1 |
| Links quebrados em docs antigos | Relatórios de wave referem arquivos removidos | Arquivar ou atualizar links | P3 |
| HEALTH_REPORT desatualizado | Data 2026-01-11 | Gerar novo relatório periódico | P2 |

### 1.3 Plano de Ação - Documentação

```
Wave D1 (30 min):
☐ Atualizar DOCUMENTATION_INDEX.md com versão TCR atual
☐ Verificar links em docs/engineering/*.md
☐ Gerar novo HEALTH_REPORT

Wave D2 (1h):
☐ Consolidar relatórios de wave em arquivo de histórico
☐ Atualizar Custom Knowledge com diretrizes de continuidade
```

---

## 2. HIGIENIZAÇÃO — Código e Arquivos Desnecessários

### 2.1 Banco de Dados

#### 2.1.1 Tabelas de Log (Crescimento)

| Tabela | Linhas | Tamanho | Ação |
|--------|--------|---------|------|
| `ai_agent_logs` | 51.054 | 21 MB | ⚠️ Implementar retenção automática |
| `cron_execution_logs` | 3.544 | 1.3 MB | ⚠️ Implementar retenção automática |
| `audit_logs` | 637 | 1.2 MB | ✅ OK |
| `okr_wizard_sessions` | 498 | 464 KB | ⚠️ Limpar sessões antigas (>30d) |

**Funções de Cleanup Existentes:**
- `cleanup_old_agent_logs()` — 90 dias ✅
- `cleanup_old_cron_logs()` — 30 dias ✅
- `cleanup_old_wizard_sessions()` — 7 dias ✅

**Pendência:** Agendar execução via cron-dispatcher.

#### 2.1.2 Tabelas com bu_id Sem Índice Dedicado

| Tabela | Ação |
|--------|------|
| `ai_agents` | ⚠️ Criar `idx_ai_agents_bu_id` |
| `app_error_logs` | ⚠️ Criar `idx_app_error_logs_bu_id` |
| `cycles` | ⚠️ Criar `idx_cycles_bu_id` |
| `okr_checkins` | ⚠️ Já tem `idx_okr_checkins_bu_cycle` |
| `okr_objective_reviews` | ⚠️ Verificar uso |
| `ticket_attachments` | ⚠️ Criar índice |
| `ticket_messages` | ⚠️ Criar índice |
| `ticket_participants` | ⚠️ Criar índice |

#### 2.1.3 Colunas text que Poderiam ser Enum

| Tabela | Coluna | Valores Conhecidos | Ação |
|--------|--------|-------------------|------|
| `ai_agent_logs.status` | success, error, pending | ⚠️ Migrar para enum |
| `automation_logs.status` | success, error, pending, retrying | ⚠️ Migrar para enum |
| `okr_org_objectives.health_status` | on_track, at_risk, behind | ⚠️ Migrar para enum |
| `okr_team_objectives.health_status` | on_track, at_risk, behind | ⚠️ Migrar para enum |
| `profiles.global_status` | active, inactive | ⚠️ Migrar para enum |

#### 2.1.4 Warnings do Linter (Aceitáveis)

| Tipo | Quantidade | Justificativa |
|------|------------|---------------|
| SECURITY DEFINER Views | 2 | Falso positivo - views têm `security_invoker=true` |
| RLS WITH CHECK(true) | 4 | Tabelas de audit/log (insert-only) |
| Leaked Password Protection | 1 | Pode ser habilitado via dashboard |

---

### 2.2 Backend (Edge Functions)

#### 2.2.1 Funções Ativas (16 total)

| Função | Status | Notas |
|--------|--------|-------|
| `auth-email-hook` | ✅ Crítica | Validação de domínio |
| `request-magic-link` | ✅ Crítica | Auth flow |
| `invoke-vic` | ✅ Ativa | IA principal |
| `culture-message` | ⚠️ Fallback | Frontend usa pool local |
| `process-notification-outbox` | ✅ Crítica | Outbox pattern |
| `cron-dispatcher` | ✅ Crítica | Orquestração |
| `get-public-asset` | ✅ Ativa | QR codes |
| `get-tcr` | ✅ Ativa | API para agentes IA |
| `audit-permissions` | ⚠️ Dev-only | Considerar flag de ambiente |
| `evaluate-notification-health` | ✅ Ativa | Health check |
| `search-address` | ✅ Ativa | Google Places |
| `search-cities` | ✅ Ativa | Busca cidades |
| `get-place-details` | ✅ Ativa | Google Places |
| `process-agent-document` | ✅ Ativa | Processamento docs IA |
| `send-partner-invite` | ✅ Ativa | Convites parceiros |

#### 2.2.2 Código _shared

| Arquivo | Status | Ação |
|---------|--------|------|
| `cors.ts` | ✅ Usado | — |
| `supabaseClient.ts` | ✅ Usado | — |
| `auth.ts` | ⚠️ Verificar | Auditar imports |
| `types.ts` | ⚠️ Verificar | Auditar imports |

---

### 2.3 Frontend

#### 2.3.1 Arquivos Candidatos a Remoção

| Arquivo | Problema | Ação | Prioridade |
|---------|----------|------|------------|
| `src/pages/LegacyAssetRedirect.tsx` | Compatibilidade URLs antigas | ⚠️ Avaliar se ainda necessário | P3 |
| `src/pages/PublicAssetRedirect.tsx` | Compatibilidade QR codes | ✅ Manter (QR físicos) | — |
| `src/pages/VicTestPage.tsx` | Página de teste | ⚠️ Remover ou mover para /dev | P3 |
| `src/components/mentions/TicketMentionInput.tsx` | @deprecated | ⚠️ Remover após migração | P2 |

#### 2.3.2 Hooks Candidatos a Consolidação

| Hook | Problema | Ação |
|------|----------|------|
| `useGreeting.ts` | Isolado, poderia ser util | ⚠️ Mover para shared/utils |
| `useDebouncedValue.ts` + `useDebouncedCallback.ts` | Dois hooks similares | ⚠️ Consolidar em um |

#### 2.3.3 Dependências NPM

✅ Todas as dependências atuais estão em uso. Nenhuma remoção necessária.

---

## 3. REFATORAÇÃO — Otimização Estrutural

### 3.1 Banco de Dados

#### 3.1.1 Normalização Pendente

| Tabela | Coluna | Problema | Ação |
|--------|--------|----------|------|
| `asset_inventory` | `created_by`, `updated_by` | Sem FK para profiles | Adicionar FK |
| `asset_keyrings` | `current_user_id` | Sem FK para profiles | Adicionar FK |
| `profiles` | `manager_user_id` | Sem FK (self-reference) | Adicionar FK |

#### 3.1.2 Subcategorias de Tickets

```sql
-- Proposta: Migrar ticket_subcategories para parent_id em ticket_categories
-- Simplifica modelo e elimina tabela

-- 1. Adicionar parent_id em ticket_categories (se não existir)
ALTER TABLE ticket_categories ADD COLUMN parent_id UUID REFERENCES ticket_categories(id);

-- 2. Migrar dados de ticket_subcategories
-- 3. Atualizar referências
-- 4. DROP TABLE ticket_subcategories
```

**Status:** P3 — Baixa prioridade, funciona atualmente.

---

### 3.2 Backend

#### 3.2.1 Consolidação de Helpers

```
supabase/functions/_shared/
├── cors.ts           ✅ Existente
├── supabaseClient.ts ✅ Existente
├── auth.ts           → Consolidar validação JWT
├── logging.ts        → NOVO: Structured logging
├── errors.ts         → NOVO: Error handling padrão
└── response.ts       → NOVO: Response builders
```

---

### 3.3 Frontend

#### 3.3.1 Módulo OKRs

**Status:** ✅ Já bem estruturado após waves anteriores:
- `hooks/queries/` — Queries consolidadas
- `utils/` — Validação, health score
- `components/wizards/` — Wizards organizados

**Pendência:** Implementar UI para `okr_dependencies` (tabela existe).

#### 3.3.2 queryKeys Deprecation

O objeto global `queryKeys` está marcado como `@deprecated`. Migração gradual para imports diretos:

```typescript
// ❌ Antigo
import { queryKeys } from '@/lib/queryKeys';
queryKeys.okrs.teamObjectives(...)

// ✅ Novo
import { okrsKeys } from '@/lib/queryKeys/okrs';
okrsKeys.teamObjectives(...)
```

**Status:** P3 — Funciona, migração gradual.

---

## 4. CENTRALIZAÇÃO — Consolidação de Código

### 4.1 Banco de Dados

✅ **Já centralizado:**
- `permission_catalog` — 160 keys
- `permission_templates_v2` — 27 templates
- `notification_events` — 18 eventos
- `notification_channels` — 5 canais
- `hub_integrations_catalog` — Integrações

### 4.2 Backend

#### 4.2.1 Padrão de Response (Proposta)

```typescript
// _shared/response.ts
export function successResponse<T>(data: T, meta?: Record<string, unknown>) {
  return new Response(JSON.stringify({ success: true, data, meta }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}

export function errorResponse(message: string, status = 400, code?: string) {
  return new Response(JSON.stringify({ success: false, error: { message, code } }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}
```

### 4.3 Frontend

#### 4.3.1 Componentes Compartilhados (Status)

| Componente | Status |
|------------|--------|
| `PageHeader` | ✅ Centralizado em `src/components/ui/` |
| `EmptyState` | ✅ Centralizado em `src/components/ui/` |
| `LoadingState` | ✅ Centralizado em `src/components/ui/` |
| `ConfirmDialog` | ✅ Centralizado em `src/components/ui/` |

#### 4.3.2 Tipos Compartilhados (Status)

✅ Já existe `src/shared/types/index.ts` com:
- PaginationParams
- BaseEntity
- SoftDeletable

---

## 5. PERFORMANCE — Otimização

### 5.1 Banco de Dados

#### 5.1.1 Índices Recomendados (Pendentes)

```sql
-- Tickets com bu_id em subcoleções
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_bu_ticket 
ON ticket_attachments(bu_id, ticket_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ticket_messages_bu_ticket_created 
ON ticket_messages(bu_id, ticket_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_participants_bu_ticket 
ON ticket_participants(bu_id, ticket_id);

-- AI Agents por BU
CREATE INDEX IF NOT EXISTS idx_ai_agents_bu_active 
ON ai_agents(bu_id, is_active) WHERE is_active = true;

-- Cycles por BU
CREATE INDEX IF NOT EXISTS idx_cycles_bu_status 
ON cycles(bu_id, status);
```

#### 5.1.2 Monitoramento de Índices

Usar view `v_perf_indexes_report` para monitorar:
- Índices não utilizados (0 scans após 30 dias)
- Índices com baixo hit ratio

#### 5.1.3 Particionamento (Futuro — P3)

| Tabela | Critério | Benefício |
|--------|----------|-----------|
| `ai_agent_logs` | Por mês | Cleanup eficiente |
| `cron_execution_logs` | Por mês | Cleanup eficiente |

### 5.2 Backend

#### 5.2.1 RPCs Agregadoras (Status)

| RPC | Status |
|-----|--------|
| `rpc_home_dashboard_data` | ✅ Implementado |
| `rpc_leader_dashboard_focus` | ✅ Implementado |
| `rpc_tickets_summary` | ✅ Implementado |

**Pendentes:**
- `rpc_okr_team_summary` — Resumo OKRs por time
- `rpc_assets_dashboard` — Dashboard de ativos

### 5.3 Frontend

#### 5.3.1 Cache Config (Status)

✅ Implementado em `src/lib/queryCacheConfig.ts`:

| Domínio | staleTime | gcTime |
|---------|-----------|--------|
| profiles | 5 min | 30 min |
| teams | 5 min | 30 min |
| bu_units | 10 min | 60 min |
| permissions | 5 min | 30 min |
| tickets | 30 seg | 5 min |
| notifications | 0 | 1 min |

#### 5.3.2 Code Splitting

✅ Lazy loading implementado para todas as rotas principais.

---

## 📊 Plano de Execução por Prioridade

### P1 — Crítico (Esta semana) ✅ CONCLUÍDO

| Item | Esforço | Impacto | Status |
|------|---------|---------|--------|
| Agendar cleanup de logs via cron | 30 min | Storage | ✅ Done |
| Criar índices para tickets/* | 15 min | Query speed | ✅ Done (7 índices) |
| Atualizar DOCUMENTATION_INDEX | 10 min | Consistência | ✅ Done |

### P2 — Importante (Próximas 2 semanas) ✅ PARCIALMENTE CONCLUÍDO

| Item | Esforço | Impacto | Status |
|------|---------|---------|--------|
| Migrar colunas text → enum | 2h | Type safety | ⏳ Adiado (views dependentes) |
| Criar helpers _shared/response.ts | 1h | DX | ✅ Done |
| Remover TicketMentionInput deprecated | 30 min | Cleanup | ✅ Done |
| Consolidar hooks debounce | 30 min | DX | ✅ Done |

### P3 — Desejável (Backlog)

| Item | Esforço | Impacto |
|------|---------|---------|
| Migrar ticket_subcategories | 4h | Simplificação |
| Migrar queryKeys imports | 2h | Modernização |
| Implementar okr_dependencies UI | 4h | Feature |
| Avaliar remoção LegacyAssetRedirect | 1h | Cleanup |

---

## ✅ Métricas de Sucesso

| Métrica | Atual | Meta | Status |
|---------|-------|------|--------|
| Tabelas com RLS | 100% | 100% | ✅ |
| Views com SECURITY INVOKER | 100% | 100% | ✅ |
| Funções com search_path | 100% | 100% | ✅ |
| Componentes não utilizados | 0 | 0 | ✅ |
| Hooks mock/legacy | 0 | 0 | ✅ |
| select('*') no código | 0 | 0 | ✅ |
| queryKeys centralizados | 100% | 100% | ✅ |
| Índices de log crescendo | 2 tabelas | Retenção ativa | ⚠️ |
| Índices não utilizados | ~25 | <10 | ⚠️ Monitorar |

---

## 📝 Conclusão

O Hub da Jet está em **excelente estado técnico**. Os débitos identificados são majoritariamente de **otimização e polish**, não de correção crítica:

1. **Segurança:** ✅ 100% compliance (RLS, SECURITY INVOKER, search_path)
2. **Padrões:** ✅ 100% aderência ao TCR
3. **Código legado:** ✅ Mínimo, bem documentado
4. **Performance:** ⚠️ Oportunidades de índices e retenção de logs
5. **Documentação:** ⚠️ Pequenas atualizações de versão

**Recomendação:** Executar Wave P1 imediatamente, agendar P2 para sprint atual.

---

*Relatório gerado em: 2026-01-12*
