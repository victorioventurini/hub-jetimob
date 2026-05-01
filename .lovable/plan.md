## Objetivo
Tornar o campo **"Tipo do input"** (Consolidado / Parcial) do SSOT `KpiValueEntryForm` uma escolha **explícita e obrigatória** do usuário — sem pré-seleção e sem auto-sugestão silenciosa baseada em frequência/data.

## Análise (pré-checklist)
- SSOT: `src/modules/kpis/components/shared/KpiValueEntryForm.tsx` (consumido por `AddKpiValueDialog`, `EditKpiValueDialog`, `CollaboratorKpiStep`).
- Schema: `src/modules/kpis/components/shared/kpiValueEntrySchema.ts` — hoje `input_type: z.enum(['consolidated', 'partial'])` aceita undefined porque o form sempre injeta um default.
- Hoje o form pré-popula `input_type` via `suggestInputType()` no mount e re-aplica a cada mudança de `reference_date` (linhas 106-134). Isso viola o requisito do usuário.
- Memória `kpi-value-entry-ssot.md` exige `input_type` SEMPRE no insert — mantido (validação Zod garante).

## Mudanças (apenas frontend / presentation)

### 1. `kpiValueEntrySchema.ts`
Tornar a validação explicitamente obrigatória com mensagem amigável:
```ts
input_type: z.enum(['consolidated', 'partial'], {
  required_error: 'Selecione o tipo do input',
  invalid_type_error: 'Selecione o tipo do input',
}),
```

### 2. `KpiValueEntryForm.tsx`
- **Default vazio**: `input_type: undefined` no `defaultValues` (cast `as unknown as KpiInputType` para satisfazer o TS sem alterar o tipo público).
- **Remover auto-sugestão no mount**: deletar `defaultInputType`/`suggestInputType` no `useMemo` inicial.
- **Remover re-sugestão no change de data**: deletar o `useEffect` que faz `form.setValue('input_type', suggestion)` (linhas 124-134). A data continua livre; o usuário escolhe o tipo.
- **Manter** o banner explicativo "consolida X mas atualiza Y" (apenas informativo).
- **Asterisco obrigatório** no label: `<FormLabel>Tipo do input <span className="text-destructive">*</span></FormLabel>`.
- `onInputTypeChange` continua sendo disparado, mas só quando o usuário efetivamente escolher (consumidores já tratam `undefined`/valor).

### 3. Consumidores — verificação
- `AddKpiValueDialog`, `EditKpiValueDialog`, `CollaboratorKpiStep`: nenhum altera default de `input_type`; todos confiam no schema. **Nenhuma mudança necessária**.
- `EditKpiValueDialog`: edição de valor existente continua hidratando com o `input_type` salvo (já é o comportamento via `defaultValues` do consumidor) — confirmar leitura no arquivo durante a implementação para garantir que a hidratação não quebre.

## Impacto
- Aplica-se uniformemente a: modal `/kpis` (Add/Edit) e rito Colaborador (`?step=kpis`).
- Sem mudanças de schema DB, RLS ou edge functions.
- Sem alteração no payload final (`input_type` continua obrigatório no insert via Zod).

## Validação
- Submit sem escolher → erro "Selecione o tipo do input" abaixo do RadioGroup.
- Mudar data não altera mais a seleção do usuário.
- Edição de valor existente preserva o `input_type` original.