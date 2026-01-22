# Relatório de Normalização job_titles (Wave 2.5)

**Data:** 2026-01-08  
**Executor:** Sistema Automatizado  
**Status:** ✅ PASS

---

## Sumário Executivo

A normalização da tabela `job_titles` foi concluída com sucesso. A coluna `bu_ids uuid[]` foi substituída por `bu_id uuid NOT NULL`, seguindo o padrão correto do TCR v2.11.0.

---

## Schema Antes/Depois

### Antes (bu_ids[])

| Coluna | Tipo | Nullable |
|--------|------|----------|
| id | uuid | NO |
| name | text | NO |
| description | text | YES |
| is_active | boolean | NO |
| created_at | timestamptz | NO |
| updated_at | timestamptz | NO |
| deleted_at | timestamptz | YES |
| **bu_ids** | **uuid[]** | **NO** |

### Depois (bu_id)

| Coluna | Tipo | Nullable |
|--------|------|----------|
| id | uuid | NO |
| name | text | NO |
| description | text | YES |
| is_active | boolean | NO |
| created_at | timestamptz | NO |
| updated_at | timestamptz | NO |
| deleted_at | timestamptz | YES |
| **bu_id** | **uuid** | **NO** |

---

## Métricas de Migração

| Métrica | Valor |
|---------|-------|
| Total job_titles migrados | 78 |
| Com exatamente 1 BU (antes) | 78 (100%) |
| Com múltiplas BUs (antes) | 0 |
| job_titles por BU (após) | |
| - BU A (a0000...) | 43 |
| - BU B (f3d2d...) | 35 |

---

## Validações de Integridade

| Query | Resultado | Status |
|-------|-----------|--------|
| `job_titles WHERE bu_id IS NULL` | 0 | ✅ PASS |
| `profiles p JOIN job_titles jt WHERE p.bu_id != jt.bu_id` | 0 | ✅ PASS |
| Duplicatas `(bu_id, lower(name))` | 0 | ✅ PASS |

---

## Arquivos Alterados

### Frontend

| Arquivo | Alteração |
|---------|-----------|
| `src/modules/settings/types.ts` | `bu_ids: string[]` → `bu_id: string` |
| `src/modules/settings/hooks/useJobTitles.ts` | `.contains("bu_ids", [buId])` → `.eq("bu_id", buId)` |

### Database

| Recurso | Alteração |
|---------|-----------|
| Coluna `bu_ids` | REMOVIDA |
| Coluna `bu_id` | ADICIONADA (NOT NULL, FK bu_units) |
| Índice `job_titles_bu_id_name_unique` | CRIADO |
| Trigger `trg_enforce_job_titles_bu_scope` | CRIADO |
| RLS Policies | RECRIADAS com `bu_id` |

---

## RLS Policies (Novas)

```sql
-- SELECT
user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id)

-- INSERT
user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id)

-- UPDATE  
user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id)

-- DELETE
user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id)
```

---

## Alinhamento com TCR

| Requisito | Status |
|-----------|--------|
| `bu_id NOT NULL` em tabelas operacionais | ✅ |
| FK para `bu_units` | ✅ |
| RLS com `user_has_bu_access + is_current_bu` | ✅ |
| Trigger `enforce_bu_scope` | ✅ |
| Índice único por BU | ✅ |
| Frontend sem `select('*')` | ✅ |
| Frontend com campos explícitos | ✅ |

---

## Avisos de Segurança Pendentes

Os seguintes avisos NÃO são relacionados a esta migration e já existiam:

1. **Security Definer Views** (3 views) - Pré-existente
2. **Leaked Password Protection** - Configuração de auth

---

## Próximos Passos

1. ✅ Migration executada
2. ✅ Frontend atualizado
3. ✅ Validações passaram
4. ⏳ Monitorar produção por 7 dias
5. ⏳ Wave 3: Remover `profiles.job_title` (coluna texto legada)

---

## Conclusão

**Status Final: ✅ PASS**

A normalização foi concluída sem perda de dados, sem quebra de funcionalidade e em conformidade com os padrões do Hub da Jet.
