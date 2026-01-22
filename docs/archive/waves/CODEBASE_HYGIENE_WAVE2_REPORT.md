# Wave 2 — Relatório de Higienização

**Data:** 2026-01-08  
**Status:** ✅ PASS (com pendências documentadas)  
**Responsável:** AI Assistant

---

## 1. Resumo Executivo

| Item | Status | Notas |
|------|--------|-------|
| Migração `job_title` → `job_title_id` | ✅ DONE | 64/64 profiles migrados |
| Imports URL State | ⏸️ DEFERRED | APIs incompatíveis (tuple vs object) |
| `useNotifications` deprecated | ✅ DONE | Marcado como @deprecated |
| Edge Function `send-magic-link` | ⏸️ DEFERRED | Aguarda análise de logs |

---

## 2. Migração job_title → job_title_id

### 2.1 SQL Executado

```sql
-- FASE 1: Criar job_titles ausentes por BU
INSERT INTO job_titles (bu_ids, name, is_active)
SELECT DISTINCT ARRAY[p.bu_id], TRIM(p.job_title), true
FROM profiles p
WHERE p.job_title_id IS NULL
  AND p.job_title IS NOT NULL
  AND p.job_title != ''
  AND p.bu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM job_titles jt
    WHERE p.bu_id = ANY(jt.bu_ids)
      AND LOWER(TRIM(jt.name)) = LOWER(TRIM(p.job_title))
  );

-- FASE 2: Popular profiles.job_title_id
UPDATE profiles p
SET job_title_id = jt.id
FROM job_titles jt
WHERE p.job_title_id IS NULL
  AND p.bu_id = ANY(jt.bu_ids)
  AND LOWER(TRIM(p.job_title)) = LOWER(TRIM(jt.name));

-- FASE 3: Marcar coluna como deprecated
COMMENT ON COLUMN profiles.job_title IS '@deprecated Use job_title_id. Remover após Wave 3.';
```

### 2.2 Métricas

| Métrica | Antes | Depois |
|---------|-------|--------|
| Total profiles | 64 | 64 |
| Com `job_title_id` | 3 | **64** |
| Sem `job_title_id` | 61 | **0** |

### 2.3 Pendências Frontend

O campo `job_title` (texto) ainda é usado em ~30 arquivos. Migração de frontend adiada para Wave 3 pois requer:
- Atualizar interfaces TypeScript
- Modificar queries para join com `job_titles`
- Atualizar componentes de exibição

---

## 3. URL State Migration

### 3.1 Status: DEFERRED

**Motivo:** APIs incompatíveis entre hooks.

- Hook legado (`src/hooks/useUrlState.ts`): Retorna tuple `[value, setValue]`
- Hook novo (`src/shared/url`): Retorna object `{ value, set, reset, isActive }`

**Arquivos afetados:** ~18 páginas

**Decisão:** Manter hook legado como wrapper de compatibilidade. Migração completa requer refatoração de sintaxe em todos os consumidores → Wave 3.

---

## 4. useNotifications

### 4.1 Status: DEPRECATED

Arquivo: `src/hooks/useNotifications.ts`

- ✅ Marcado como `@deprecated`
- ✅ Já usa `useOptionalBuClient` (PRE-BU safe)
- ✅ Já usa RPC centralizado `emit_notification_event`
- Único consumidor: `CheckinDialog.tsx`

**Ação Wave 3:** Mover lógica de `processMentions` para dentro do `CheckinDialog` ou criar helper em `useNotificationCenter`.

---

## 5. Edge Function send-magic-link

### 5.1 Status: DEFERRED

**Motivo:** Requer análise de logs de invocação nos últimos 30 dias.

**Ação:** Verificar via Supabase Dashboard ou analytics query antes de deprecar.

---

## 6. Arquivos Alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useNotifications.ts` | Adicionado `@deprecated` |
| `src/hooks/useAuth.tsx` | Join com `job_titles` via FK |
| DB `profiles.job_title` | Comentário `@deprecated` |
| DB `profiles.job_title_id` | 100% populado |

---

## 7. Audits Executados

| Audit | Status |
|-------|--------|
| `audit-bu-scope.ts` | ⏸️ Manual pendente |
| `audit-identity-usage.ts` | ⏸️ Manual pendente |
| `audit-overfetch.ts` | ⏸️ Manual pendente |
| `audit-url-state.ts` | ⏸️ Manual pendente |
| `audit-prebu-buscoped.ts` | ⏸️ Manual pendente |

**Nota:** Scripts de auditoria devem ser executados manualmente via `npx tsx scripts/<script>.ts`.

---

## 8. Riscos Remanescentes

| Risco | Severidade | Mitigação |
|-------|------------|-----------|
| Frontend ainda usa `job_title` texto | Média | Join funciona; migrar em Wave 3 |
| URL State com API legada | Baixa | Hook wrapper mantém compatibilidade |
| `send-magic-link` pode estar em uso | Baixa | Verificar logs antes de remover |

---

## 9. Próximos Passos (Wave 3)

1. [ ] Migrar frontend para `job_title_id` (join com `job_titles`)
2. [ ] DROP `profiles.job_title` após validação
3. [ ] Migrar sintaxe de URL State (tuple → object)
4. [ ] Remover `useNotifications.ts` após consolidar em `useNotificationCenter`
5. [ ] DROP tabela `metrics`
6. [ ] Analisar e possivelmente remover `send-magic-link`
