
# Registros de Decisao em cada step do wizard Team Check-in

## Contexto

Atualmente, decisoes/ajustes de foco/proximos passos so podem ser registrados na etapa final ("Decisoes e Proximos Passos") do wizard team-checkin. O objetivo e permitir registros em **todos os steps intermediarios** (Opening, KR Review, Initiatives), consolidando tudo na etapa final com CRUD completo.

## Pre-checklist Canonico

Documentos consultados:
- **TCR v3.8.0** -- Stack, `useBuScopedSupabase`, padroes de hooks/components
- **DATA_MODEL_REGISTRY** -- `okr_wizard_sessions.reflection_data` (campo JSONB onde decisions sao persistidas)
- **WIZARD_DEVELOPMENT_GUIDE** -- Padrao de steps, draft persistence via `useGenericWizardDraft`
- **Edge Function `team-checkin-summary`** -- Le decisions de `reflection_data.data.decisions` (linhas 552-577). Mapeamento atual: campo `decision.type` (mas frontend usa `decision.category` -- mismatch a corrigir)

## Alteracoes

### 1. Estender tipo `TeamCheckinDecision` com `sourceStep`

Em `src/modules/okrs/types/wizard.ts` (linha 161-169), adicionar campo opcional:

```typescript
export interface TeamCheckinDecision {
  id: string;
  text: string;
  category: 'decision' | 'focus_adjustment' | 'next_step';
  sourceStep?: 'opening' | 'kr-review' | 'initiatives' | 'decisions';
  owner?: {
    id: string;
    name: string;
  };
}
```

### 2. Novo componente `InlineDecisionInput`

Local: `src/modules/okrs/components/wizards/shared/InlineDecisionInput.tsx`

Componente compacto e colapsavel (usa Collapsible) que aparece no rodape dos steps intermediarios. Inclui:
- Botao "Adicionar nota" que expande o input
- Input de texto + seletor de categoria (3 badges clicaveis)
- Botao "+" para adicionar
- Lista compacta dos registros daquele step (com botao de remover)
- Filtra e exibe somente decisions com `sourceStep` correspondente

Props:
```typescript
interface InlineDecisionInputProps {
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  sourceStep: string;
  placeholder?: string;
}
```

### 3. Integrar nos 3 steps intermediarios

Cada step recebe `decisions` e `onDecisionsChange` como props adicionais:

| Step | Componente | Posicao do input | sourceStep |
|------|-----------|-----------------|------------|
| Opening | `TeamOpeningStep` | Antes do `WizardFirstStepFooter` | `'opening'` |
| KR Review | `TeamKrReviewStep` | Dentro do card do KR atual, apos LatestCheckinSummary | `'kr-review'` |
| Initiatives | `TeamInitiativesStep` | Antes do `WizardStepFooter` | `'initiatives'` |

### 4. Atualizar `TeamCheckinPage.tsx` para passar decisions a todos os steps

O draft ja possui `decisions: TeamCheckinDecision[]`. Passar `decisions` e `onDecisionsChange` handler para Opening, KR Review e Initiatives:

```typescript
case 'opening':
  return (
    <TeamOpeningStep
      // ... props existentes
      decisions={draft.data.decisions}
      onDecisionsChange={(decisions) => updateDraft({ decisions })}
    />
  );
```

Mesmo padrao para kr-review e initiatives.

### 5. Refatorar `TeamDecisionsStep` (etapa final)

Manter funcionalidade atual, com as seguintes melhorias:
- Exibir **todos** os registros consolidados (vindos de qualquer step)
- Agrupar visualmente por `sourceStep` com headers ("Da Abertura", "Da Revisao de KRs", "Das Iniciativas", "Desta Etapa")
- Permitir edicao inline do texto (click no texto para editar)
- Manter opcao de adicionar novos registros (com `sourceStep: 'decisions'`)
- Manter o CRUD completo (adicionar, editar, remover) para todos os registros
- Checklist de saida permanece inalterado

### 6. Corrigir e atualizar Edge Function `team-checkin-summary`

Em `supabase/functions/team-checkin-summary/index.ts`:

**Bug encontrado**: A funcao `loadSessionDecisions` (linha 568-573) le `decision.type` mas o frontend armazena `decision.category`. Corrigir para ler `category`:

```typescript
decisions.push({
  text: decision.text || '',
  type: decision.category || decision.type || 'decision',
});
```

Tambem enriquecer o contexto do agente `facilitador-decisoes` para incluir as decisions agrupadas por categoria com labels em portugues:

```typescript
const categoryLabels = {
  decision: 'Decisao',
  focus_adjustment: 'Ajuste de Foco',
  next_step: 'Proximo Passo',
};
```

### 7. Exportar componente no barrel

Adicionar `InlineDecisionInput` ao barrel `src/modules/okrs/components/wizards/shared/index.ts`.

## Detalhes Tecnicos

- **Draft persistence**: Decisions sao persistidas via `useGenericWizardDraft` em `reflection_data.data.decisions`. O campo `sourceStep` e `category` sao serializados no JSON. Nenhuma alteracao de schema necessaria.
- **Retrocompatibilidade**: Decisions sem `sourceStep` serao tratadas como `sourceStep: 'decisions'` (comportamento atual).
- **Edge Function**: O campo `category` passa a ser lido (com fallback para `type` por retrocompatibilidade).
- **UX**: `InlineDecisionInput` comeca colapsado nos steps intermediarios para nao poluir a interface. Um badge com contagem aparece quando ha registros.
- **Sem migracao de banco**: Tudo dentro do JSONB `reflection_data`.
