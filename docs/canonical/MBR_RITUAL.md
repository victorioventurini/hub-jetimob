# MBR Ritual — Pré-MBR + MBR v2

**Versão:** 1.0.0
**Última atualização:** 2026-05-04
**Categoria:** NORMATIVO
**Referências:** TCR v3.30.0 · `mem://features/rituals/mbr-v2-standard` · `mem://features/okrs/cycles-and-rituals-master`

---

## 1. Visão Geral

O ciclo MBR (Monthly Business Review) é composto por **dois ritos**:

| Rito | Rota | Quem executa | Cadência | Entrada |
|------|------|--------------|----------|---------|
| **Pré-MBR (v1)** | `/rituals/mbr-pre` | Líder do time | Mensal | KPIs / KRs / Projects / Iniciativas do time no mês de referência |
| **MBR v2** | `/rituals/mbr-v2` | Líder de Org / C-level | Mensal | Pré-MBRs já preenchidos, agrupados por **Org Objective + severidade** |

> O MBR v2 **consome o Pré-MBR v1 sem alteração**. O v1 permanece intacto.

## 2. Pré-MBR (`/rituals/mbr-pre`)

### 2.1 Steps

1. **KPI Gate** — `MbrPreKpiGateStep`
2. **KR Analysis** — `MbrPreKrAnalysisStep`
3. **Projects** — `MbrPreProjectsStep`
4. **Initiatives**
5. **Decisions / Highlights / People Signals**
6. **Review & Submit**

### 2.2 Regra crítica — Mês de Referência

**A análise de KPIs e KRs considera apenas dados do mês de referência.** Valores de meses futuros NÃO contaminam a classificação de saúde.

Implementação:

- Hook: `useMbrPreTeamKpisMonthly(teamId, referenceMonth)` — agrega snapshots mensais ancorados ao fim do `referenceMonth`.
- Classificador: `classifyKpiGateBucketsFromMonthlySnapshots()` em `src/modules/okrs/components/wizards/shared/framework/config/stepContentAdapters.ts`.
- Reconciliação: `reconciledSnapshots` em `MbrPreKpiGateStep` mescla snapshots mensais com persistidos no draft.

**Buckets do KPI Gate (Pré-MBR):** `overdue` · `critical` · `attention` · `healthy`. Não inclui `guardrailViolated` nem `teamContext` (esses pertencem ao gate genérico).

### 2.3 Resilient Drafts

Drafts antigos podem não ter `projectJustifications`. **Sempre** usar fallback:

```tsx
// MbrPreProjectsStep.tsx
const safeProjectJustifications = useMemo(() => ({
  projects: projectJustifications?.projects ?? {},
  milestones: projectJustifications?.milestones ?? {},
}), [projectJustifications]);
```

E no caller (`MbrPrePage.tsx`):

```tsx
projectJustifications={draft.projectJustifications ?? { projects: {}, milestones: {} }}
onProjectJustificationChange={(id, value) => {
  const current = draft.projectJustifications ?? { projects: {}, milestones: {} };
  updateDraft({ projectJustifications: { ...current, projects: { ...current.projects, [id]: value } } });
}}
```

Ver Padrão **Q.1 Resilient Draft Hydration** em `DEVELOPMENT_STANDARDS.md`.

### 2.4 Persistência

Draft persistido via `useMbrPreDraft` (upsert único por `team_id + reference_month`).

## 3. MBR v2 (`/rituals/mbr-v2`)

### 3.1 Agrupamento

A view do v2 agrupa Pré-MBRs por **Org Objective** e ordena cada grupo por **severidade** (overdue → critical → attention → healthy).

### 3.2 Acesso UI

- Sidebar → **Ritos** → **MBR v2**.
- Permissão: `rituals.mbr.view:bu` (líderes de área e acima).

### 3.3 Read-Only do Pré-MBR

O MBR v2 **não edita** dados do Pré-MBR. Adições do v2 ficam em addendums imutáveis (ver `mem://features/rituals/ritual-addendum-standard`).

## 4. Avaliação Anônima

MBR v2 e Pré-MBR suportam coleta anônima de feedback via `/p/r/:shortCode` (globalClient PRE-BU + RPCs SECURITY DEFINER). Ver `mem://features/rituals/anonymous-evaluation-standard`.

## 5. Glossário rápido

| Termo | Definição |
|-------|-----------|
| `referenceMonth` | Primeiro dia do mês analisado (ex: `2026-04-01`) |
| `MonthlyKpiSnapshotForGate` | Tipo do snapshot consumido pelo classificador |
| `safeProjectJustifications` | Memo defensivo para drafts antigos |

## 6. Memórias relacionadas

- `mem://features/rituals/mbr-v2-standard`
- `mem://features/okrs/cycles-and-rituals-master` (MBR v1.2 + governança)
- `mem://features/kpis/kpis-master-standard` (6-bucket KPI Gate)
- `mem://features/rituals/anonymous-evaluation-standard`
- `mem://features/rituals/ritual-addendum-standard`
