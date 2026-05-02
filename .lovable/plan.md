## Objetivo

No step **Resumo e envio** do Check-in Individual (`/rituals/collaborator-checkin?step=summary`), exibir as **sugestões de pauta** como um **card próprio destacado no fim da página**, idêntico ao padrão do Pré-MBR — em vez de ficar embutido dentro da seção "Reflexão", como está hoje.

## Estado atual

- `CollaboratorSummary.tsx` já recebe `teamCheckinAgendaSuggestions` e `onTeamCheckinAgendaSuggestionsChange` corretamente da `CollaboratorCheckinPage`.
- O `AgendaSuggestionsPrioritizer` (modo `categoryless`) já é renderizado, **porém dentro do `SectionShell` "Reflexão"** (linhas 739–746). Isso o esconde visualmente: ele aparece misturado à reflexão, sem o destaque de card top-level que o print do MBR-Pre tem.
- No `MbrPreSummary.tsx`, o `AgendaSuggestionsPrioritizer` é renderizado como **bloco top-level no fim do scaffold**, fora de qualquer seção — esse é o padrão canônico que vamos replicar.

## Mudança proposta

### Arquivo único: `src/modules/okrs/components/wizards/collaborator/CollaboratorSummary.tsx`

1. **Remover** a renderização do `AgendaSuggestionsPrioritizer` de dentro do `case 'reflection'` (linhas 739–746).
2. **Manter** o fallback read-only de listagem das sugestões dentro da Reflexão (linhas 718–738) **somente quando** `onTeamCheckinAgendaSuggestionsChange` não for passado — preserva compatibilidade quando o Summary é usado em modo somente-leitura (ex.: rituals já completados).
3. **Adicionar** o `AgendaSuggestionsPrioritizer` como **bloco top-level no fim** do conteúdo do scaffold (após `orderedSections`, antes do bloco final de submit/footer), espelhando o padrão do `MbrPreSummary`:
   ```tsx
   {onTeamCheckinAgendaSuggestionsChange && (
     <AgendaSuggestionsPrioritizer
       suggestions={teamCheckinAgendaSuggestions}
       onSuggestionsChange={onTeamCheckinAgendaSuggestionsChange}
       ritualLabel="Check-in do Time"
       categoryless
     />
   )}
   ```
4. Ajustar o cálculo `total` da seção Reflexão para **não somar** mais `teamCheckinAgendaSuggestions.length` (já que o card sai dessa seção). A contagem da Reflexão volta a refletir só impacto + ajuda.

### Nada mais muda

- Sem mexer em `CollaboratorReflectionStep` (ali o card continua igual, é o ponto de entrada das sugestões).
- Sem mexer em `CollaboratorCheckinPage` (props já fluem corretamente).
- Sem mexer em `AgendaSuggestionsPrioritizer` (já suporta `categoryless`).
- Sem alterações em snapshot, payload, schema, RLS ou Edge Functions.
- MBR-Pre, QBR-Pre e demais ritos: regressão zero (não tocados).

## Validação visual

- Acessar `/rituals/collaborator-checkin?step=summary` com sugestões cadastradas na Reflexão.
- Esperado: card **"Sugestões de pauta para o Check-in do Time"** aparece como bloco próprio no fim do Resumo, com checkbox de priorização (#1/#2/#3), botão remover e CTA "Adicionar sugestão" — idêntico ao print do Pré-MBR.
- Seção "Reflexão" deixa de exibir o sub-bloco "Sugestões para o Check-in do Time" quando o usuário pode editar (modo padrão); preserva a listagem read-only só em snapshots/históricos sem handler.
