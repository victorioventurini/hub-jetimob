## Problema

Vitor (vitor.severo@jetimob.com) abre o Pré-MBR de **junho/2026** (analisando maio) e enxerga, em modo somente-leitura, o que ele preencheu no **Pré-MBR anterior** (analisando abril, completado em 05/maio/2026).

## Causa raiz

`useCompletedSessionForCycle` decide se já existe Pré-MBR completado considerando apenas a tupla **(wizard_type, team_id, cycle_id, started_by)**. Como Pré-MBR e MBR são rituais **mensais** dentro de um ciclo **trimestral** (M1 e M2 do quarter), qualquer sessão completada no mês 1 do trimestre é interpretada como "já preenchido" no mês 2 — o componente cai no `CompletedRitualView` e bloqueia o preenchimento do novo mês.

Confirmação no banco: existe uma única sessão `mbr-pre` de Vitor, `cycle_id = Q2/2026`, `completed_at = 2026-05-05`. Hoje (1º/jun) ele abre Pré-MBR de maio (mesmo cycle) e o hook devolve essa sessão antiga.

A mesma lógica afeta `MbrPage` (rito MBR), que também roda 2x por trimestre. `QbrPrePage`/`QbrMeetingPage` não são afetados (1x por trimestre = 1 sessão por cycle).

## Solução

Escopar a detecção de "sessão completada" também por **`referenceMonth`** nos rituais MBR e MBR-pre. Esse campo já existe em `okr_wizard_sessions.reflection_data->'data'->>'referenceMonth'` (`YYYY-MM`).

### 1. `src/modules/okrs/hooks/useCompletedSessionForCycle.ts`

- Aceitar novo parâmetro opcional `referenceMonth?: string | null`.
- Quando informado: filtrar a busca de sessão `completed` por `reflection_data->data->>referenceMonth = referenceMonth` (via `.eq('reflection_data->data->>referenceMonth', referenceMonth)`).
- Quando informado: filtrar também a busca de `in_progress` pelo mesmo critério (evita resumir draft de outro mês como "in_progress" do mês corrente).
- Incluir `referenceMonth` na query key via `queryKeys.okrs.completedSessionForCycle(...)`. Atualizar a assinatura dessa key em `src/lib/queryKeys/okrs.ts` (novo segmento final opcional).

### 2. `src/modules/okrs/pages/MbrPrePage.tsx`

- Calcular `refMonth` já é feito (linha 163). Passar `refMonth` como 4º arg para `useCompletedSessionForCycle('mbr-pre', teamIdParam, activeCycle?.id, refMonth)`.

### 3. `src/modules/okrs/pages/MbrPage.tsx`

- Mesmo padrão: extrair `refMonth` do draft (`draft.data.referenceMonth || defaultReferenceMonth()`) e — se o MbrPage usar/passar a vir a usar `useCompletedSessionForCycle` — passar como 4º arg. Hoje MbrPage NÃO chama `useCompletedSessionForCycle`, então **apenas adicionar a chamada** com `wizardType: 'mbr'`, `teamId: null`, `cycleId: quarterlyCycle?.id`, `referenceMonth: refMonth`, e renderizar o `CompletedRitualView` quando `sessionState === 'completed'` (espelhando o que o MbrPrePage faz). Se preferirmos manter o MbrPage fora do escopo da correção pontual, fica apenas a mudança no MBR-pre e ficamos com a dívida documentada.

### 4. Draft uniqueness (verificar, sem mudar se não for necessário)

O lookup de draft `in_progress` em `useGenericWizardDraft.session.ts` busca por `(wizard_type, team_id, cycle_id, started_by, status=in_progress)`. Como o draft anterior foi `completed` (não `in_progress`), ele não será carregado por engano para o novo mês. Nenhuma mudança necessária aqui.

## Validação

1. Logar como Vitor na BU Jetimob → abrir `/okrs/mbr-pre?team=<id>` → wizard abre em modo edição (não mais read-only) com `referenceMonth = 2026-05`.
2. Após completar maio, abrir novamente → cai em read-only (mesmo mês).
3. Em julho, ao abrir Pré-MBR de junho (mesmo cycle Q2) → wizard em modo edição.

## Fora de escopo

- Não alterar RLS, schema ou backfill.
- Não mudar `useGenericWizardDraft`.
- Não tocar QbrPre/QbrMeeting (rituais 1x/quarter — não afetados).
