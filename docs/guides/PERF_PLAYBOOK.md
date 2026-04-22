# Performance Playbook

Guia para análise e otimização de performance no Hub da Jet.
Atualizado em **W3** com seções de bundle e prefetch.

---

## 1. Scripts de Auditoria

### audit-querykeys.ts
```bash
npx tsx scripts/audit-querykeys.ts
```
Detecta hooks que não usam `queryKeys` de `src/lib/queryKeys.ts`.

### audit-overfetch.ts
```bash
npx tsx scripts/audit-overfetch.ts
```
Detecta `select('*')` e queries sem paginação.

### profile-queries.ts
```bash
npx tsx scripts/profile-queries.ts
```
Gera SQL para `EXPLAIN ANALYZE` das queries críticas.

---

## 2. Rodando EXPLAIN ANALYZE

1. Abra `docs/perf/explain/queries.sql`
2. Substitua placeholders por UUIDs reais
3. Execute no Supabase SQL Editor
4. Analise o plano de execução

### O que procurar:
- ✅ `Index Scan` - bom
- ❌ `Seq Scan` em tabelas grandes - ruim
- ❌ Alto número de `Buffers: shared read` - cache miss

---

## 3. Checklist Antes de PR

- [ ] Não usa `select('*')` sem justificativa
- [ ] Queries em tabelas grandes têm `.limit()` ou `.range()`
- [ ] Usa `queryKeys.*` do arquivo centralizado
- [ ] Não quebra padrão BU scope
- [ ] Não remove índices existentes
- [ ] Componente de lista usa `React.memo`
- [ ] Bundle principal mantém-se <500 KB gzipped (`npm run build`)

---

## 4. Índices Críticos

| Tabela | Índice | Uso |
|--------|--------|-----|
| okr_team_key_results | bu_id_status | Dashboard |
| tickets | bu_id_updated_at | Lista |
| kpi_values | kpi_id_reference_date | Último valor |
| notifications | user_id_is_read | Contador |

---

## 5. Bundle splitting (W3.P3.1)

`vite.config.ts` tem `manualChunks` com cinco grupos:

- `react-vendor` — react / react-dom / react-router / scheduler
- `radix-vendor` — todos os pacotes `@radix-ui/*`
- `query-vendor` — `@tanstack/react-query` + `@supabase/*`
- `chart-vendor` — recharts + date-fns
- `icons-vendor` — lucide-react

Para inspecionar tamanho dos chunks:

```bash
npm run build -- --report
```

Ou abrir `dist/stats.html` se o plugin de visualização estiver ativo.

### Como ler `pg_stat_user_indexes`

```sql
SELECT relname, indexrelname, idx_scan,
       pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE schemaname='public' AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

Índices com `idx_scan=0` por mais de 30 dias são candidatos a drop —
faça antes em ambiente de staging.

---

## 6. Prefetch inteligente (W3.P3.5)

`src/hooks/usePrefetchRoute.ts` define handlers idempotentes para rotas
críticas. O `DynamicSidebar` chama `prefetchRoute(href)` em
`onMouseEnter` / `onFocus`, antecipando dados em ~200–500 ms.

Para adicionar uma nova rota ao prefetch:

1. Adicione um handler em `ROUTE_PREFETCHERS` mantendo a `queryKey` igual
   à do hook real (senão o cache não é reaproveitado).
2. Use `staleTime` ≥ 30 s para evitar refetch desnecessário.
3. Nunca faça mutações; apenas leituras paginadas.

---

## 7. Retenção e cleanup

Ver `docs/perf/RETENTION_POLICY.md`. A função `cleanup_old_logs()` é
chamada periodicamente pelo cron. Janelas após W1:

- `perf_metrics_snapshots`: 30 dias
- `cron_execution_logs`: 14 dias
- `ai_agent_logs`: 60 dias
- `audit_logs`: 180 dias
