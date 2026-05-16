# Módulo Rituais — Canonical

**Slug:** `rituals` · **Status:** ✅ Ativo
**Master/SSOT:** `mem://features/rituals/rituals-master-standard`
**QBR Master:** `mem://features/rituals/qbr-master-standard`
**Ciclos & cadências:** `mem://features/okrs/cycles-and-rituals-master`
**Wizards Framework:** `mem://architecture/wizards/wizards-master-standard`

> Especificações completas (steps, gates, summaries, addendums, reopen, evaluations, decisões inline) estão nos Masters. Este arquivo é o **mapa funcional** dos ritos.

## Wizards Check-in (semanais/mensais)

| Wizard | Rota | Frequência | Participante |
|---|---|---|---|
| Collaborator Check-in | `/rituals/collaborator-checkin` | Semanal (sexta) | Colaborador |
| Pré Check-in do Time | `/rituals/team-checkin-pre` | Semanal (segunda) | Líder de time |
| Team Check-in | `/rituals/team-checkin` | Semanal | Líder + membros |
| Managers Check-in | `/rituals/managers-checkin` | Quinzenal/Mensal | Gestores de área |
| C-Level Check-in | `/rituals/clevel-checkin` | Mensal | C-Level/Diretores |
| MBR | `/rituals/mbr` | Mensal | BU Admin |
| MBR v2 | `/rituals/mbr-v2` | Mensal (paralelo) | BU Admin |

**Pré-Weekly v2 / Weekly v2:** detalhes no Master `rituals-master-standard`.

## QBR (Quarterly) — 4 fases

| Fase | Rota | Participante | Guard |
|---|---|---|---|
| 1. Pré-QBR (Líderes) | `/rituals/qbr-pre` | Líder de time | `RitualRoute` |
| 2. Pré-QBR (C-Level) | `/rituals/qbr-clevel` | C-Level / BU Admin | `requiresBuAdmin` |
| 3. Reunião QBR | `/rituals/qbr` | BU Admin | `requiresBuAdmin` |
| 4. Pós-QBR | `/rituals/qbr-post` | BU Admin | `requiresBuAdmin` |

**Controle de abertura:** `cycles.qbr_status` (`open` | `collecting` | `closed`). Pré-QBR disponível só com `qbr_status IN ('open','collecting')`.

## QBR Executive Report

`/okrs/executive/qbr-report?cycle=<id>` — acessível a **todos** da BU. Snapshot em `okr_wizard_sessions` (`wizard_type='qbr-executive-report'`).

Estrutura: Resumo Narrativo (IA Gemini) → Evolução de Indicadores → Ponto Crítico (MRR Churn × Commit × Expansion × Mkt) → Como Chegamos Aqui (OKRs Org).

## Pré-MBR — KPI Gate Reference-Month (v3.30.0)

Ancorado ao **mês de referência** via `classifyKpiGateBucketsFromMonthlySnapshots` + `useMbrPreTeamKpisMonthly` — elimina contaminação por meses futuros. `safeProjectJustifications` + fallback `?? { projects: {}, milestones: {} }` em `MbrPrePage` para drafts antigos.

## Características comuns

- Full-page (modal removido v2.27.0)
- Draft auto-save
- Snapshot imutável ao concluir
- Step-based com validação
- Integração com ciclo trimestral ativo
- AI Agents reutilizados — **nunca criar agente por cadência/rito/persona/formato** (`mem://standards/ai/ai-master-standard`)

## Edge Functions de Summary

`qbr-pre-summary`, `qbr-meeting-summary`, `qbr-post-summary`, `mbr-summary` — padrão multi-agente IA (analista-kpis, facilitador-decisoes, revisor-comunicacao) + idempotência via `summary_sent_at`.

Padrão técnico: `mem://backend/edge-function-standard-v4` + `mem://backend/edge-function-performance-standard`.

## Wizards Framework

Fora de OKR usar `@/wizards-framework` (shell, draft, snapshot, scaffold, footer, decisões inline). Boundary: `docs/canonical/WIZARDS_FRAMEWORK_BOUNDARY.md`.

## Permissões

`rituals.*` keys; rituals C-Level/MBR/QBR exigem `bu_admin`. Templates em `RBAC_TEMPLATES_V3.md`.

## Avaliação anônima

Ver `docs/canonical/ANONYMOUS_RITUAL_EVALUATION.md`.

## Referências

- Master: `mem://features/rituals/rituals-master-standard`
- QBR: `mem://features/rituals/qbr-master-standard`
- Ciclos: `mem://features/okrs/cycles-and-rituals-master`
- Wizards: `mem://architecture/wizards/wizards-master-standard`
- Boundary: `docs/canonical/WIZARDS_FRAMEWORK_BOUNDARY.md`
- AI safety: `mem://standards/ai/ai-master-standard`
