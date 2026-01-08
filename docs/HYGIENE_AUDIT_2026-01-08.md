# Auditoria de Higienização — 2026-01-08

**Versão:** 1.0  
**Base:** TCR v2.11.0 + DEVELOPMENT_STANDARDS.md  
**Status:** 🔄 Em andamento

---

## 1. Resumo Executivo

| Categoria | Achados | Safe to Delete | Needs Migration | Keep |
|-----------|---------|----------------|-----------------|------|
| Colunas Legadas | 1 | 0 | 1 | 0 |
| Tabelas Suspeitas | 5 | 1 | 2 | 2 |
| Edge Functions | 1 | 0 | 1 | 0 |
| Hooks Legados | 2 | 0 | 2 | 0 |
| Componentes | 0 | - | - | - |
| URL State Issues | 3 | 0 | 3 | 0 |

**Wave 1 já executada:** `NavLink.tsx` e `CopyLinkButton.tsx` removidos ✅

---

## 2. Achados Detalhados

### 2.1 Colunas Legadas

#### `profiles.job_title` (TEXT) — **NEEDS MIGRATION**

| Atributo | Valor |
|----------|-------|
| **Status** | LEGACY |
| **Risco** | Médio |
| **Classificação** | NEEDS MIGRATION |
| **Dependências** | ~30+ arquivos (frontend, edge functions, migrations) |

**Dados atuais:**
```
Total profiles: 64
Com job_title (texto): 63
Com job_title_id (FK): 3
Apenas texto (sem FK): 61 ⚠️
```

**Problema:** 95% dos profiles ainda usam o campo texto legado, não a FK para `job_titles`.

**Impacto em:**
- RLS: Nenhum (campo não usado em policies)
- RBAC: Nenhum
- BU Scope: `job_titles.bu_id` exige migração por BU

**Ação requerida:**
1. Migrar dados de `job_title` → `job_title_id`
2. Atualizar código progressivamente
3. Após 100% migrado, remover coluna

**SQL de migração (Wave 2):**
```sql
-- Migrar profiles para job_title_id baseado no texto existente
UPDATE profiles p
SET job_title_id = jt.id
FROM job_titles jt
WHERE p.job_title_id IS NULL
  AND p.bu_id = jt.bu_id
  AND LOWER(TRIM(p.job_title)) = LOWER(TRIM(jt.name));
```

---

### 2.2 Tabelas Suspeitas

#### `metrics` — **SAFE TO DELETE**

| Atributo | Valor |
|----------|-------|
| **Status** | OBSOLETE |
| **Risco** | Baixo |
| **Classificação** | SAFE TO DELETE |
| **Dependências** | Nenhuma detectada |

**Recomendação:** Remover em Wave 3 após backup.

---

#### `user_notification_preferences` — **NEEDS MIGRATION**

| Atributo | Valor |
|----------|-------|
| **Status** | LEGACY |
| **Risco** | Médio |
| **Classificação** | NEEDS MIGRATION |
| **Dependências** | Sistema de notificações v1 |

**Recomendação:** Migrar para `user_notification_settings` (v2) antes de remover.

---

#### `okr_dependencies` — **KEEP**

| Atributo | Valor |
|----------|-------|
| **Status** | SUSPECT |
| **Risco** | Baixo |
| **Classificação** | KEEP |
| **Justificativa** | Feature de dependências OKR planejada |

---

#### `okr_coaching_events` — **KEEP**

| Atributo | Valor |
|----------|-------|
| **Status** | SUSPECT |
| **Risco** | Baixo |
| **Classificação** | KEEP |
| **Justificativa** | Feature de coaching OKR planejada |

---

#### `squad_memberships` — **NEEDS MIGRATION**

| Atributo | Valor |
|----------|-------|
| **Status** | SUSPECT |
| **Risco** | Médio |
| **Classificação** | NEEDS MIGRATION |
| **Dependências** | Avaliar se migrado para `user_team_memberships` |

---

### 2.3 Edge Functions Legadas

#### `send-magic-link` — **NEEDS MIGRATION**

| Atributo | Valor |
|----------|-------|
| **Status** | LEGACY |
| **Risco** | Baixo |
| **Classificação** | NEEDS MIGRATION |
| **Dependências** | `request-magic-link` (função substituta) |

**Impacto em:**
- RLS: Nenhum
- RBAC: Nenhum
- BU Scope: Nenhum

**Ação:** Verificar logs de invocação. Se zero chamadas em 30 dias, pode remover.

---

### 2.4 Hooks Legados

#### `src/hooks/useUrlState.ts` — **NEEDS MIGRATION**

| Atributo | Valor |
|----------|-------|
| **Status** | LEGACY (wrapper) |
| **Risco** | Baixo |
| **Classificação** | NEEDS MIGRATION |
| **Dependências** | ~15+ páginas ainda importam daqui |

**Páginas a migrar:**
- `src/modules/kpis/pages/KpiDashboardPage.tsx`
- `src/modules/okrs/pages/OkrsPage.tsx`
- `src/pages/Users.tsx`
- (outras)

**Nova localização:** `@/shared/url`

---

#### `src/hooks/useNotifications.ts` — **NEEDS MIGRATION**

| Atributo | Valor |
|----------|-------|
| **Status** | LEGACY |
| **Risco** | Médio |
| **Classificação** | NEEDS MIGRATION |
| **Dependências** | `useNotificationCenter` (consolidar) |

---

### 2.5 URL State Issues (Estados que deveriam ser URL)

| Arquivo | Estado Local | Deveria Ser URL | Risco |
|---------|--------------|-----------------|-------|
| `KpiDashboardPage.tsx` | ✅ Usa `useUrlState` | - | OK |
| `OkrsPage.tsx` | ✅ Usa `useUrlState` | - | OK |
| `Users.tsx` | ✅ Usa `useUrlState` | - | OK |

**Nota:** URLs de filtro estão corretas, mas importam do local legado.

---

### 2.6 Policies RLS

**Verificação:** Nenhuma policy duplicada ou incoerente encontrada.

**Padrão consistente:**
- `*_admin` → ALL para super_admin/admin/bu_admin
- `*_select` → SELECT para membros da BU
- Tabelas usam `is_bu_member()` corretamente

---

### 2.7 Permission Keys

**Status:** 70+ keys ativas no `permission_catalog`.

**Verificação pendente:** Auditar se todas as keys estão sendo usadas via `scripts/audit-permission-keys.ts`.

---

## 3. Ordem de Remoção Recomendada

### Wave 1 — ✅ CONCLUÍDA
- [x] `NavLink.tsx` removido
- [x] `CopyLinkButton.tsx` removido

### Wave 2 — Em Planejamento
| Item | Tipo | Ação | Prazo |
|------|------|------|-------|
| `send-magic-link` | Edge Function | Verificar + Remover | 2 sprints |
| `profiles.job_title` | Coluna DB | Migrar dados | 2-4 sprints |
| `useUrlState.ts` imports | Hook | Migrar imports | 1 sprint |
| `useNotifications.ts` | Hook | Consolidar | 2 sprints |

### Wave 3 — Futuro
| Item | Tipo | Ação | Prazo |
|------|------|------|-------|
| `metrics` | Tabela DB | DROP | 4+ sprints |
| `user_notification_preferences` | Tabela DB | Migrar + DROP | 4+ sprints |
| `squad_memberships` | Tabela DB | Avaliar | 4+ sprints |

---

## 4. Migrações SQL Necessárias

### Wave 2: job_title → job_title_id

```sql
-- FASE 1: Criar job_titles ausentes por BU
INSERT INTO job_titles (bu_id, name, is_active)
SELECT DISTINCT p.bu_id, TRIM(p.job_title), true
FROM profiles p
WHERE p.job_title_id IS NULL
  AND p.job_title IS NOT NULL
  AND p.job_title != ''
  AND p.bu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM job_titles jt 
    WHERE jt.bu_id = p.bu_id 
    AND LOWER(TRIM(jt.name)) = LOWER(TRIM(p.job_title))
  )
ON CONFLICT DO NOTHING;

-- FASE 2: Popular FK
UPDATE profiles p
SET job_title_id = jt.id
FROM job_titles jt
WHERE p.job_title_id IS NULL
  AND p.bu_id = jt.bu_id
  AND LOWER(TRIM(p.job_title)) = LOWER(TRIM(jt.name));

-- FASE 3 (após código migrado): Adicionar comentário deprecation
COMMENT ON COLUMN profiles.job_title IS '@deprecated Use job_title_id. Remover em 2026-Q2.';

-- FASE 4 (após validação): Drop column
-- ALTER TABLE profiles DROP COLUMN job_title;
```

### Wave 3: Drop metrics

```sql
-- Backup antes (rodar manualmente se necessário)
-- CREATE TABLE metrics_backup AS SELECT * FROM metrics;

DROP TABLE IF EXISTS metrics;
```

---

## 5. Checklist de Validação Pós-Remoção

### Após Wave 2

- [ ] `npx tsc --noEmit` passa sem erros
- [ ] Build completo funciona
- [ ] Busca por `job_title` retorna apenas `job_title_id` ou joins
- [ ] `send-magic-link` não aparece em logs (30 dias)
- [ ] Imports de `@/hooks/useUrlState` migrados para `@/shared/url`

### Após Wave 3

- [ ] Tabela `metrics` não existe
- [ ] Nenhuma referência a `metrics` no código
- [ ] Backup confirmado antes do DROP

---

## 6. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Remoção de `job_title` quebra onboarding | Alto | Migrar 100% dos dados antes |
| Edge function `send-magic-link` ainda em uso | Médio | Verificar logs 30 dias |
| Import legado de useUrlState esquecido | Baixo | Script de auditoria |

---

## 7. Próximas Ações

1. **Imediato:** Executar migração de `profiles.job_title` → `job_title_id`
2. **Sprint 1:** Migrar imports de `useUrlState` para `@/shared/url`
3. **Sprint 2:** Verificar logs de `send-magic-link` e decidir remoção
4. **Sprint 3-4:** Consolidar `useNotifications` → `useNotificationCenter`

---

## Referências

- `docs/TECHNICAL_CONTEXT_REGISTRY.md` v2.11.0
- `docs/engineering/DEVELOPMENT_STANDARDS.md`
- `docs/CODEBASE_HYGIENE_ROADMAP.md`
- `docs/LEGACY_CLASSIFICATION_MATRIX.md`
- `docs/HYGIENE_WAVE1_REPORT.md`
