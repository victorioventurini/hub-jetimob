# Performance Phase 2 Report

> **Data:** 2026-01-07  
> **Versão:** 2.0.0  
> **Status:** ✅ COMPLETO

---

## Resumo Executivo

A Fase 2 de Performance implementou otimizações de banco de dados, padrões de queries e scripts de auditoria para melhorar a performance do Hub mantendo 100% de conformidade com o TCR v2.8.0.

### Entregas

| Item | Status | Descrição |
|------|--------|-----------|
| Scripts de Auditoria | ✅ Completo | 3 scripts criados |
| Migration de Índices | ✅ PASS | 20+ índices criados (schema-safe) |
| View de Report | ✅ Completo | v_perf_indexes_report |
| Documentação | ✅ Completo | Reports e playbook |

---

## 1. Scripts de Auditoria

### 1.1 audit-querykeys.ts
Detecta hooks que não usam queryKeys centralizadas.

```bash
npx tsx scripts/audit-querykeys.ts
```

### 1.2 audit-overfetch.ts
Detecta queries com select('*') ou sem paginação.

```bash
npx tsx scripts/audit-overfetch.ts
```

### 1.3 profile-queries.ts
Gera SQL para EXPLAIN ANALYZE das queries críticas.

```bash
npx tsx scripts/profile-queries.ts
```

---

## 2. Índices Criados (Schema-Safe)

A migration foi aplicada com verificação de existência de colunas antes de criar cada índice.

### Por Módulo

| Módulo | Índices | Tabelas |
|--------|---------|---------|
| Profiles | 2 | profiles |
| Teams | 1 | teams |
| OKRs | 4 | okr_org_objectives, okr_team_key_results, okr_checkins |
| Tickets | 4 | tickets, ticket_messages, ticket_categories |
| Assets | 2 | asset_keyrings, asset_key_movements |
| KPIs | 2 | kpi_metrics, kpi_values |
| Notifications | 4 | notifications, notification_outbox |

### Índices Críticos para Performance

1. **idx_okr_team_key_results_bu_status** - Dashboard OKR summary (RAG counts)
2. **idx_tickets_bu_updated_at** - Lista de tickets ordenada
3. **idx_kpi_values_kpi_date_desc** - Último valor KPI
4. **idx_notifications_user_read** - Contador de não lidas
5. **idx_okr_checkins_kr_date_desc** - Último check-in por KR

### View de Monitoramento

```sql
SELECT * FROM v_perf_indexes_report;
```

---

## 3. Queries Críticas Identificadas

| Query | Módulo | Impacto | Índice |
|-------|--------|---------|--------|
| OKR RAG Summary | Home | Alto | idx_okr_team_key_results_bu_status |
| Pending Checkins | Home | Alto | idx_okr_team_kr_checkin |
| Tickets List | Tickets | Alto | idx_tickets_bu_updated_at |
| Ticket Messages | Tickets | Alto | idx_ticket_messages_ticket_created |
| KPI Last Value | KPIs | Médio | idx_kpi_values_kpi_date_desc |
| Unread Count | Notifications | Alto | idx_notifications_user_read |

---

## 4. Conformidade TCR

| Requisito | Status |
|-----------|--------|
| BU Scope mantido | ✅ |
| RLS hardened | ✅ |
| useBuScopedSupabase | ✅ |
| Links /go/:entity/:id | ✅ |
| Soft delete pattern | ✅ |
| Índices parciais WHERE deleted_at IS NULL | ✅ |

---

## 5. Próximos Passos (Fase 2.1)

- [ ] Criar RPC `get_home_dashboard_data` para reduzir roundtrips
- [ ] Implementar paginação em ticket messages
- [ ] Adicionar FTS (tsvector) para global search
- [ ] Virtualização de listas longas

---

## Assinaturas

- **Autor:** Lovable AI
- **Data:** 2026-01-07
- **Migration:** perf_phase2_indexes_safe.sql
