# Performance Phase 2 Report

> **Data:** 2026-01-07  
> **Versão:** 1.0.0  
> **Status:** 🟡 EM PROGRESSO

---

## Resumo Executivo

A Fase 2 de Performance implementa otimizações de banco de dados, padrões de queries e scripts de auditoria para melhorar a performance do Hub sem quebrar os padrões do TCR v2.8.0.

### Entregas

| Item | Status | Descrição |
|------|--------|-----------|
| Scripts de Auditoria | ✅ Completo | 3 scripts criados |
| Migration de Índices | ✅ Completo | 20+ índices criados |
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

## 2. Índices Criados

### Por Módulo

| Módulo | Índices | Tabelas |
|--------|---------|---------|
| Profiles | 2 | profiles |
| Teams | 1 | teams |
| OKRs | 4 | okr_org_objectives, okr_team_key_results, okr_checkins |
| Tickets | 4 | tickets, ticket_messages |
| Assets | 4 | asset_inventory, asset_movements, asset_keyrings |
| KPIs | 2 | kpi_metrics, kpi_values |
| Notifications | 2 | notifications, notification_outbox |

### Índices Críticos

1. **idx_okr_team_key_results_bu_id_status** - Dashboard OKR summary
2. **idx_tickets_bu_id_updated_at** - Lista de tickets
3. **idx_kpi_values_kpi_id_reference_date** - Último valor KPI
4. **idx_notifications_user_id_is_read** - Contador de não lidas

---

## 3. Queries Críticas Identificadas

| Query | Módulo | Impacto |
|-------|--------|---------|
| home_okr_summary | Home | Alto |
| home_birthdays | Home | Médio |
| tickets_list | Tickets | Alto |
| ticket_messages | Tickets | Alto |
| kpi_values_history | KPIs | Médio |
| notifications_unread | Notifications | Alto |

---

## 4. Próximos Passos

### Fase 2.1 (Próximo)
- [ ] Criar RPC `get_home_dashboard_data` para reduzir roundtrips
- [ ] Implementar paginação em ticket messages
- [ ] Adicionar FTS (tsvector) para global search

### Fase 2.2 (Futuro)
- [ ] Virtualização de listas longas
- [ ] Prefetch de dados ao trocar BU
- [ ] Cache headers em Edge Functions públicas

---

## 5. Conformidade TCR

| Requisito | Status |
|-----------|--------|
| BU Scope mantido | ✅ |
| RLS hardened | ✅ |
| useBuScopedSupabase | ✅ |
| Links /go/:entity/:id | ✅ |
| Soft delete pattern | ✅ |

---

## Assinaturas

- **Autor:** Lovable AI
- **Data:** 2026-01-07
