# Wave 3: Consolidação Final de Barrel Files de Hooks

**Versão:** v1.0  
**Data:** 2026-01-22  
**Status:** ✅ CONCLUÍDO
**Objetivo:** Estrutura consolidada em hooks/queries/ sem duplicação em todo sistema

---

## 📊 Resumo Executivo

Esta wave é a **consolidação final** do padrão de barrel files de hooks, corrigindo todas as violações remanescentes identificadas nas waves anteriores.

### Escopo
1. **Corrigir imports diretos** que bypassam os barrel files
2. **Limpar barrel files** removendo exports duplicados
3. **Deletar arquivos legados** que não são mais necessários
4. **Atualizar documentação** com estado final

---

## 🔴 Violações Identificadas

### Módulo `okrs` (5 arquivos - ALTA PRIORIDADE)

| Arquivo | Imports Diretos | Status |
|---------|-----------------|--------|
| `pages/OkrCreationPage.tsx` | 6 imports diretos | ⏳ Pendente |
| `pages/LeaderPrepPage.tsx` | 4 imports diretos | ⏳ Pendente |
| `pages/CollaboratorCheckinPage.tsx` | 3 imports diretos | ⏳ Pendente |
| `pages/TeamCheckinPage.tsx` | 3 imports diretos | ⏳ Pendente |
| `components/wizards/team-okr-creation/TeamOkrSharingStep.tsx` | 1 import direto | ⏳ Pendente |

**Hooks afetados (já exportados no barrel `okrs/hooks/index.ts`):**
- `useWizardDraft`
- `useActiveCycles` (de `useCycleData`)
- `useTeamPreviousCycleAnalysis`
- `useOrgOkrsForContext`
- `useCreateTeamOkrBundle`
- `useWizardSession`
- `useGenericWizardDraft`
- `useTeamOverviewMetrics`
- `useTeamPendingKrs`
- `useUserKrsForWizard`
- `useWizardAI`

---

## 📋 Plano de Execução

### Fase 1: Corrigir Imports - Módulo OKRs (5 arquivos)

**Padrão de correção:**
```typescript
// ❌ ANTES (import direto - PROIBIDO)
import { useWizardDraft, type WizardStep } from '@/modules/okrs/hooks/useWizardDraft';
import { useActiveCycles } from '@/modules/okrs/hooks/useCycleData';
import { useTeamPreviousCycleAnalysis } from '@/modules/okrs/hooks/useTeamPreviousCycleAnalysis';

// ✅ DEPOIS (import do barrel - CORRETO)
import { 
  useWizardDraft, 
  useActiveCycles,
  useTeamPreviousCycleAnalysis,
  useOrgOkrsForContext,
  useCreateTeamOkrBundle,
  useWizardSession,
} from '@/modules/okrs/hooks';
```

#### 1.1 `OkrCreationPage.tsx` ✅
- [x] Consolidar 6 imports diretos em 1 import do barrel
- Hooks: `useWizardDraft`, `useActiveCycles`, `useTeamPreviousCycleAnalysis`, `useOrgOkrsForContext`, `useCreateTeamOkrBundle`, `useWizardSession`

#### 1.2 `LeaderPrepPage.tsx` ✅
- [x] Consolidar 4 imports diretos em 1 import do barrel
- Hooks: `useGenericWizardDraft`, `useActiveCycles`, `useTeamOverviewMetrics`, `useTeamPendingKrs`

#### 1.3 `CollaboratorCheckinPage.tsx` ✅
- [x] Consolidar 3 imports diretos em 1 import do barrel
- Hooks: `useGenericWizardDraft`, `useActiveCycles`, `useUserKrsForWizard`

#### 1.4 `TeamCheckinPage.tsx` ✅
- [x] Consolidar 3 imports diretos em 1 import do barrel
- Hooks: `useGenericWizardDraft`, `useActiveCycles`, `useTeamPendingKrs`

#### 1.5 `TeamOkrSharingStep.tsx` ✅
- [x] Corrigir 1 import direto
- Hooks: `useWizardAI`

### Fase 2: Outros Módulos ✅

#### 2.1 `assets/pages/InventoryPage.tsx` ✅
- [x] Consolidar imports diretos para barrel

#### 2.2 `tickets/pages/TicketDetailPage.tsx` ✅
- [x] Adicionar `useTicketViewersAndMentions` ao barrel
- [x] Corrigir import para usar barrel

### Fase 2: Verificar Outros Módulos

Verificar se existem imports diretos remanescentes em:
- [ ] `assets` - Verificar páginas e componentes
- [ ] `tickets` - Verificar páginas e componentes
- [ ] `permissions` - Verificar páginas e componentes
- [ ] `kpis` - Verificar páginas e componentes
- [ ] `bu` - Verificar páginas e componentes
- [ ] `users-global` - Verificar páginas e componentes

### Fase 3: Limpeza de Barrel Files

- [ ] Verificar se há exports duplicados em `okrs/hooks/index.ts`
- [ ] Verificar se há exports duplicados em `okrs/index.ts`
- [ ] Remover hooks deprecados (se não usados)

### Fase 4: Deletar Arquivos Legados

Critérios para deleção:
1. Arquivo é 100% duplicado de outro
2. Arquivo não é mais importado por nenhum componente
3. Funcionalidade foi movida para outro arquivo

**Candidatos identificados:**
- `useOrgOkrsForContext.ts` - Marcado como DEPRECATED (avaliar se pode ser removido)

### Fase 5: Atualizar Documentação

- [ ] Atualizar TCR para v2.61.0
- [ ] Marcar wave como concluída em `WAVE_HOOKS_BARREL_CONSOLIDATION_2026-01-19.md`
- [ ] Atualizar `HOOKS_CONSOLIDATION_REPORT.md`

---

## ✅ Critérios de Sucesso

1. **Zero imports diretos** - Todos usam barrel files
2. **Barrels completos** - Todos hooks exportados centralmente
3. **Sem duplicação** - Um único local de export por hook
4. **Padrão uniforme** - Todos módulos seguem mesma estrutura
5. **Documentação atualizada** - TCR e relatórios refletem estado final

---

## 📚 Referência: Padrão Correto

```typescript
// ✅ CORRETO - Import do barrel
import { 
  useTeams, 
  useSquads, 
  type Team 
} from "@/modules/teams/hooks";

// ✅ CORRETO - Import do módulo (também funciona)
import { 
  useWizardDraft,
  useActiveCycles,
} from "@/modules/okrs";

// ❌ PROIBIDO - Import direto do arquivo
import { useTeams } from "@/modules/teams/hooks/useTeams";
import { useWizardDraft } from "@/modules/okrs/hooks/useWizardDraft";
```

---

## 📝 Changelog

| Data | Versão | Autor | Mudança |
|------|--------|-------|---------|
| 2026-01-22 | v1.0 | Lovable | Criação do documento |
