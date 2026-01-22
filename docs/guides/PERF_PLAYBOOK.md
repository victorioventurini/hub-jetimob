# Performance Playbook

Guia para análise e otimização de performance no Hub da Jet.

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

---

## 4. Índices Críticos

| Tabela | Índice | Uso |
|--------|--------|-----|
| okr_team_key_results | bu_id_status | Dashboard |
| tickets | bu_id_updated_at | Lista |
| kpi_values | kpi_id_reference_date | Último valor |
| notifications | user_id_is_read | Contador |
