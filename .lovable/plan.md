## Contexto

Em `/kpis?view=table`, a coluna **"Área"** mostra um trio canônico de badges para cada KPI (`KpiDashboardTable.tsx` linhas 154-167):

```tsx
{kpi.area && <AreaBadge area={kpi.area} />}
{kpi.team && <Badge variant="outline"><Users />{kpi.team.name}</Badge>}
<KpiScopeBadge scope={kpi.scope} buName={currentBu?.name} />  // só renderiza se scope === 'org'
```

No step de KPIs do rito Colaborador (`CollaboratorKpiStep.tsx`, linhas 196-216), o "KPI Info Card" só mostra os badges **Tipo** (`INDICATOR_TYPE_LABELS`), **RAG** e (opcional) "Precisa atualização" — **não há sinalização do escopo** (área / time / global).

O tipo `KpiForWizardV2` (`src/modules/kpis/types.ts` linhas 376-424) já expõe `area`, `team` e `scope` — não é preciso buscar dados extras.

## Mudança proposta (UI/apresentação, arquivo único)

Arquivo: `src/modules/okrs/components/wizards/collaborator/CollaboratorKpiStep.tsx`

1. **Importar** os componentes canônicos já existentes:
   - `AreaBadge` (de onde já está sendo usado em `KpiDashboardTable`).
   - `KpiScopeBadge` de `@/modules/kpis/components/KpiScopeBadge`.
   - `Users` (lucide-react) para o badge de time.
   - `useBu()` (`@/contexts/BuContext`) para obter `currentBu?.name` (mesmo padrão do `KpiDashboardTable`).

2. **Inserir os badges de escopo** dentro da `<div className="flex items-center gap-2 mt-2 flex-wrap">` (linhas 202-215), na sequência canônica usada na tabela (Área → Time → Global), logo após os badges existentes:

   ```tsx
   {kpi.area && <AreaBadge area={kpi.area} />}
   {kpi.team && (
     <Badge variant="outline" className="text-xs whitespace-nowrap gap-1">
       <Users className="h-3 w-3" />
       {kpi.team.name}
     </Badge>
   )}
   <KpiScopeBadge scope={kpi.scope} buName={currentBu?.name} />
   ```

3. **Não duplicar**: usar exatamente os mesmos componentes/markup da tabela — nada de variantes novas. `KpiScopeBadge` já tem early return quando `scope !== 'org'`, então não polui o card para KPIs de área/time.

## Resultado visual esperado

- KPI de **área** (ex.: EBITDA com `area`): aparece o `AreaBadge` colorido com o nome da área.
- KPI de **time**: badge outline com ícone de pessoas + nome do time.
- KPI **global** (`scope='org'`): badge azul claro "🌐 Global" com tooltip "Indicador global da BU {nome}".
- KPIs com mais de um vínculo (raro, mas possível): badges aparecem juntos, igual à tabela.

## Fora de escopo

- Qualquer outra mudança no step (delta, RAG, notes, sparkline, footer).
- Outros wizards/ritos (Team, Manager, MBR, QBR) — esta task é específica do step do Colaborador conforme URL informada.
- Criação de novo componente — proibido por princípio de SSOT; reaproveitamos o trio já existente.
