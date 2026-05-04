## Problema

Na Abertura do Pré-MBR, a Análise IA do mês cita **UUIDs de KRs** (`a0761f3a...`) em vez do título. Causa raiz: na Onda 4 Fase 3, `krFinalStates` parou de gravar `krTitle` no draft (campo `@deprecated`). O hook `useMbrPreMonthAnalysis` faz fallback `krTitle ?? krId` — quando não há `krTitle`, manda o UUID como `title` para a LLM, que então cita o UUID.

KPIs já vão com `name` correto (via `useMbrPreTeamKpisMonthly`).

## Plano

### 1. Resolver títulos de KRs em runtime no Step
Em `MbrPreOpeningStep`:
- Coletar `krIds = krFinalStates.map(k => k.krId)`.
- Chamar `useEntityLookup({ teamKrIds: krIds, orgKrIds: krIds })` (mesmo padrão dos renderers de relatório, que já fazem isso).
- Construir `krTitleById = new Map<string, string>()` priorizando `teamKrs` e caindo em `orgKrs`.
- Passar `krTitleById` para `generate(...)` (parâmetro já existente em `UseMbrPreMonthAnalysisParams`).

### 2. Garantir resolução também na edge function (defesa em profundidade)
Reforçar no `userPrompt` de `mbr-pre-month-analysis/index.ts`:
- Frase explícita: **"Use SEMPRE o campo `title` dos KRs e `name` dos KPIs nas narrativas. NUNCA cite IDs/UUIDs."**

### 3. Sanitizar saída da LLM (cinto + suspensórios)
Em `useMbrPreMonthAnalysis.generate`, depois de receber a resposta:
- Construir `idSet = new Set([...krIds, ...kpiIds])`.
- Em `summary`, `highlights[].title/detail`, `offenders[].title/detail`, `risks[].title/detail`, `recommendations[]`: substituir qualquer ocorrência de UUID conhecido pelo título correspondente. Padrão UUID via regex `/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi` mapeado por `krTitleById`/`kpiNameById`. UUIDs desconhecidos viram `'(item)'`.

### 4. Memória
Adicionar nota em `mem://features/rituals/...` ou no SSOT de wizards-snapshot-deprecation: **"Steps que enviam dados a LLMs devem resolver IDs → nomes via `useEntityLookup` antes de invocar a edge; nunca enviar IDs como `title`/`name`."**

## Arquivos afetados

- `src/modules/okrs/components/wizards/mbr-pre/MbrPreOpeningStep.tsx` — `useEntityLookup` + `krTitleById` no `generate`.
- `src/modules/okrs/hooks/useMbrPreMonthAnalysis.ts` — sanitização final do output (substituir UUIDs sobreviventes).
- `supabase/functions/mbr-pre-month-analysis/index.ts` — instrução explícita no prompt.
- `mem://standards/wizard-snapshot-denormalized-fields-deprecation` — nota sobre IA.

## Fora de escopo
- Outros ritos (Weekly, QBR) — auditar em loop separado se houver mesma incidência.
- Re-introduzir `krTitle` denormalizado (vai contra o canon de Onda 4).
