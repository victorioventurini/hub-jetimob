

# Plano: Novo Step "OKRs dos Times" no MBR Wizard

## Contexto

Atualmente o MBR possui 5 steps: Panorama Executivo, KPI Gate, OKRs Org, Decisoes, Encerramento. O pedido e inserir um novo "grande step" entre KPI Gate e OKRs Org, dividido em duas sub-etapas:

1. **Overview dos Times** -- visao consolidada de saude/progresso de todos os times
2. **Analise por Time** -- drill-down sequencial em cada time com OKRs

A ordem final do wizard sera:
```text
panorama -> kpi-gate -> team-okrs-overview -> team-okrs-detail -> org-okrs -> decisions -> closing
```

---

## 1. Tipos (`src/modules/okrs/types/wizard.ts`)

### 1.1 Expandir `MbrStep`

```typescript
export type MbrStep = 'panorama' | 'kpi-gate' | 'team-okrs-overview' | 'team-okrs-detail' | 'org-okrs' | 'decisions' | 'closing';
```

### 1.2 Adicionar `TeamCheckinDecisionSourceStep`

Adicionar `'team-okrs-overview'` e `'team-okrs-detail'` ao union de source steps.

### 1.3 Novo tipo: `MbrTeamOkrSnapshot`

```typescript
export interface MbrTeamOkrSnapshot {
  teamId: string;
  teamName: string;
  objectives: Array<{
    objectiveId: string;
    title: string;
    progress: number;
    status: string;
    krCount: number;
    krsAtRisk: number;
    krsStagnant: number;
    trend: 'improving' | 'stable' | 'declining';
  }>;
  healthScore: number;
  healthStatus: 'healthy' | 'attention' | 'risk';
  reviewed: boolean; // marca se o lider ja revisou este time
}
```

### 1.4 Expandir `MbrDraftData`

Adicionar `teamOkrSnapshots: MbrTeamOkrSnapshot[]` e `currentTeamIndex: number` (para saber em qual time esta no detail).

---

## 2. Data Seeding (`src/modules/okrs/pages/MbrPage.tsx`)

### 2.1 Buscar times gerenciaveis + objetivos

- Usar `useManageableTeams()` para listar todos os times da BU que o admin pode ver.
- Criar uma query que busca `okr_team_objectives` com KRs para o ciclo ativo, agrupando por `team_id`.
- Para cada time, calcular: `healthScore`, `healthStatus`, `trend`, contagens de KRs at risk/stagnant.

### 2.2 Auto-seed `teamOkrSnapshots`

Mesmo padrao dos KPIs e OKRs Org: `useEffect` + ref + seed quando draft vazio.

### 2.3 Atualizar `WIZARD_STEPS` e `STEP_ORDER`

Inserir os dois novos steps no array de configuracao, entre `kpi-gate` e `org-okrs`.

### 2.4 Loading guard

Adicionar loading dos dados de team OKRs ao guard existente.

---

## 3. Componente: `MbrTeamOkrsOverviewStep.tsx`

Pagina de overview consolidado. Mostra:

- Header: "OKRs dos Times" com badge de contagem
- Resumo executivo: cards com metricas globais (total de times, times saudaveis, em atencao, em risco)
- Lista de times em formato similar ao `TeamSummaryList` existente, mas inline (sem abrir nova aba):
  - Avatar + nome do time + lider
  - Badge de saude (healthy/attention/risk)
  - Contagem de objetivos e KRs
  - Indicador de trend
- Ordenacao: risco primeiro, depois atencao, depois saudavel
- Decisao inline para anotacoes gerais sobre panorama dos times
- Footer: "Analisar Times" para avancar ao detail

---

## 4. Componente: `MbrTeamOkrsDetailStep.tsx`

Analise sequencial time-a-time:

- Header: nome do time atual + navegacao "Time 1 de N" com setas
- Para cada time, lista seus objetivos com:
  - Titulo + progresso + status RAG
  - KRs resumidos (titulo + owner + status + last checkin)
  - Badge de saude por objetivo
- Checkbox "Revisado" que marca `reviewed: true` no snapshot
- Decisao inline por time (sourceStep: `'team-okrs-detail'`)
- Gate: so avanca se **todos os times com OKRs** estiverem marcados como "revisados"
- Footer: "Prosseguir para OKRs Org"

---

## 5. Barrel Export (`src/modules/okrs/components/wizards/mbr/index.ts`)

Adicionar exports para os dois novos componentes.

---

## 6. Testes (`__tests__/MbrTeamOkrsSteps.test.tsx`)

- Renderizacao do overview com times mock
- Renderizacao do detail com navegacao entre times
- Gate: botao desabilitado quando nem todos os times estao revisados
- Times sem OKRs aparecem mas nao exigem revisao

---

## Detalhes Tecnicos

- Os novos steps seguem o padrao canonico: `WizardStepHeader` + `ScrollArea` + `WizardStepFooter` + `InlineDecisionInput`
- O `currentTeamIndex` no draft persiste a posicao de navegacao entre times no detail
- `useManageableTeams()` ja retorna todos os times da BU para admins (permissao MBR)
- A query de team objectives usa `useTeamObjectives` existente ou query dedicada com `OKR_FIELDS.teamObjectiveWithKrs`
- Nenhuma migracao de banco necessaria
- ~4 arquivos novos, ~3 arquivos editados

