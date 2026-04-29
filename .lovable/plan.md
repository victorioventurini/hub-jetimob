## Objetivo

Produzir um **único relatório Markdown** (`/mnt/documents/auditoria-campos-ritos.md`) auditando todos os campos dos 11 ritos do Hub (Cadeia Semanal, Mensal, Trimestral) à luz dos 4 critérios de remoção e das 2 dimensões de coerência (mesmos campos atravessam a cadeia / vocabulário unificado). O relatório é **somente leitura**: nenhum código, banco ou configuração será modificado.

Saída entregue como `<lov-artifact>` para download.

---

## Escopo (11 ritos)

**Cadeia 1 — Semanal (5):** Check-in Individual (`collaborator`), Pré-Check-in do Time (`leader-prep`), Check-in do Time (`team-checkin`), Pré-Weekly (`pre-weekly`), Weekly (`weekly`).

**Cadeia 2 — Mensal (2):** Pré-MBR (`mbr-pre`), MBR (`mbr`).

**Cadeia 3 — Trimestral (4):** Pré-QBR (`qbr-pre`), Pré-QBR Executivo (`qbr-pre-clevel`), QBR (`qbr-meeting`), Pós-QBR (`qbr-post`).

Excluídos: `team-okr-creation`, `team-kr-creation` (criação, fora do escopo da cadeia de gestão) e `clevel-checkin` (descontinuado).

---

## Procedimento técnico de extração

Para cada rito, três fontes vão ser cruzadas para listar todos os campos:

1. **Tipos TypeScript do draft/state** — `src/modules/okrs/types/wizard/{collaborator,leader-prep,team-checkin,weekly,mbr,qbr,...}.ts`. Aqui estão as interfaces que definem o shape persistido em `okr_wizard_sessions.payload`/`structure`.
2. **Steps do wizard** — `src/modules/okrs/components/wizards/<rito>/<Step>.tsx`. Cada step revela inputs reais (campos efetivamente preenchidos pelo usuário), enums de UI e categorias.
3. **Edge functions de sumarização** — `supabase/functions/{collaborator-checkin-summary,team-checkin-summary,weekly-curate-opening,mbr-summary,qbr-pre-summary,qbr-meeting-summary,qbr-post-summary,qbr-clevel-learnings-summary,qbr-executive-report}/index.ts`. Aqui se confirma quais campos são realmente **lidos** (consumidos a jusante). Campo presente no payload mas ausente em qualquer summary/report é forte candidato ao Critério 1.

**Sinais de consumo cross-rito** (para Critérios 1 e 3 + Dimensão A):
- `addendums` em `ritual_occurrences` / `okr_wizard_sessions`.
- `okr_decisions` (decisões salvas via `InlineDecisionInput`).
- Renderers em `src/modules/okrs/components/ritual-report/renderers/*Report.tsx` (mostram quais campos viram visualização permanente no histórico).
- Hooks que carregam o rito anterior dentro do rito seguinte (`useLastCompletedSession`, `usePreWeeklyData`, `useMbrPreData`, `useQbrPreData`, etc.) — o que é importado define o que **atravessa** a cadeia.

**Sinais de vocabulário** (Dimensão C):
- Listagem de todos os enums/uniões (`type Bloco = 'performance' | 'projetos' | 'pessoas'`, `type SinalPessoa = ...`) por rito.
- Cross-comparação dos rótulos exibidos (importados de `ritualLabels.ts` e dos próprios steps).

---

## Estrutura do relatório (`/mnt/documents/auditoria-campos-ritos.md`)

```text
# Auditoria de campos dos ritos
  Versão, data, escopo (11 ritos), método

## 1. Sumário executivo
  - Total de campos analisados
  - Total de candidatos à remoção (por critério 1/2/3/4)
  - Total de divergências de vocabulário
  - Total de divergências estruturais (Pré → principal)
  - Top 5 redundâncias críticas

## 2. Auditoria por rito (11 subseções)
  ### 2.1 Check-in Individual (collaborator)
  Tabela: | Campo | Tipo | Critério | Ação | Justificativa | Localização |
  Resumo: total / remover / renomear / manter
  ... (idem para cada um dos 11 ritos)

## 3. Análise da cadeia (Dimensão A — atravessa)
  ### 3.1 Cadeia Semanal
  Diagrama ASCII do fluxo de dados (Pré-Weekly → Weekly etc.)
  Tabela de incoerências estruturais
  ### 3.2 Cadeia Mensal
  ### 3.3 Cadeia Trimestral

## 4. Análise de vocabulário (Dimensão C — unificado)
  ### 4.1 Glossário atual
  Tabela: termo × como cada rito o usa
  ### 4.2 Conflitos identificados
  Tabela: conceito × variações × recomendação

## 5. Top 10 redundâncias críticas
  Lista ordenada por impacto, com (1) o que está duplicado, (2) onde aparece,
  (3) por que é problema, (4) recomendação concreta

## 6. Mapa de ações sugeridas
  Tabela consolidada: | Ação | Impacto | Complexidade | Prioridade |
  Esta tabela é o input para Etapa 2 (decisão) e Prompt 2 (refatoração).

## Apêndice
  - Lista de arquivos consultados (paths exatos)
  - Tabelas/views do banco consultadas (okr_wizard_sessions, ritual_occurrences,
    okr_decisions, ritual_addendums)
  - Notas sobre incertezas (campos com consumo incerto marcados explicitamente)
```

---

## Convenções e tom

- **Citação obrigatória de localização** em cada linha das tabelas (`src/modules/okrs/types/wizard/weekly.ts:42`, etc.) para facilitar revisão.
- **Critério violado**: `nenhum`, `1`, `2`, `3`, `4` (ou combinação `2+3`). Justificativa de **uma frase**.
- **Honestidade sobre incerteza**: campos cujo consumo não pôde ser determinado por leitura estática (ex.: lidos por agentes IA via prompt dinâmico) são marcados como `consumo incerto, requer revisão manual` e não contam como remoção.
- **Sem hedge linguístico**, sem repetição entre seções, tabelas bem formatadas.
- **Tamanho estimado**: 80–120 KB de Markdown.

---

## Procedimento operacional

1. Ler em paralelo todos os arquivos de `src/modules/okrs/types/wizard/*.ts` e os `index.ts`/steps de cada pasta de wizard.
2. Ler todas as edge functions de summary/report para mapear consumo.
3. Inspecionar `okr_wizard_sessions` (sample de payloads recentes por persona) com `supabase--read_query` apenas em modo leitura, para confirmar quais chaves do JSONB são efetivamente usadas (sinaliza Critério 1 quando campo aparece sempre `null`/ausente).
4. Construir dicionários intermediários em memória: `persona → { campos[], enums[], steps[], consumido_em[] }` e `termo → { ritos_onde_aparece[], significado_em_cada_um[] }`.
5. Renderizar Markdown via script Node/Bash em `/tmp/`, escrevendo direto em `/mnt/documents/auditoria-campos-ritos.md`.
6. **QA do relatório**: validar (a) presença das 11 seções 2.X, (b) cada cadeia tem diagrama na Seção 3, (c) Seção 4 tem glossário e conflitos, (d) Seção 6 entrega tabela acionável. Não convertemos para imagem — Markdown puro é o entregável.
7. Emitir `<lov-artifact>`.

---

## Notas de escopo

- **Não modifica** nenhum arquivo do projeto, nenhuma migração, nenhuma configuração.
- **Não propõe SQL de remoção** — o relatório é insumo da Etapa 2 (decisão) e do Prompt 2 (refatoração), não a refatoração em si.
- **Cobertura honesta**: se a leitura estática + samples de payload não conseguirem determinar o consumo de um campo, ele entra como "consumo incerto" e fica fora da contagem de candidatos à remoção. Isso protege contra falso positivo.
- **Saída final**: um arquivo `auditoria-campos-ritos.md` em `/mnt/documents/`, entregue como artifact.
