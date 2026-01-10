# QA: Performance Sweep P1

## Objetivo
Validar que as correções de performance P1 foram aplicadas corretamente e não introduziram regressões.

---

## Checklist de Validação

### Build & Typecheck

| Item | Comando | Status |
|------|---------|--------|
| Build | `npm run build` | [ ] PASS / [ ] FAIL |
| Typecheck | `npm run typecheck` | [ ] PASS / [ ] FAIL |

---

### Audits Automatizados

| Audit | Comando | Resultado Esperado | Status |
|-------|---------|-------------------|--------|
| Overfetch | `npx tsx scripts/audit-overfetch.ts` | 0 críticos nos arquivos P1 | [ ] PASS / [ ] FAIL |
| QueryKeys | `npx tsx scripts/audit-querykeys.ts` | 0 nos arquivos tocados | [ ] PASS / [ ] FAIL |
| Identity | `npm run audit:identity` | Sem violações | [ ] PASS / [ ] FAIL |
| BU Scope | `npx tsx scripts/audit-bu-scope.ts` | Sem violações | [ ] PASS / [ ] FAIL |

---

### Testes Funcionais

#### Settings Pages

| Cenário | Passos | Esperado | Status |
|---------|--------|----------|--------|
| Navegar Settings | 1. Login → 2. Settings → 3. Tabs | Carrega sem erro | [ ] PASS / [ ] FAIL |
| Business Units | 1. Settings → BUs → 2. Listar | Lista carrega | [ ] PASS / [ ] FAIL |
| Módulos | 1. Settings → Módulos | Lista carrega | [ ] PASS / [ ] FAIL |
| Integrações | 1. Settings → Integrações | Lista carrega | [ ] PASS / [ ] FAIL |

#### OKRs

| Cenário | Passos | Esperado | Status |
|---------|--------|----------|--------|
| ObjectiveTimeline | 1. Abrir objetivo → 2. Ver timeline | Timeline carrega sem travar | [ ] PASS / [ ] FAIL |
| Wizard OKR | 1. Iniciar wizard → 2. Navegar steps | Sem travamento/refetch loop | [ ] PASS / [ ] FAIL |
| Ciclos | 1. OKR Settings → Ciclos | Lista carrega | [ ] PASS / [ ] FAIL |

#### Troca de BU

| Cenário | Passos | Esperado | Status |
|---------|--------|----------|--------|
| Troca de BU | 1. Select BU → 2. Trocar para outra | Cache limpo, dados atualizados | [ ] PASS / [ ] FAIL |
| Filtros após troca | 1. Trocar BU → 2. Navegar com filtros | URL state funciona | [ ] PASS / [ ] FAIL |

---

### Performance

| Métrica | Antes | Depois | Status |
|---------|-------|--------|--------|
| Payload ObjectiveTimeline | ~50KB+ | ~15KB (estimado) | [ ] Melhorado |
| Payload SettingsModules | ~20KB+ | ~8KB (estimado) | [ ] Melhorado |
| Edge Functions response | select(*) | Campos explícitos | [ ] Melhorado |

---

## Arquivos Modificados

### Settings (5 arquivos)
- `src/modules/bu/hooks/useBuData.ts`
- `src/pages/settings/SettingsModules.tsx`
- `src/pages/settings/SettingsBusinessUnits.tsx`
- `src/pages/settings/SettingsIntegrations.tsx`
- `src/modules/permissions/hooks/usePermissionGovernance.ts`

### Edge Functions (3 arquivos)
- `supabase/functions/process-agent-document/index.ts`
- `supabase/functions/culture-message/index.ts`
- `supabase/functions/_shared/instruction-sources.ts`

### OKRs (3 arquivos)
- `src/modules/okrs/components/ObjectiveTimeline.tsx`
- `src/modules/okrs/components/wizards/collaborator/CollaboratorInitiativesStep.tsx`
- `src/modules/okrs/components/settings/CyclesTab.tsx`

---

## Observações

_Espaço para anotações do testador_

---

## Summary

| Área | Status |
|------|--------|
| Build/Typecheck | [ ] |
| Audits | [ ] |
| Settings Pages | [ ] |
| OKRs | [ ] |
| Troca de BU | [ ] |

**Overall:** [ ] PASS / [ ] FAIL

**Tester:** _______________  
**Date:** _______________
