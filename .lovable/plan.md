# MBR: exibir integralmente o Pré-MBR de times sem OKRs próprias (caso Produto)

## O que o time de Produto realmente preencheu (julho/2026)

Verificado na sessão `mbr-pre` concluída em 12/08/2026:

| Campo do Pré-MBR | Conteúdo do time Produto | Exibido hoje no MBR? |
|---|---|---|
| Destaque "o que acelerou" | texto preenchido | Sim (card Preparação do líder) |
| Destaque "o que travou" | texto preenchido (jurídico / contrato gateway) | Sim |
| "Precisa de decisão" | texto preenchido (migração do financeiro) | Sim |
| Foco do mês | texto (agosto e setembro) | Sim |
| Itens priorizados | 3 itens | Sim (lista numerada) |
| Dependências cross-team | 2 itens ("Migração AIRA", "Jurídico apps") | **Não** — só aparece a contagem em badge |
| KRs contribuídos (`krFinalStates`) | 2 KRs de objetivo de outro time, ambos `not_started` / Atrasado | **Não** — sem objetivos próprios, nada é renderizado |
| Snapshot de KPI | 1 KPI congelado | **Não** — só renderiza justificativa/sem-dados, que estão vazias |
| Decisões | vazio | n/a |
| Sugestões de pauta | vazio | n/a |
| Justificativas de KPI / sem dados / projeto / KPIs sugeridos | vazios | n/a (renderizam quando houver) |

Ou seja: a promessa de "KPIs, destaques, próximos passos e decisões" hoje se cumpre só parcialmente para Produto. Faltam três blocos.

## Ajustes propostos

### 1. Dependências cross-team em texto
No card "Preparação do líder", trocar o badge de contagem por uma lista com os textos das dependências (mantendo o badge como cabeçalho da seção). É o item de maior valor para a reunião — dependências cross-team são pauta natural do MBR.

### 2. KRs contribuídos por times sem OKRs próprias
Quando o time não tem objetivos próprios, renderizar um bloco "Contribuições em KRs de outros times" a partir de `krFinalStates` (entradas com `isContributed: true`), mostrando: título do KR, time dono do objetivo, estado final e pace informados no Pré-MBR, e a justificativa de KR (`krJustifications`) quando houver. Títulos/donos resolvidos por lookup BU-scoped dos KR ids, no mesmo padrão de cache já usado para nomes de projetos/marcos.

### 3. KPIs do time no card do líder
Renderizar os `kpiSnapshots` do Pré-MBR (nome, valor congelado, meta, status/RAG e `impactAssessment` quando houver), em vez de depender apenas de justificativas. Assim um time sem OKRs próprias ainda mostra a leitura de indicadores que o líder fez.

### 4. Overview — coerência do rótulo
No card do time no Overview, quando não houver OKRs próprias, substituir "0 OKRs · 0 KRs" por um resumo do que existe: nº de KRs contribuídos, nº de KPIs, e sinalizadores de "precisa de decisão" / dependências.

## Notas técnicas

- Arquivos: `src/modules/okrs/components/wizards/mbr/MbrTeamOkrsDetailStep.tsx` (blocos 1–3) e `MbrTeamOkrsOverviewStep.tsx` (bloco 4).
- Mudanças apenas de apresentação: leem campos que já existem em `MbrPreTeamSubmission` (`nextSteps.crossDependencies`, `krFinalStates`, `krJustifications`, `kpiSnapshots`). Sem migração, sem alteração de seeding.
- Times sem OKRs próprias continuam fora das médias globais de OKR (comportamento já implementado).
- Lookup de KRs: query BU-scoped com colunas explícitas (sem `select('*')`), query key via `src/lib/queryKeys/okrs`.
