

## Fase 1 — Expansão dos OKRs Organizacionais no MBR

### Resumo

Refatorar o passo "OKRs Organizacionais" do MBR para exibir Key Results detalhados com `OkrProgressBar` e `OkrStatusBadge`, usando `WizardStepScaffold` para layout estável. Três arquivos editados, zero componentes novos.

---

### 1. Tipagem — `src/modules/okrs/types/wizard.ts`

Expandir `MbrOrgOkrSnapshot` (linhas 197-204) adicionando campo `keyResults` com a mesma estrutura já usada em `MbrTeamOkrObjectiveSnapshot.keyResults`:

```typescript
export interface MbrOrgOkrSnapshot {
  objectiveId: string;
  title: string;
  progress: number;
  status: string;
  trend: 'improving' | 'stable' | 'declining';
  remainsStrategicPriority: boolean;
  keyResults: Array<{
    krId: string;
    title: string;
    progress: number;
    status: string;
    ownerName: string | null;
    baseline: number;
    current: number;
    target: number;
    direction: 'up' | 'down';
    unit: string;
    lastCheckinAt: string | null;
  }>;
}
```

### 2. Seeding — `src/modules/okrs/pages/MbrPage.tsx`

No `useEffect` de seeding (linhas 424-457), expandir o mapeamento para incluir `keyResults` a partir de `obj.key_results` (que já vem via `useOrgObjectives` com `orgObjectiveWithKrs`):

```typescript
return {
  objectiveId: obj.id,
  title: obj.title,
  progress: Math.round(avgProgress),
  status: obj.status,
  trend,
  remainsStrategicPriority: true,
  keyResults: krs.map((kr: any) => ({
    krId: kr.id,
    title: kr.title,
    progress: /* calculateProgress usando baseline/current/target/direction */,
    status: kr.status || 'not_started',
    ownerName: kr.owner?.full_name ?? null,
    baseline: Number(kr.baseline ?? 0),
    current: Number(kr.current_value ?? 0),
    target: Number(kr.target ?? 0),
    direction: (kr.direction || 'up') as 'up' | 'down',
    unit: kr.unit || '%',
    lastCheckinAt: kr.last_checkin_at ?? null,
  })),
};
```

### 3. UI — `src/modules/okrs/components/wizards/mbr/MbrOrgOkrsStep.tsx`

Refatoração completa:

- **Layout**: Migrar de `div` + `ScrollArea` manual para `WizardStepScaffold` (header/footer fixos, scroll no meio)
- **Por Objetivo**: Manter card com título, trend, progresso agregado e seletor Sim/Não
- **KRs expandidos**: Dentro de cada card de objetivo, listar KRs usando:
  - `OkrStatusBadge` (status RAG do KR)
  - `OkrProgressBar` (baseline/current/target/direction/status/unit, `size="sm"`)
  - Título do KR com `truncate`
  - Owner name inline (se disponível)
- **Gate**: Lógica inalterada — OKRs marcados "Não" exigem decisão via `InlineDecisionInput`
- **Footer**: Via `WizardStepFooter` dentro do scaffold, com mensagem de bloqueio quando aplicável

### 4. Teste — `src/modules/okrs/components/wizards/mbr/__tests__/MbrOrgOkrsStep.test.tsx`

Atualizar `createOkr` helper para incluir `keyResults: []` por padrão. Adicionar caso de teste verificando renderização de KRs quando presentes.

### Arquivos tocados

| Arquivo | Ação |
|---|---|
| `src/modules/okrs/types/wizard.ts` | Expandir `MbrOrgOkrSnapshot` |
| `src/modules/okrs/pages/MbrPage.tsx` | Expandir seeding com `keyResults` |
| `src/modules/okrs/components/wizards/mbr/MbrOrgOkrsStep.tsx` | Refatorar UI com scaffold + componentes canônicos |
| `src/modules/okrs/components/wizards/mbr/__tests__/MbrOrgOkrsStep.test.tsx` | Atualizar helper e adicionar teste de KRs |

### Componentes reutilizados (zero criação)

- `WizardStepScaffold` (shared)
- `OkrProgressBar` (canônico)
- `OkrStatusBadge` (canônico)
- `InlineDecisionInput` (shared)
- `WizardStepHeader` / `WizardStepFooter` (shared)

