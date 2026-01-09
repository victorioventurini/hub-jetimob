# Data Model Registry Audit — Guia de Uso

**Versão:** 1.0.0  
**Data:** 2026-01-09

---

## Objetivo

O audit script `audit-sql-against-registry.ts` valida que todas as referências a tabelas, views e funções no código correspondem a objetos reais definidos no `DATA_MODEL_REGISTRY.json`.

**Previne:**
- Referências a tabelas inexistentes
- Uso de objetos removidos/deprecated
- Typos em nomes de tabelas/funções
- Inconsistências entre código e schema

---

## Como Rodar Localmente

```bash
# Básico
npx tsx scripts/audit-sql-against-registry.ts

# Com detalhes
npx tsx scripts/audit-sql-against-registry.ts --verbose

# Apenas warnings (não falha em erros)
npx tsx scripts/audit-sql-against-registry.ts --warn-only
```

**Exit codes:**
- `0`: PASS (sem erros blocking)
- `1`: FAIL (erros encontrados)

---

## O Que é Validado

### Migrations SQL (`supabase/migrations/**/*.sql`)

| Padrão | Exemplo |
|--------|---------|
| `FROM table` | `SELECT * FROM profiles` |
| `JOIN table` | `JOIN teams ON ...` |
| `INSERT INTO table` | `INSERT INTO okr_checkins` |
| `UPDATE table` | `UPDATE tickets SET ...` |
| `DELETE FROM table` | `DELETE FROM mentions` |
| `ALTER TABLE table` | `ALTER TABLE profiles ADD ...` |
| `CREATE TABLE table` | `CREATE TABLE new_table` |
| `DROP TABLE table` | `DROP TABLE old_table` |
| `CREATE FUNCTION func` | `CREATE FUNCTION my_func()` |
| `EXECUTE FUNCTION func` | `EXECUTE FUNCTION trigger_fn()` |

### Edge Functions (`supabase/functions/**/*.ts`)

| Padrão | Exemplo |
|--------|---------|
| `.from('table')` | `supabase.from('profiles')` |
| `.rpc('function')` | `supabase.rpc('get_cycle_checkins')` |

---

## Como Atualizar o Registry

Quando o schema mudar (nova migration), regenere o registry:

```bash
SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." \
npx tsx scripts/generate-data-model-registry.ts
```

**Quando regenerar:**
- Após cada migration que cria/remove tabelas
- Após adicionar/remover views
- Após criar novas funções SQL

---

## Allowlist e Ignorelist

O arquivo `scripts/registry-audit-config.json` controla exceções:

```json
{
  "ignore_paths": [
    "docs/qa/**",
    "docs/archive/**"
  ],
  
  "allow_schemas": [
    "auth",
    "storage",
    "realtime"
  ],
  
  "allow_tokens": [
    "pg_catalog",
    "information_schema"
  ],
  
  "allow_unknown_patterns": [
    "auth.users",
    "storage.objects"
  ]
}
```

### Quando Adicionar ao Allowlist

| Cenário | Ação |
|---------|------|
| Referência a `auth.users` | ✅ Já está no allowlist |
| Referência a tabela de sistema PG | ✅ Já está no allowlist |
| Referência a tabela de outro projeto | ❌ Refatorar código |
| Typo no nome da tabela | ❌ Corrigir typo |
| Tabela foi removida | ❌ Atualizar código para usar nova tabela |

---

## Lidando com Erros

### Erro: "Unknown table not found in registry"

```
❌ supabase/migrations/001_create_foo.sql:15
   Unknown table: "foo_bar" not found in registry
   💡 Check DATA_MODEL_REGISTRY.md for valid names.
```

**Soluções:**

1. **Typo:** Corrija o nome da tabela
2. **Nova tabela:** Adicione ao registry (regenere)
3. **Tabela de sistema:** Adicione ao allowlist

### Erro: "Reference to REMOVED table"

```
❌ supabase/functions/my-func/index.ts:42
   Reference to REMOVED table: "old_permissions"
   💡 This object was removed. Check DATA_MODEL_REGISTRY.md.
```

**Solução:** Migre o código para usar a tabela substituta.

### Erro: "Reference to DEPRECATED table"

```
⚠️  supabase/migrations/002_update.sql:8
   Reference to DEPRECATED table: "legacy_roles"
   💡 Consider migrating to the replacement object.
```

**Solução:** Planeje migração para a nova estrutura.

---

## CI/CD Integration

O workflow `.github/workflows/schema-registry-audit.yml` roda automaticamente em PRs que modificam:

- `supabase/migrations/**`
- `supabase/functions/**`
- `docs/engineering/**`

**Comportamento:**
- ❌ PR é bloqueado se houver erros
- ⚠️ Warnings são mostrados mas não bloqueiam
- ✅ PR pode ser mergeado se passar

---

## Exemplos de Output

### PASS
```
========================================
  Data Model Registry Audit v1.0.0
========================================

🔍 Scanning migrations...
   Found 45 migration files
🔍 Scanning edge functions...
   Found 12 function files

========================================
  SUMMARY
========================================
  Errors:   0
  Warnings: 0

✅ All references are valid!
```

### FAIL
```
========================================
  Data Model Registry Audit v1.0.0
========================================

🔍 Scanning migrations...
   Found 45 migration files
🔍 Scanning edge functions...
   Found 12 function files

❌ ERRORS (blocking):

❌ supabase/migrations/20260109_add_feature.sql:23
   Unknown table: "user_settigns" not found in registry
   💡 Check DATA_MODEL_REGISTRY.md for valid names. Did you mean "user_settings"?

❌ supabase/functions/process-data/index.ts:15
   Unknown table: "old_profiles" not found in registry
   💡 Check DATA_MODEL_REGISTRY.md for valid names.

========================================
  SUMMARY
========================================
  Errors:   2
  Warnings: 0

❌ FAIL - Fix errors before merging

📚 See: docs/engineering/DATA_MODEL_REGISTRY_AUDIT.md
```

---

## FAQ

### Por que meu PR está falhando?

1. Verifique o nome exato da tabela no `DATA_MODEL_REGISTRY.md`
2. Se for nova tabela, regenere o registry
3. Se for tabela de sistema, adicione ao allowlist com justificativa

### Como lidar com SQL dinâmico?

```typescript
// ❌ Evite: SQL dinâmico não pode ser validado
const tableName = getTableName();
await supabase.from(tableName).select('*');

// ✅ Prefira: Referências estáticas
await supabase.from('profiles').select('*');
```

### O audit é lento?

O script é otimizado para rodar em <10s. Se estiver lento:
- Verifique se há muitos arquivos ignoráveis
- Adicione paths ao `ignore_paths` no config

---

## Referências

- [DATA_MODEL_REGISTRY.md](./DATA_MODEL_REGISTRY.md) — Registry canônico
- [generate-data-model-registry.ts](../../scripts/generate-data-model-registry.ts) — Gerador
- [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md) — Padrões de desenvolvimento
