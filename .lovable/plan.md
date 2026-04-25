
# Plano: Corrigir link de criação de KRs com `contributor_team_id`

## Pré-checklist (executado)
- ✅ `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`
- ✅ `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md` — `okrs.kr.create` / `okrs.objective.create`
- ✅ `docs/canonical/IDENTITY_CONVENTION.md` — uso de `realProfileId` em mutations
- ✅ `mem://auth/okr-ownership-enforcement-rls` — RLS strict ownership
- ✅ Código atual de `TeamKrCreationPage.tsx` (linhas 168–178) — bug confirmado

## Diagnóstico
URL `/okrs/objectives/:id/krs/create?contributor_team_id=...` quebra porque:
1. **Linha 170** (`setSearchParams({ step: draft.currentStep })`) e **linha 177** (`setSearchParams({ step })`) **sobrescrevem toda a query string**, removendo `contributor_team_id` no primeiro render quando o draft já tem `currentStep`.
2. Sem `contributor_team_id`, `isContribution=false`, `effectiveTeamId` vira o owner do objetivo, e o `useEffect` de validação (linha 122–129) passa silenciosamente — mas o usuário acaba criando KR para o time errado, ou o RLS `okr_team_key_results` rejeita o INSERT no submit (erro 42501).

## Mudanças

### 1. `src/modules/okrs/pages/TeamKrCreationPage.tsx`
- Substituir as duas chamadas de `setSearchParams({ step })` por uma versão que **preserva** os parâmetros existentes (functional update via `URLSearchParams`):
  ```ts
  const updateStepParam = useCallback((step: KrWizardStep) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('step', step);
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  ```
- Usar `updateStepParam` no `useEffect` de sync (linha 168) e em `goToStep` (linha 175).
- **Endurecer** o `useEffect` de validação de contribuidor: só redirecionar quando `objective` E `contributors` estiverem carregados (já está OK, mas adicionar guarda extra para `objective.is_shared === true` antes de exigir autorização — se não-shared, `isContribution` deve forçar fallback ao owner ou bloquear).

### 2. Adicionar gate de permissão (recomendado)
- Importar `useCanManageTeamOkr` de `@/modules/okrs/hooks/useCanManageTeamOkr`.
- Após carregar `effectiveTeamId`, chamar `useCanManageTeamOkr(effectiveTeamId)`.
- Se `!isLoading && !canManage`, renderizar bloco amigável:
  > "Você não tem permissão para criar KRs neste time."
  
  Com botão "Voltar para OKRs do time" → navega para `/okrs?view=team&team_id=${effectiveTeamId}`.
- Isso evita o erro RLS no submit e dá feedback imediato.

### 3. Documentação (memória)
- Atualizar `mem://standards/url-state-preservation` (criar se não existir): "Em rotas com múltiplos params (step + filtros), `setSearchParams` DEVE usar functional update para preservar params existentes."
- Adicionar referência cruzada em `mem://features/okrs/creation-wizard-draft-hydration`.

## Validações
- ✅ Acessar `/okrs/objectives/:id/krs/create?contributor_team_id=X` e confirmar que a URL mantém o param após qualquer transição de step.
- ✅ Time autorizado consegue criar KR (verificar `team_id` resultante = `contributor_team_id`).
- ✅ Time NÃO autorizado vê tela de "sem permissão" antes de qualquer interação com o wizard.
- ✅ Fluxo normal (sem `contributor_team_id`) continua funcionando inalterado.

## Arquivos
- **Editados**: `src/modules/okrs/pages/TeamKrCreationPage.tsx`, `.lovable/memory/index.md`
- **Novos**: `.lovable/memory/standards/url-state-preservation.md`
