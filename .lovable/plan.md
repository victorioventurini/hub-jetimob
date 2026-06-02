
# Geração em Batches (map-reduce) — MBR Executive Report

## Problema

Toast "IA está sobrecarregada" ao regenerar em `/rituals/mbr`. A causa é o tamanho da chamada única (5 times, 11 KPIs, 12 projetos, 29 KR issues etc.) somado a 503 transientes do Gemini. Mesmo com retry + `maxTokens=6000`, a janela única é frágil.

## Estratégia

Trocar a chamada única por **map-reduce**: várias chamadas pequenas em paralelo + 1 consolidação final.

```text
                 ┌──► analyzeProjects   ──┐
extractors  ───► ├──► analyzeKrIssues   ──┤
                 ├──► analyzeKpis       ──┼──► consolidateReport ──► JSON final
                 └──► analyzeDecisions  ──┘     (narrative + commitments + signals)
```

- **4 análises parciais** rodam com `Promise.allSettled` (independentes, paralelas, `maxTokens` ~1500 cada).
- **1 consolidação** recebe APENAS os resumos das parciais + dados de OKRs/times (`maxTokens` ~2500). Sem dado bruto pesado.
- **Montagem final** em código, determinística, a partir das parciais + extratores já existentes.

## Resiliência

- Cada parcial tem fallback neutro (string vazia / array vazio) se falhar mesmo após os retries do `llmComplete`. Não derruba o relatório.
- Consolidação é crítica: se falhar, sobe o erro e o front mostra o toast já existente (incluindo o de 503/MODEL_OVERLOADED).
- Logs por fase com `requestId` e label (`[analyzeProjects]`, `[consolidate]` etc.).

## Arquivos

### Backend (novos)
- `supabase/functions/mbr-executive-report/partial-analyzers.ts`
  - `analyzeProjects(llm, projectIssues, requestId) → { projectsAnalysis }`
  - `analyzeKrIssues(llm, krIssues, orgObjectivesSummary, requestId) → { krIssuesAnalysis }`
  - `analyzeKpis(llm, kpisSummary, kpiIssues, kpisToCreate, monthLabel, requestId) → { kpiInsights }`
  - `analyzeDecisions(llm, pendingDecisions, agendaSuggestions, requestId) → { decisionsNeeded }`
  - `consolidateReport(llm, inputs, requestId) → { monthNarrative, commitmentsAnalysis, leaderSignals }`
  - Helper interno `callPartial` com try/catch + `tryParseAiJson` + fallback.

### Backend (editados)
- `supabase/functions/mbr-executive-report/index.ts`
  - Remover a chamada única ao `llmComplete` com prompt gigante.
  - Após os extratores: rodar `Promise.allSettled` das 4 parciais; aplicar fallback para as `rejected`.
  - Chamar `consolidateReport` com o resultado das parciais + `overallAchievement`, `teamHealthSummary`, `teamHighlights`, `teamCommitments`, `monthAnalyses`.
  - Montar `ReportResponse` final juntando parciais + extratores + consolidação. Contrato inalterado.
  - Manter `maxTokens=6000` morto não faz sentido — removido; cada chamada define o próprio limite.
- `supabase/functions/mbr-executive-report/prompts.ts`
  - Pode ser deixado intacto ou marcado como deprecated; não é mais chamado pelo orquestrador.

### Frontend
- Nenhuma mudança. O contrato `ReportResponse` permanece idêntico.
- Toast de 503/`MODEL_OVERLOADED` (implementado anteriormente em `edgeFunctionError.ts`) cobre o caso da consolidação falhar.

## Validação

1. Implementar.
2. Deploy `mbr-executive-report`.
3. Regenerar relatório no ciclo `8fd8d5fa-6145-4c13-8c22-5b45e5eb03c3` mês `2026-05`.
4. Conferir nos logs:
   - 4 logs `[analyze*]` (sem warnings de fallback no caminho feliz)
   - 1 log `[consolidate]`
   - "MBR executive report generated successfully"
5. Conferir UI: todas as seções do relatório preenchidas.

## Próximo passo (fora do escopo desta task)

Replicar o mesmo padrão em `qbr-executive-report` se MBR validar.
