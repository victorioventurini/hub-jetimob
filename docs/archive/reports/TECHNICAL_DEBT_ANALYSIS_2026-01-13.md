# 📊 Análise de Débitos Técnicos e Plano de Ação

**Data:** 2026-01-13  
**Versão TCR:** 2.27.0  
**Status:** ✅ P1-P2-P3 CONCLUÍDOS

---

## 📋 Sumário Executivo

Análise atualizada do Hub da Jet após sprint de limpeza (2026-01-12). O projeto mantém **excelente saúde técnica** com foco em otimizações e padronizações.

| Eixo | Débitos Identificados | Prioridade | Esforço Estimado |
|------|----------------------|------------|------------------|
| 1. Documentação | 2 items | P1 | 30 min |
| 2. Higienização | 6 items | P2 | 2h |
| 3. Segurança | 4 items (warnings) | P3 | Aceitáveis |
| 4. Performance | 5 items | P2-P3 | 3h |
| 5. Padronização | 4 items | P2 | 2h |

**Status Geral:** ✅ Projeto em excelente saúde. Débitos são majoritariamente de otimização.

---

## 1. DOCUMENTAÇÃO

### 1.1 Status Atual

| Documento | Versão | Status |
|-----------|--------|--------|
| TECHNICAL_CONTEXT_REGISTRY.md | v2.27.0 | ✅ Atualizado |
| DEVELOPMENT_STANDARDS.md | v1.4.0 | ⚠️ Referência TCR v2.24.0 |
| HEALTH_REPORT_2026-01-13.md | — | ✅ Novo |
| TECHNICAL_DEBT_ANALYSIS_2026-01-12.md | — | ✅ Sprint concluído |

### 1.2 Débitos de Documentação

| Item | Problema | Ação | Prioridade |
|------|----------|------|------------|
| DEVELOPMENT_STANDARDS.md | Versão TCR desatualizada (v2.24.0 → v2.27.0) | Atualizar referência | P1 |
| Changelog docs antigos | Alguns docs referenciam versões antigas | Revisar links quebrados | P3 |

---

## 2. HIGIENIZAÇÃO

### 2.1 Banco de Dados

#### 2.1.1 Linter Warnings (Aceitos)

| Tipo | Quantidade | Justificativa |
|------|------------|---------------|
| RLS WITH CHECK(true) | 3 | Tabelas de audit/log (insert-only, aceitável) |
| Leaked Password Protection | 1 | Pode ser habilitado via dashboard Auth |

> ✅ **Todas as 79 tabelas têm RLS ativo.** Warnings são exceções documentadas.

#### 2.1.2 Colunas text que Poderiam ser Enum (Backlog)

| Tabela | Coluna | Valores Conhecidos | Status |
|--------|--------|-------------------|--------|
| `ai_agent_logs.status` | success, error, pending | ⏳ P3 |
| `automation_logs.status` | success, error, pending, retrying | ⏳ P3 |
| `okr_org_objectives.health_status` | on_track, at_risk, behind | ⏳ P3 |
| `okr_team_objectives.health_status` | on_track, at_risk, behind | ⏳ P3 |

**Razão do adiamento:** Views dependentes requerem DROP/recreate. Baixo impacto operacional.

#### 2.1.3 Logs com Crescimento (Cleanup Ativo)

| Tabela | Função de Cleanup | Retenção | Status |
|--------|-------------------|----------|--------|
| `ai_agent_logs` | `cleanup_old_agent_logs()` | 90 dias | ✅ Ativo |
| `cron_execution_logs` | `cleanup_old_cron_logs()` | 30 dias | ✅ Ativo |
| `okr_wizard_sessions` | `cleanup_old_wizard_sessions()` | 7 dias | ✅ Ativo |

---

### 2.2 Frontend

#### 2.2.1 select('*') Encontrados

Busca identificou **usos legítimos** de `select('*', { count: "exact", head: true })` para contagens.

| Arquivo | Uso | Status |
|---------|-----|--------|
| `SettingsHome.tsx` | `select('*', { count: 'exact', head: true })` | ✅ OK (count only) |
| `useExternalDashboard.ts` | `select('*', { count: 'exact', head: true })` | ✅ OK (count only) |
| `useTeams.ts` | `select('*', { count: 'exact', head: true })` | ✅ OK (count only) |
| `getOptionalBuClient.ts` | Exemplo em JSDoc | ⚠️ Corrigir exemplo |

**Conclusão:** Nenhum overfetch real. Apenas 1 exemplo de documentação a corrigir.

#### 2.2.2 Componentes Legacy Removidos (Sprint Anterior)

| Componente | Status |
|------------|--------|
| `CheckinWizard` | ✅ Removido (2026-01-13) |
| `wizard/*.tsx` (5 arquivos) | ✅ Removidos (2026-01-13) |
| `LegacyAssetRedirect` | ✅ Removido (2026-01-12) |
| `TicketMentionInput` | ✅ Removido (2026-01-12) |

---

## 3. SEGURANÇA

### 3.1 Status RLS

| Métrica | Valor | Status |
|---------|-------|--------|
| Tabelas com RLS | 79/79 (100%) | ✅ |
| Policies usando V2 (has_permission) | 100% | ✅ |
| Views com SECURITY INVOKER | 100% | ✅ |
| Funções com search_path fixo | 100% | ✅ |

### 3.2 Linter Warnings (Aceitáveis)

| Warning | Tabelas | Justificativa |
|---------|---------|---------------|
| `WITH CHECK(true)` | 3 tabelas de audit/log | Insert-only, leitura pública |
| Leaked Password Protection | N/A | Auth setting, não é bug |

> ✅ **Zero vulnerabilidades críticas.** Warnings são design decisions documentadas.

---

## 4. PERFORMANCE

### 4.1 Índices (Status)

| Categoria | Quantidade | Status |
|-----------|------------|--------|
| Índices ativos utilizados | 45+ | ✅ |
| Índices com 0 scans (monitorando) | 8 | ⏳ 30 dias observação |
| Índices novos (sprint anterior) | +7 | ✅ |

### 4.2 RPCs Agregadoras

| RPC | Status | Descrição |
|-----|--------|-----------|
| `rpc_home_dashboard_data` | ✅ Implementado | Dashboard home |
| `rpc_leader_dashboard_focus` | ✅ Implementado | Dashboard líder |
| `rpc_tickets_summary` | ✅ Implementado | Resumo tickets |
| `get_cycle_checkins` | ✅ Implementado | Check-ins de ciclo OKR |
| `get_manageable_teams` | ✅ Implementado | Times gerenciáveis |

### 4.3 Pendências de Performance

| Item | Esforço | Prioridade | Status |
|------|---------|------------|--------|
| Índice `idx_ticket_attachments_bu_ticket` | 5 min | P2 | ⏳ Backlog |
| Índice `idx_ticket_messages_bu_ticket_created` | 5 min | P2 | ⏳ Backlog |
| RPC `rpc_assets_dashboard` | 2h | P3 | ⏳ Backlog |
| Particionamento `ai_agent_logs` | 4h | P3 | ⏳ Futuro |

---

## 5. PADRONIZAÇÃO

### 5.1 Query Keys

| Padrão | Status |
|--------|--------|
| Modularização em `src/lib/queryKeys/*.ts` | ✅ Completo |
| Import via `queryKeys` export único | ✅ Ativo |
| Migração para imports diretos | ⏳ Gradual (não bloqueante) |

### 5.2 URL State

| Página | URL State | Status |
|--------|-----------|--------|
| `/okrs/checkins` | ✅ `cycle_id`, `tab`, `team_id`, filtros | ✅ Completo |
| `/users` | ✅ `q`, `status`, `team_id` | ✅ Completo |
| `/assets/inventory` | ✅ `q`, `status`, `category_id` | ✅ Completo |

### 5.3 Hooks Corrigidos (Sprint 2026-01-13)

| Hook | Correção | Status |
|------|----------|--------|
| `useCycleCheckins` | Mapeamento `feed→checkins`, `total_count→total` | ✅ |
| `useActiveCycles` | Priorização: `quarter > semester > year` | ✅ |

### 5.4 Padrões de Wizard

| Padrão | Status |
|--------|--------|
| Full-page wizards (não modais) | ✅ Adotado para OKRs |
| `useWizardOrchestrator` | ✅ Implementado |
| Componentes compartilhados | ✅ `WizardStepHeader`, `WizardStepFooter` |

---

## 📊 Plano de Execução

### P1 — Crítico (Esta semana)

| Item | Esforço | Status |
|------|---------|--------|
| Atualizar referência TCR em DEVELOPMENT_STANDARDS.md | 5 min | ✅ Feito |
| Corrigir exemplo JSDoc em getOptionalBuClient.ts | 5 min | ✅ Feito |

### P2 — Importante (Próximas 2 semanas)

| Item | Esforço | Status |
|------|---------|--------|
| Criar índices para ticket_attachments/messages | 15 min | ✅ Já existem |
| Revisar índices com 0 scans (30 dias) | 30 min | 🔲 Monitorando |

### P3 — Desejável (Backlog)

| Item | Esforço | Status |
|------|---------|--------|
| Migração text→enum (health_status, status) | 2h | 📄 [Plano documentado](./ENUM_MIGRATION_PLAN.md) |
| RPC rpc_assets_dashboard | 2h | ⏳ Baixa demanda |
| Particionamento de logs | 4h | ⏳ Tamanho ainda gerenciável |

---

## ✅ Métricas de Sucesso

| Métrica | Valor | Status |
|---------|-------|--------|
| Tabelas com RLS | 100% (79/79) | ✅ |
| Views com SECURITY INVOKER | 100% | ✅ |
| select('*') real (overfetch) | 0 | ✅ |
| Componentes legacy OKR | 0 | ✅ |
| Query keys centralizados | 100% | ✅ |
| Cleanup de logs automático | 3 tabelas | ✅ |
| Documentação TCR | v2.27.0 | ✅ |

---

## 📝 Conclusão

O Hub da Jet mantém **excelente estado técnico**:

1. **Segurança:** ✅ 100% compliance (RLS V2, SECURITY INVOKER)
2. **Padrões:** ✅ 100% aderência ao TCR
3. **Código legacy:** ✅ CheckinWizard removido, full-page adotado
4. **Performance:** ✅ Índices otimizados, RPCs agregadoras ativas
5. **Documentação:** ✅ TCR v2.27.0 atualizado

### Próximos Passos

1. Atualizar DEVELOPMENT_STANDARDS.md referência
2. Monitorar índices não utilizados (30 dias)
3. Avaliar migração text→enum após estabilização de views

---

*Análise concluída em: 2026-01-13*  
*Próxima revisão: 2026-01-20*
