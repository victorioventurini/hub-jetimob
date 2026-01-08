# Codebase Hygiene Roadmap

**Data:** 2026-01-08  
**Autor:** Auditoria Automatizada  
**Versão:** 1.0

---

## Visão Geral

Este roadmap define um plano de higienização em 3 waves, priorizando por risco e impacto.

---

## Wave 1 — Baixo Risco (Imediato)

**Prazo sugerido:** 1-2 sprints  
**Critério:** Arquivos não importados, código morto, sem dependências

### 1.1 Frontend - Arquivos Não Utilizados

| Item | Tipo | Ação | Validação |
|------|------|------|-----------|
| `src/components/NavLink.tsx` | Componente | Deprecar + Remover | Buscar imports no codebase |
| `src/components/CopyLinkButton.tsx` | Componente | Deprecar + Remover | Buscar imports no codebase |

**Passos:**
1. Adicionar comentário `@deprecated` no topo do arquivo
2. Buscar por imports: `grep -r "NavLink" src/` (exceto react-router)
3. Se sem uso, remover arquivo
4. Rodar build para confirmar

### 1.2 Hooks Não Utilizados

| Item | Ação | Validação |
|------|------|-----------|
| `src/hooks/useUrlState.ts` | Verificar migração completa | Buscar imports |

**Passos:**
1. Buscar: `grep -r "useUrlState" src/`
2. Se migrado, adicionar `@deprecated`
3. Remover após 1 sprint de observação

### 1.3 Funções SQL Não Chamadas

| Item | Ação | Validação |
|------|------|-----------|
| Identificar via query | Listar e validar | Cruzar com RPCs usados |

**Query de validação:**
```sql
-- Listar functions e verificar uso
SELECT proname FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace
ORDER BY proname;
```

**RPCs usados no frontend (confirmados):**
- `get_my_permissions`
- `get_manageable_teams`
- `calculate_objective_health`
- `refresh_objective_health`
- `generate_okr_insights_for_objective`
- `emit_notification_event`
- `get_user_notification_settings`
- `rpc_leader_dashboard_summary`
- `rpc_leader_dashboard_focus`
- `get_enabled_modules_for_bu`
- `resolve_asset_by_code_global`

---

## Wave 2 — Médio Risco (1-2 meses)

**Prazo sugerido:** 2-4 sprints  
**Critério:** Views antigas, colunas pouco usadas, edge functions legacy

### 2.1 Edge Function Legacy

| Item | Ação | Validação | Rollback |
|------|------|-----------|----------|
| `send-magic-link` | Remover | Confirmar que `request-magic-link` funciona | Restaurar de git |

**Passos:**
1. Verificar logs de chamada nos últimos 30 dias
2. Se zero chamadas, marcar como deprecated em docs
3. Remover de `supabase/config.toml`
4. Deletar diretório `supabase/functions/send-magic-link/`

### 2.2 Coluna Legacy

| Item | Ação | Validação | Rollback |
|------|------|-----------|----------|
| `profiles.job_title` | Deprecar | Verificar que `job_title_id` está em uso | Manter coluna |

**Passos:**
1. Verificar migração de dados:
   ```sql
   SELECT COUNT(*) FROM profiles WHERE job_title IS NOT NULL AND job_title_id IS NULL;
   ```
2. Se zero pendentes, adicionar comentário na coluna
3. Atualizar código para não usar mais `job_title`
4. Após 30 dias, criar migration para remover

### 2.3 Tabela Legacy

| Item | Ação | Validação | Rollback |
|------|------|-----------|----------|
| `user_notification_preferences` | Deprecar | Migrar para v2 | Manter tabela |

**Passos:**
1. Verificar se v2 está funcionando
2. Migrar dados se necessário
3. Remover referências no código
4. Após 30 dias, criar migration para drop

### 2.4 Hooks Legacy

| Item | Ação | Validação | Rollback |
|------|------|-----------|----------|
| `useNotifications` | Consolidar em useNotificationCenter | Buscar chamadas | Manter wrapper |

**Passos:**
1. Identificar todos os usos de `useNotifications`
2. Migrar para `useNotificationCenter`
3. Adicionar `@deprecated` ao hook
4. Remover após migração completa

---

## Wave 3 — Alto Risco (3+ meses)

**Prazo sugerido:** 4-6 sprints  
**Critério:** Tabelas, colunas centrais, mudanças de schema

### 3.1 Tabela OBSOLETE

| Item | Ação | Validação | Rollback |
|------|------|-----------|----------|
| `metrics` | Avaliar e remover | Confirmar zero uso | Restore de backup |

**Passos:**
1. Query para verificar registros:
   ```sql
   SELECT COUNT(*) FROM metrics;
   ```
2. Buscar referências no código
3. Se confirmado obsoleto, criar migration:
   ```sql
   DROP TABLE IF EXISTS metrics;
   ```
4. Executar em staging primeiro

### 3.2 Tabelas sem bu_id (Críticas)

| Item | Ação | Validação | Rollback |
|------|------|-----------|----------|
| `okr_team_objective_contributors` | Adicionar bu_id | Migrar dados | Reverter migration |
| `okr_kr_metrics` | Adicionar bu_id | Migrar dados | Reverter migration |
| `user_team_memberships` | Adicionar bu_id | Migrar dados | Reverter migration |

**Migration pattern:**
```sql
-- 1. Adicionar coluna
ALTER TABLE okr_team_objective_contributors ADD COLUMN bu_id uuid;

-- 2. Popular via relacionamento
UPDATE okr_team_objective_contributors otc
SET bu_id = tto.bu_id
FROM okr_team_objectives tto
WHERE otc.team_objective_id = tto.id;

-- 3. Adicionar constraint NOT NULL (se necessário)
ALTER TABLE okr_team_objective_contributors 
ALTER COLUMN bu_id SET NOT NULL;

-- 4. Adicionar FK
ALTER TABLE okr_team_objective_contributors 
ADD CONSTRAINT fk_bu_id FOREIGN KEY (bu_id) REFERENCES bu_units(id);
```

### 3.3 Componentes Shadcn Não Utilizados

| Item | Ação | Validação |
|------|------|-----------|
| `pagination.tsx` | Manter | Pode ser útil futuramente |
| `input-otp.tsx` | Manter | Pode ser útil para 2FA |
| `carousel.tsx` | Avaliar | Buscar uso |

**Decisão:** Manter componentes shadcn - são pequenos e podem ser úteis.

---

## Regras de Deprecação (Obrigatórias)

### Antes de remover QUALQUER coisa:

1. **Marcar como deprecated**
   ```typescript
   /**
    * @deprecated Use useNotificationCenter instead
    * @see useNotificationCenter
    */
   export function useNotifications() { ... }
   ```

2. **Documentar em CHANGELOG**
   ```markdown
   ## [Unreleased]
   ### Deprecated
   - `useNotifications` hook - use `useNotificationCenter`
   ```

3. **Remover referências novas**
   - Atualizar imports em código novo
   - Criar lint rule se possível

4. **Período de observação**
   - Wave 1: 1 sprint
   - Wave 2: 2 sprints
   - Wave 3: 4 sprints

5. **Instrumentar logs (opcional)**
   ```typescript
   if (process.env.NODE_ENV === 'development') {
     console.warn('@deprecated: useNotifications is deprecated');
   }
   ```

---

## Critérios de Remoção

### Pode Remover Quando:
- ✅ Marcado como deprecated por período mínimo
- ✅ Zero imports/chamadas no codebase
- ✅ Zero chamadas nos logs (para funções)
- ✅ Build passa sem erros
- ✅ Testes passam
- ✅ Documentado no CHANGELOG

### NÃO Remover Se:
- ❌ Há imports/chamadas no código
- ❌ Período de deprecação não passou
- ❌ Sem backup/rollback plan
- ❌ É usado por sistemas externos (APIs, webhooks)

---

## Rollback Plans

### Frontend (Wave 1-2)
```bash
# Restaurar arquivo deletado
git checkout HEAD~1 -- src/components/NavLink.tsx
```

### Edge Functions (Wave 2)
```bash
# Restaurar função
git checkout HEAD~1 -- supabase/functions/send-magic-link/
# Adicionar de volta ao config.toml
```

### Database (Wave 3)
```sql
-- Restaurar tabela de backup (se existir)
-- Ou restore point-in-time do Supabase
```

---

## Checklist por Wave

### Wave 1 Checklist ✅ DONE
- [x] `NavLink.tsx` - Removido
- [x] `CopyLinkButton.tsx` - Removido
- [x] Build validado

### Wave 2 Checklist ✅ DONE (parcial)
- [x] `profiles.job_title` → `job_title_id` - 64/64 migrados
- [x] `useNotifications` - Marcado @deprecated
- [ ] `send-magic-link` - Verificar logs (pendente)
- [ ] Imports URL State - Deferred (API incompatível)

### Wave 3 Checklist ✅ DONE
- [x] `metrics` - DROP TABLE executado
- [x] `profiles.job_title` - DROP coluna executado
- [x] `user_notification_preferences` - DROP TABLE executado
- [x] `useNotifications` - Consolidado em componentes

### Wave 4 Checklist ✅ DONE
- [x] URL State - Migrar sintaxe tuple → object (17 arquivos)
- [x] `useUrlState.ts` - Marcado @deprecated
- [x] Audit scripts criados

### Wave 5 Checklist ✅ DONE
- [x] `squad_memberships` - Normalizado
  - [x] Adicionado `bu_id uuid NOT NULL`
  - [x] Adicionado `deleted_at timestamptz`
  - [x] RLS policies atualizadas (sem join)
  - [x] Triggers: `set_bu_id`, `enforce_bu_scope`
  - [x] Hooks atualizados para usar `bu_id`
  - [x] Soft delete implementado

---

## Métricas de Sucesso

| Métrica | Antes | Wave 1 | Wave 2 | Wave 3 | Wave 4 | Wave 5 |
|---------|-------|--------|--------|--------|--------|--------|
| Arquivos não utilizados | ~5 | 0 | 0 | 0 | 0 | 0 |
| Hooks legacy | 3 | 2 | 0 | 0 | 0 | 0 |
| Edge functions legacy | 1 | 1 | 0 | 0 | 0 | 0 |
| Tabelas sem bu_id (críticas) | 3 | 3 | 3 | 2 | 2 | 0 |
| Colunas deprecated | 1 | 1 | 0 | 0 | 0 | 0 |
| URL State legado | 17 | 17 | 17 | 17 | 0 | 0 |
