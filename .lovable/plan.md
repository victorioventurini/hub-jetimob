## Objetivo
Refatorar o step **KRs** do Pré-MBR (`/rituals/mbr-pre?step=krs`) para usar a mesma UI do Check-in Individual e exibir **um KR por página**, mantendo o caráter reflexivo (apenas justificativa — sem persistir check-in).

---

## Análise prévia (TCR + canônicos)

- **TCR §MBR Pre-Ritual**: o Pré-MBR é reflexivo — **não grava `okr_checkins`** nem altera `current_value`/`status`. Apenas captura `krJustifications` no draft, persistido no snapshot final.
- **TCR §Wizards Master + UI Components Registry**: blocos de check-in já são canônicos em `src/modules/okrs/components/checkin/` (`CheckinContextBlock`, `CheckinProgressBlock`, `CheckinStatusSelector`, `CheckinReflectionBlock`). Já são consumidos por `CheckinDialog` (drawer /okrs) e `CollaboratorCheckinStep`.
- **Decisão de reúso**: usaremos os mesmos blocos do Check-in Individual em **modo read-only** (sem editar `current_value`/status), trocando o bloco de Reflexão pelo `JustificationField` canônico (já compartilhado em `wizards/shared`).
- **Paginação**: replicar o mesmo padrão do `CollaboratorCheckinStep` (header com "KR X de N + % concluído", footer com Voltar/Próximo, atalho Ctrl+Enter) e do `QbrKpiAnalysisStep` paginado já implementado no Pré-MBR.
- **Lookup canônico (Onda 4)**: continuar usando `useEntityLookup` + `resolveName` para resolver nomes (não ler `krTitle` legado de snapshots).

---

## O que muda

### 1. `MbrPreKrAnalysisStep.tsx` — refatoração
- Remover renderização em "lista agrupada por objetivo".
- Implementar **paginação 1-KR-por-página**, na seguinte ordem:
  1. KRs que exigem justificativa (`critical` / `warning` / `not_started`) — primeiro.
  2. KRs OK — depois (apenas leitura, sem campo).
- Estado interno: `currentIndex` + navegação Próximo/Anterior.
- Header: faixa "Análise de KR — KR X de N · Y% concluído" (igual ao Check-in Individual).
- Bloqueio de avanço: não permite ir adiante se KR atual exige justificativa e está vazia (espelha a regra atual de `primaryDisabled`).
- Botão "Concluir" apenas no último KR; chama `onContinue`.

### 2. Composição de blocos canônicos (sem duplicação)
Por página de KR:
- `CheckinContextBlock` (Objetivo + KR + owner + último check-in + RAG) — **read-only**, já é o padrão.
- `CheckinProgressBlock` em **modo read-only** (sem `onValueChange`). Já aceita `isAutomatic` para travar input — vamos estender com prop opcional `readOnly` que esconde o campo de valor e mostra apenas a barra de progresso + previous/target. Isso evita criar novo componente e mantém o bloco canônico para reuso.
- **Não** usar `CheckinStatusSelector` nem `CheckinReflectionBlock` (esses são para o ato de check-in, que aqui é proibido).
- `JustificationField` (já compartilhado) com label/hint contextuais:
  - `not_started`: "Justifique por que este KR ainda não foi iniciado".
  - `critical`/`warning`: "Justifique o desvio do KR".

### 3. Pequena extensão em `CheckinProgressBlock`
Adicionar prop opcional `readOnly?: boolean`:
- Quando `true`: oculta o input/manual entry e o botão "atualizar valor", mantendo Contexto (Anterior → Meta) + barra de progresso + RAG.
- Sem `readOnly` (default): comportamento atual preservado para `CheckinDialog` e `CollaboratorCheckinStep`.
- Justificativa: extender ao invés de criar `MbrPreProgressBlock`, conforme regra do projeto ("preferir estender e compor").

### 4. Sem mudanças em
- `MbrPrePage.tsx` (props do step continuam idênticas: `krFinalStates`, `krJustifications`, `onKrJustificationChange`, `onContinue`, `onBack`).
- Tipos em `types/wizard/mbr.ts` (`krFinalStates`, `krJustifications` permanecem).
- `MbrPreSummary.tsx` / `MbrPreReport.tsx` (já leem `krJustifications`).
- `KR_STATE_CONFIG` (continua sendo SSOT para severidade e cores).
- Lógica de seed dos `krFinalStates` na page (cut-off, RAG, daysSinceCheckin).

---

## Detalhes técnicos

**Lista de KRs paginados** (memoizada):
```ts
// 1. Os que exigem justificativa (na ordem original, agrupados por objetivo)
// 2. Os demais (somente leitura)
const paginatedKrs = useMemo(() => {
  const needs = krFinalStates.filter(k => requiresJustification(k.state));
  const rest  = krFinalStates.filter(k => !requiresJustification(k.state));
  return [...needs, ...rest];
}, [krFinalStates]);
```

**Adapter local** `toCheckinKrData(krFinalState, lookups)` — converte `KrFinalState` (snapshot) + dados resolvidos pelo `useEntityLookup` para o tipo `CheckinKrData` esperado pelos blocos. Não duplica `toCheckinKrData` do `CollaboratorCheckinStep` (lá a entrada é `WizardKr`, schema diferente). Adapter fica local ao step.

**Validação de avanço**:
- KR atual exige justificativa → `Próximo` desabilitado se `(krJustifications[id] ?? '').trim() === ''`.
- Banner de aviso no topo (mesmo componente atual `AlertBanner` ou estilo já usado).

**Atalho Ctrl/Cmd+Enter** para avançar (paridade com Check-in Individual).

---

## Arquivos afetados
- `src/modules/okrs/components/wizards/mbr-pre/MbrPreKrAnalysisStep.tsx` — refatoração (paginação + composição dos blocos canônicos).
- `src/modules/okrs/components/checkin/CheckinProgressBlock.tsx` — adicionar prop opcional `readOnly`.

Sem novas tabelas, migrations ou rotas. Comportamento de persistência inalterado.