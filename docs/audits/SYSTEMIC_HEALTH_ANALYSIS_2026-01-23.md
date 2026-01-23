# Análise Sistêmica de Saúde — Hub da Jet

**Data:** 2026-01-23  
**TCR:** v2.73.0  
**Objetivo:** Identificar dívidas técnicas, complexidade desnecessária e ajustes para escalabilidade

---

## 📊 Resumo Executivo

| Dimensão | Score | Status |
|----------|-------|--------|
| **Banco de Dados** | 9.5/10 | ✅ Excelente |
| **Backend (Edge Functions)** | 9/10 | ✅ Sólido |
| **Frontend** | 8.5/10 | ✅ Bom |
| **Documentação** | 9.5/10 | ✅ Excelente |
| **Rituais/Processos** | 8/10 | ⚠️ Oportunidades |
| **GERAL** | **8.9/10** | ✅ Saudável |

O Hub está em excelente estado técnico. As dívidas identificadas são **baixa prioridade** e não bloqueiam crescimento.

---

## 🗄️ 1. Banco de Dados

### 1.1 Métricas Atuais

| Métrica | Valor | Benchmark |
|---------|-------|-----------|
| Tabelas | 136 | Normal para escopo |
| Views | 26 | ✅ Consolidadas |
| Funções SQL | 198 | ✅ Auditadas (175 documentadas) |
| Índices | 456 | ✅ Otimizado |
| Enums | 70 | ⚠️ Alto (tendência crescer) |
| RLS | 100% | ✅ Cobertura total |

### 1.2 ✅ Pontos Fortes

1. **RLS V2 100% migrado** — Todas as 108 tabelas operacionais protegidas
2. **Identity convention** — Separação clara `auth.users.id` vs `profiles.id`
3. **Partial indexes** — 7 índices com `deleted_at IS NULL` para soft-delete
4. **pg_cron cleanup** — Automação de limpeza de logs

### 1.3 ⚠️ Dívidas Técnicas Identificadas

| Dívida | Impacto | Prioridade | Ação Recomendada |
|--------|---------|------------|------------------|
| **Logs acumulando** | Performance | P2 | Executar `cleanup_old_logs()` semanal |
| **2 RLS USING(true)** | Segurança | P3 | Revisar se intencional (tabelas globais) |
| **Enums não migrados** | Manutenção | P3 | `tickets.priority` ainda é TEXT |
| **Colunas legadas** | Clareza | P4 | `owner_user_id` deveria ser `owner_profile_id` |

### 1.4 Tabelas de Log (Ação Imediata)

```sql
-- EXECUTAR SEMANALMENTE:
SELECT cleanup_old_logs();

-- Ou manualmente:
DELETE FROM ai_agent_logs WHERE created_at < NOW() - INTERVAL '30 days'; -- 82k+ rows
DELETE FROM cron_execution_logs WHERE created_at < NOW() - INTERVAL '7 days'; -- 10k+ rows
DELETE FROM perf_metrics_snapshots WHERE created_at < NOW() - INTERVAL '30 days';
```

---

## ⚙️ 2. Backend (Edge Functions)

### 2.1 Status Atual

| Métrica | Valor |
|---------|-------|
| Edge Functions ativas | 18 |
| JSDoc cobertura | 100% |
| Error handling padronizado | ✅ `withErrorHandling` |
| CORS configurado | ✅ `_shared/cors.ts` |

### 2.2 ✅ Pontos Fortes

1. **Arquitetura consolidada** — `_shared/` com response, cors, auth helpers
2. **JSDoc padronizado** — Todas 18 funções documentadas
3. **Error handling** — Wrapper unificado com structured errors
4. **Monitoramento** — `cron-dispatcher` com logs e métricas

### 2.3 ⚠️ Dívidas Técnicas

| Dívida | Impacto | Prioridade | Ação |
|--------|---------|------------|------|
| **Falta de rate limiting** | Segurança | P2 | Implementar em `_shared/` |
| **Sem circuit breaker** | Resiliência | P3 | Para integrações externas |
| **Logs não centralizados** | Observabilidade | P3 | Considerar Loki/Grafana |

---

## 🎨 3. Frontend

### 3.1 Métricas de Código

| Métrica | Valor | Status |
|---------|-------|--------|
| Módulos | 16 | ✅ Bem organizados |
| Query keys centralizadas | 100% | ✅ |
| BU-scoped queries | 100% | ✅ |
| URL state | 100% | ✅ |
| Barrel files | 100% | ✅ |

### 3.2 ✅ Pontos Fortes

1. **Modularização** — 16 módulos independentes em `src/modules/`
2. **Hooks consolidados** — Barrel exports em cada módulo
3. **Query safety** — `select('fields')` obrigatório, sem `*`
4. **Identity pattern** — `useIdentity()` com impersonation support
5. **Context resilience** — `useOptionalBuClient()` para rotas públicas

### 3.3 ⚠️ Dívidas Técnicas

| Dívida | Impacto | Prioridade | Ação |
|--------|---------|------------|------|
| **`App.tsx` com 1125 linhas** | Manutenção | P2 | Extrair rotas por módulo |
| **3 módulos incompletos** | Feature | P2 | KPIs, Automations, Integrations |
| **Storybook desatualizado** | DX | P3 | Atualizar stories |
| **Testes E2E parciais** | Qualidade | P2 | Expandir Playwright |

### 3.4 Ação Imediata: Modularizar Rotas

```tsx
// ANTES: App.tsx monolítico (1125 linhas)

// DEPOIS: Extrair para módulos
// src/modules/okrs/routes.tsx
export const okrRoutes = [
  { path: '/okrs', element: <OkrDashboardPage /> },
  { path: '/okrs/org', element: <OrgOkrViewPage /> },
  // ...
];

// App.tsx importa e compõe
import { okrRoutes } from '@/modules/okrs/routes';
```

---

## 📚 4. Documentação

### 4.1 Estado Atual

| Documento | Versão | Status |
|-----------|--------|--------|
| TCR | v2.73.0 | ✅ Atualizado |
| DEVELOPMENT_STANDARDS | v1.17.0 | ✅ |
| DATA_MODEL_REGISTRY | v2.51.0 | ⚠️ Precisa regenerar |
| IDENTITY_CONVENTION | v2.1.1 | ✅ |
| PERMISSIONS_AND_RBAC_MODEL | v1.2.0 | ✅ |

### 4.2 ✅ Pontos Fortes

1. **Hierarquia clara** — `docs/canonical/`, `docs/audits/`, `docs/guides/`
2. **Scripts de auditoria** — 24 scripts automatizados
3. **Data Model Registry** — Fonte única de verdade para schema
4. **Memories consolidadas** — 25+ memories para context carryover

### 4.3 ⚠️ Dívidas

| Dívida | Impacto | Prioridade | Ação |
|--------|---------|------------|------|
| **DATA_MODEL_REGISTRY desatualizado** | Confiabilidade | P1 | Executar `npx tsx scripts/generate-data-model-registry.ts` |
| **Changelog não estruturado** | Rastreabilidade | P3 | Criar CHANGELOG.md formal |
| **Arquivos em docs/archive** | Organização | P4 | Cleanup periódico |

---

## 🔄 5. Rituais e Processos

### 5.1 ✅ O Que Funciona

1. **Pre-checklist obrigatório** — Consultar TCR antes de implementar
2. **Waves sistêmicas** — Batches de melhorias coordenadas
3. **Health reports** — Auditorias periódicas
4. **Scripts de compliance** — Automação de verificações

### 5.2 ⚠️ Lacunas Identificadas

| Lacuna | Impacto | Prioridade | Recomendação |
|--------|---------|------------|--------------|
| **Sem CI/CD gates** | Qualidade | P1 | Adicionar `npm run audit:*` no CI |
| **Reviews manuais** | Velocidade | P2 | Criar checklist automatizado |
| **Sem métricas de performance** | Observabilidade | P2 | Dashboard de Core Web Vitals |
| **Sem runbook de incidentes** | Resiliência | P3 | Documentar procedimentos |

### 5.3 Proposta: CI Gates

```yaml
# .github/workflows/pr-checks.yml
- name: Audit overfetch
  run: npx tsx scripts/audit-overfetch.ts

- name: Audit query keys
  run: npx tsx scripts/audit-querykeys.ts

- name: Audit identity
  run: npx tsx scripts/audit-identity-usage.ts

- name: Audit BU scope
  run: npx tsx scripts/audit-bu-scope.ts

- name: Type check
  run: npm run typecheck

- name: Unit tests
  run: npm run test
```

---

## 🎯 6. Plano de Ação Priorizado

### P1 — Imediato (esta semana)

| # | Item | Esforço | Impacto |
|---|------|---------|---------|
| 1 | Executar `cleanup_old_logs()` | 5min | Alto |
| 2 | Regenerar DATA_MODEL_REGISTRY | 5min | Alto |
| 3 | Configurar CI gates básicos | 2h | Alto |

### P2 — Curto Prazo (próximas 2 semanas)

| # | Item | Esforço | Impacto |
|---|------|---------|---------|
| 4 | Modularizar rotas do App.tsx | 4h | Médio |
| 5 | Expandir testes E2E (Playwright) | 8h | Médio |
| 6 | Implementar rate limiting em Edge Functions | 4h | Alto |
| 7 | Completar módulo KPIs | 16h | Alto |

### P3 — Médio Prazo (próximo mês)

| # | Item | Esforço | Impacto |
|---|------|---------|---------|
| 8 | Migrar `tickets.priority` para ENUM | 2h | Baixo |
| 9 | Criar dashboard de métricas (CWV) | 8h | Médio |
| 10 | Documentar runbook de incidentes | 4h | Médio |
| 11 | Completar módulo Automations | 24h | Alto |

### P4 — Backlog (quando possível)

| # | Item | Esforço | Impacto |
|---|------|---------|---------|
| 12 | Renomear colunas legadas (`owner_user_id` → `owner_profile_id`) | 16h | Baixo |
| 13 | Atualizar Storybook | 8h | Baixo |
| 14 | Implementar circuit breaker | 8h | Médio |
| 15 | Centralizar logs (Loki/Grafana) | 16h | Médio |

---

## 📊 7. Métricas de Saúde Contínua

### KPIs Recomendados

| Métrica | Target | Atual |
|---------|--------|-------|
| RLS coverage | 100% | ✅ 100% |
| Query keys centralizadas | 100% | ✅ 100% |
| Arquivos > 500 linhas | 0 | ⚠️ 1 (App.tsx) |
| Testes E2E coverage | 80% | ~40% |
| Edge Functions com JSDoc | 100% | ✅ 100% |
| Log tables < 100k rows | ✅ | ⚠️ 82k (ai_agent_logs) |

### Dashboard Sugerido

```
┌─────────────────────────────────────────────────────────────┐
│                    HUB HEALTH DASHBOARD                      │
├─────────────────────────────────────────────────────────────┤
│ RLS Coverage:      ████████████████████ 100%                │
│ Query Compliance:  ████████████████████ 100%                │
│ Test Coverage:     ████████░░░░░░░░░░░░ 40%                 │
│ Code Complexity:   █████████████████░░░ 85%                 │
│ Docs Freshness:    ███████████████████░ 95%                 │
│ Log Table Health:  ██████████████░░░░░░ 70% (cleanup needed)│
└─────────────────────────────────────────────────────────────┘
```

---

## 🔒 8. Riscos e Mitigações

### Riscos Identificados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **Logs saturando storage** | Alta | Médio | pg_cron cleanup ativo |
| **App.tsx crescendo** | Média | Médio | Modularizar rotas |
| **Módulos incompletos** | Média | Baixo | Priorizar KPIs |
| **Falta de rate limiting** | Baixa | Alto | Implementar P2 |

### Debt Ratio

```
Technical Debt Score: 11%
├── Database: 5% (logs, 2 RLS warnings)
├── Backend: 10% (rate limiting, circuit breaker)
├── Frontend: 15% (App.tsx, testes)
└── Docs: 5% (DATA_MODEL_REGISTRY)
```

---

## ✅ Conclusão

O Hub da Jet está **saudável e escalável**. As dívidas técnicas identificadas são:

1. **Gerenciáveis** — Nenhuma bloqueia desenvolvimento
2. **Conhecidas** — Documentadas e priorizadas
3. **Planejáveis** — Com ações claras e esforço estimado

**Próxima revisão:** 2026-01-30

---

*Relatório gerado em 2026-01-23 por análise sistêmica automatizada.*
