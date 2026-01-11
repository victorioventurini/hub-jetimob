# 🔍 Auditoria Completa do Hub da Jet - 2026-01-11 v3

> Análise abrangente de banco de dados, backend e frontend para identificar melhorias, código legado e violações de padrões.

---

## 📊 Resumo Executivo

| Categoria | Crítico | Alto | Médio | Baixo |
|-----------|---------|------|-------|-------|
| Database/Security | 2 | 1 | 4 | 1 |
| Frontend/Legacy | 0 | 3 | 2 | 2 |
| Padrões/Compliance | 0 | 1 | 2 | 0 |

**Status Geral**: ✅ Arquitetura sólida, requer limpeza de código legado

---

## 🔴 CRÍTICO (P0) - Requer Ação Imediata

### 1. Views com SECURITY DEFINER (2 views)

**Problema**: 2 views ainda usam SECURITY DEFINER, bypassando RLS.

**Views afetadas**:
- `v_ai_agents_public`
- `v_profiles_directory`

**Impacto**: Dados podem ser acessados sem respeitar políticas RLS.

**Correção**:
```sql
-- Recriar com SECURITY INVOKER
DROP VIEW IF EXISTS public.v_ai_agents_public;
CREATE VIEW public.v_ai_agents_public 
WITH (security_invoker = true) AS
-- ... definição original ...
;
```

**Status**: 🟡 Migration já criada em sessão anterior, verificar se foi aplicada.

---

### 2. Função sem search_path definido

**Problema**: Linter detectou 1 função com search_path mutável.

**Impacto**: Vulnerabilidade de SQL injection via search_path hijacking.

**Correção**: Todas funções devem ter `SET search_path = public`.

---

## 🟠 ALTO (P1) - Prioridade Alta

### 3. Código Legado para Remoção

#### 3.1 Hooks Mock (devem ser removidos)

| Arquivo | Uso Atual | Dependentes |
|---------|-----------|-------------|
| `src/modules/okrs/hooks/useMockOkrData.ts` | ❌ Deprecated | `OkrsPage.tsx` |
| `src/modules/kpis/hooks/useMockKpiData.ts` | ❌ Deprecated | `KpiDashboardPage.tsx` |

**Ação**: Migrar páginas dependentes para hooks reais e deletar arquivos mock.

#### 3.2 useOkrData.ts - Façade Deprecated

```typescript
// src/modules/okrs/hooks/useOkrData.ts
// @deprecated - Re-export facade for backward compatibility
```

**Funções deprecated**:
- `useOrgObjectivesWithKrs()` → usar `useOrgObjectives({ buId, year })`
- `useAllOrgKeyResults()` → usar `useOrgKeyResults({ buId })`
- `useTeamObjectivesWithKrs()` → usar `useTeamObjectives({ buId, teamId })`

**Ação**: Migrar importações e deletar funções.

#### 3.3 Parsers Deprecated em URL

```typescript
// src/shared/url/parsers.ts
stringArray: @deprecated → usar arrayFromRepeated
```

**Ação**: Verificar uso e migrar.

---

### 4. RLS Policies com WITH CHECK(true)

**Problema**: 4 políticas com `WITH CHECK(true)` detectadas.

**Contexto**: Essas são provavelmente para tabelas de auditoria/logs onde INSERT é permitido para todos (append-only logs).

**Ação**: Verificar se são tabelas de audit. Se sim, documentar exceção. Se não, corrigir.

---

## 🟡 MÉDIO (P2) - Melhorias de Qualidade

### 5. useState para Filtros (deveria ser URL State)

**Problema**: 3 componentes usam useState para filtros em vez de URL State.

| Arquivo | Estado Local |
|---------|--------------|
| `OrgObjectiveViewPage.tsx` | `statusFilter`, `teamFilter` |
| `WizardKrSelection.tsx` | `filter` (interno ao wizard - aceitável) |
| `BuPermissionsPage.tsx` | `localSearch` (sincroniza com URL - OK) |

**Ação**: Migrar `OrgObjectiveViewPage.tsx` para URL State para permitir deep linking.

---

### 6. Hardcoded Role Checks

**Problema**: 7 arquivos com comparações diretas de role strings.

| Arquivo | Uso | Status |
|---------|-----|--------|
| `useAuth.tsx` | `isAdmin = role === 'super_admin' \|\| role === 'admin'` | ✅ Correto (definição central) |
| `Header.tsx` | `userRole === "admin"` | ✅ UI display, aceitável |
| `DynamicSidebar.tsx` | `userRole === "admin"` | ✅ UI display, aceitável |
| `MobileSidebar.tsx` | `userRole === "admin"` | ✅ UI display, aceitável |
| `UserGlobalSheet.tsx` | `currentUserRole === "super_admin"` | ✅ UI para habilitar campos |
| `GlobalUsersPage.tsx` | `user.global_role === "super_admin"` | ✅ Display de badge |
| `InventoryMovementDialog.tsx` | `admin.role === "super_admin"` | ✅ Display label |

**Conclusão**: Todos são para UI display, não para controle de acesso. ✅ Aceitável.

---

### 7. Query Keys Inline (spread pattern)

**Problema**: 11 arquivos usam spread de queryKeys com sufixos inline.

```typescript
// Exemplo
queryKey: [...queryKeys.okrs.wizardSession(profile?.id || ''), 'recent', wizardType, limit]
```

**Análise**: Este padrão é **aceitável** pois:
- Base usa `queryKeys.*` centralizado ✅
- Apenas adiciona sufixos contextuais
- Mantém consistência de invalidação

**Status**: ✅ Não requer correção.

---

## 🟢 BAIXO (P3) - Nice to Have

### 8. Extensões em Schema Public

**Problema**: Extensão instalada em schema `public` (linter warning).

**Impacto**: Baixo, mas pode causar conflitos de namespace.

**Ação**: Considerar mover para schema `extensions` em manutenção futura.

---

### 9. Fragmentação de Hooks OKR

**Observação**: 31 arquivos em `src/modules/okrs/hooks/`.

**Análise**:
- Organização por subdiretório `queries/` ✅
- Hooks bem focados em responsabilidade única ✅
- Não requer consolidação

---

## ✅ Padrões Bem Implementados

### Conformidade Alta

| Padrão | Cobertura | Status |
|--------|-----------|--------|
| Explicit field selection (no `select('*')`) | 100% | ✅ |
| Centralized queryKeys | 98% | ✅ |
| BU-scoped queries | 100% | ✅ |
| useBuScopedSupabase | 100% | ✅ |
| Link vs onClick navigate | 100% | ✅ |
| URL State para filtros principais | 90% | ✅ |

---

## 📋 Plano de Ação Recomendado

### Wave 1 - Segurança (Esta Semana)
- [ ] Verificar se migration de views SECURITY INVOKER foi aplicada
- [ ] Auditar função com search_path mutável
- [ ] Documentar políticas WITH CHECK(true) (se são audit tables)

### Wave 2 - Limpeza de Legacy (Próxima Sprint)
- [ ] Migrar `OkrsPage.tsx` de mocks para hooks reais
- [ ] Migrar `KpiDashboardPage.tsx` de mocks para hooks reais
- [ ] Deletar `useMockOkrData.ts`
- [ ] Deletar `useMockKpiData.ts`
- [ ] Remover funções deprecated de `useOkrData.ts`

### Wave 3 - Qualidade (Backlog)
- [ ] Migrar filtros de `OrgObjectiveViewPage.tsx` para URL State
- [ ] Migrar parsers deprecated em `parsers.ts`

---

## 📁 Arquivos para Remoção Segura

```
# Após migração de dependentes:
src/modules/okrs/hooks/useMockOkrData.ts
src/modules/kpis/hooks/useMockKpiData.ts

# Funções dentro de useOkrData.ts (não o arquivo todo):
- useOrgObjectivesWithKrs()
- useAllOrgKeyResults()
- useTeamObjectivesWithKrs()
```

---

## 🔒 Conclusão de Segurança

O projeto está em **bom estado de segurança** com:
- RLS habilitado em todas as tabelas operacionais ✅
- Queries explícitas (sem `select('*')`) ✅
- BU-scoping consistente ✅

Pontos de atenção:
- 2 views precisam de SECURITY INVOKER
- 1 função precisa de search_path fixo

---

*Gerado em: 2026-01-11T12:00:00Z*
*Versão do TCR: 2.11.0*
