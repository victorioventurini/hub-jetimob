## Objetivo

Gerar um único documento `Markdown` em `/mnt/documents/ritos-hub-jet.md` descrevendo **todos os 12 ritos ativos** do Hub da Jet, no maior nível de profundidade possível extraído das memórias canônicas, do SSOT de labels (`src/modules/okrs/constants/ritualLabels.ts`), das specs de wizards e da governança de ciclos. Exclui apenas os ritos de **criação** (`team-okr-creation`, `team-kr-creation`).

Entrega como **artifact** (`<lov-artifact>`) para download/preview.

---

## Escopo dos 12 ritos

**Semanais — escopo time/individual:**
1. Check-in Individual (`collaborator`)
2. Pré-Check-in do Time (`leader-prep`)
3. Check-in do Time (`team-checkin`)
4. Check-in Executivo (`clevel-checkin`)

**Semanais — destilação + BU:**
5. Pré-Weekly (`pre-weekly`, v2)
6. Weekly (`weekly`, v2)

**Mensais:**
7. Pré-MBR (`mbr-pre`, v3)
8. MBR (`mbr`, v4)

**Trimestrais — família QBR:**
9. Pré-QBR (`qbr-pre`, v3)
10. Pré-QBR Executivo (`qbr-pre-clevel`)
11. QBR (`qbr-meeting`, v4)
12. Pós-QBR (`qbr-post`, v4)

---

## Estrutura do documento

```text
# Ritos de Gestão — Hub da Jet
  Versão, data, fonte, escopo, sumário

## 1. Arquitetura de Cadência
  - Filosofia (Pré→Rito; individual→coletivo; semanal→mensal→trimestral)
  - Diagrama ASCII do fluxo completo
  - Regra de substituição MBR↔QBR no M3 do quarter
  - Materialização em `ritual_occurrences` e cálculo de janelas em dias úteis
  - Acessibilidade off-cycle (quais ritos sobrevivem sem ciclo ativo)

## 2. Conceitos transversais (aplicam-se a todos os ritos)
  - Wizard framework v2/v3/v4 e versionamento de structure
  - Rascunho (draft) único por autor+time, isolamento e re-hidratação
  - CompletedRitualView read-only + addendums imutáveis
  - Reabertura por BU Admin (backup pre_reopen_backup)
  - InlineDecisionInput ubíquo (exceto closing/summary)
  - Avaliações de participantes (1–5 + feedback) em addendums JSONB
  - PreparationStatusCard (5 modos × 4 estados)
  - HierarchyContextSwitcher para ritos team-scope
  - Decisões: scope self/team/area/all em /decisions

## 3. Calendário e janelas (tabela única consolidada)
  Tabela: persona | frequência | gerado em | janela em dias úteis | gates | bloqueios

## 4. Catálogo dos 12 ritos
  Para cada rito, uma seção com este template fixo:

  ### N. <Nome canônico> (`slug`, vN)
  - **Resumo executivo** (1 parágrafo)
  - **Quem participa** (persona, permissões, RBAC)
  - **Quando ocorre** (frequência, janela em dias úteis, materialização em occurrences)
  - **Steps detalhados** (lista numerada com title/subtitle do SSOT + descrição
    do conteúdo de cada step extraído do código do wizard)
  - **Gates e bloqueios**
  - **Saída e snapshots** (drafts, snapshots imutáveis, addendums)
  - **Integração com outros ritos** (alimenta / é alimentado por)
  - **Particularidades técnicas** (rota, agentes IA, edge functions, hooks
    chave, tabelas: okr_wizard_sessions, ritual_occurrences, ritual_cadences)
  - **Antipadrões** (o que NÃO é o rito)

## 5. Apêndices
  A. Tabela de personas (slug → label canônico)
  B. Mapa de substituição MBR↔QBR no quarter
  C. Checklist do facilitador por rito
  D. Glossário (BU, KR, KPI, RAG, addendum, snapshot, occurrence, cadence)
  E. Referências cruzadas (paths de código + memórias canônicas consultadas)
```

---

## Fontes de verdade que serão consolidadas

**Memórias acessíveis (já lidas):**
- `mem://features/rituals/ritual-addendum-standard`
- `mem://features/rituals/ritual-reopen-mechanism`
- `mem://features/rituals/participant-evaluations-standard`
- `mem://features/rituals/off-cycle-accessibility-standard`
- `mem://features/rituals/collaborator-checkin-pending-items-step`
- `mem://features/rituals/scorecard-evaluation-cycle-standard`
- `mem://features/rituals/cross-team-scorecard-visibility-logic`
- `mem://ui/rituals/hierarchy-context-switcher-standard`
- `mem://features/decisions/scope-resolution-standard`
- `.lovable/memory/features/rituals/*.md` (4 arquivos)
- `.lovable/memory/features/okrs/{mbr-*,ritual-*,management-*}.md`

**Código fonte:**
- `src/modules/okrs/constants/ritualLabels.ts` (SSOT de labels)
- `src/modules/okrs/constants/ritualWizardTypes.ts`
- `src/modules/okrs/types/wizard/*.ts` (core, weekly, etc.)
- `src/modules/okrs/components/wizards/{collaborator,leader-prep,team-checkin,clevel-checkin,pre-weekly,weekly,mbr-pre,mbr,qbr-pre,qbr-pre-clevel,qbr-meeting,qbr-post}/*.tsx`
- `src/modules/okrs/pages/ritual-calendar/constants.ts`

**Documentos canônicos:**
- `docs/canonical/WIZARDS_FRAMEWORK_BOUNDARY.md`
- `docs/canonical/AI_AGENTS_PHILOSOPHY.md` (referência)

---

## Procedimento técnico de geração

1. **Leitura ampla**: para cada um dos 12 ritos, abrir o `index.ts` da pasta do wizard e os 2–3 steps mais representativos para extrair os campos do draft, gates e textos de UI canônicos.
2. **Extração estruturada**: montar dicionário `persona → { steps[], gates[], drafts, integrações }` em memória.
3. **Renderização Markdown** via script Node/Bash em `/tmp/`, escrevendo direto em `/mnt/documents/ritos-hub-jet.md`.
4. **QA**: ler de volta o arquivo gerado, validar (a) presença das 12 seções, (b) tabela de calendário com 12 linhas, (c) sumário com âncoras, (d) ausência de ritos de criação (`team-okr-creation`, `team-kr-creation`).
5. **Entrega**: emitir `<lov-artifact path="ritos-hub-jet.md" mime_type="text/markdown">`.

---

## Notas de escopo

- **NÃO inclui** `team-okr-creation` nem `team-kr-creation` (criação de OKRs/KRs).
- **Inclui** os históricos `mbr-first` e `mbr-pre-first` apenas em nota de rodapé (back-compat), não como ritos do catálogo.
- O documento é descritivo (não é manual operacional puro nem spec técnica de implementação) — segue o nível "Completo" pedido: tudo que existe nas memórias canônicas + SSOT de código.
- Tamanho estimado: 40–60 KB de Markdown.

---

## Detalhes técnicos relevantes

- Localização final: `/mnt/documents/ritos-hub-jet.md`.
- Sem dependências externas; geração via `bash`/`node` com heredoc.
- Sem alterações no codebase do projeto.
