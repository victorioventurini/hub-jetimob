

# Plano: Agrupar KPIs por Escopo no Step 1 do MBR

## Contexto

Atualmente o Step 1 (Panorama Executivo) exibe todos os KPIs em uma lista plana, sem distinção de escopo. Os KPIs no banco possuem o campo `scope` (`org`, `area`, `team`) e relações com `area_id` e `team_id`, permitindo agrupamento natural.

## Alterações

### 1. Expandir `MbrKpiSnapshot` com campos de agrupamento

**Arquivo:** `src/modules/okrs/types/wizard.ts`

Adicionar campos opcionais ao `MbrKpiSnapshot`:

```typescript
export interface MbrKpiSnapshot {
  // ... campos existentes
  scope?: 'org' | 'area' | 'team';
  areaId?: string | null;
  areaName?: string | null;
  areaColor?: string | null;
  teamId?: string | null;
  teamName?: string | null;
}
```

### 2. Enriquecer o seeding no MbrPage com area/team

**Arquivo:** `src/modules/okrs/pages/MbrPage.tsx`

- Trocar `useKpisForWizard({})` por uma query dedicada que busca **todos** os KPIs ativos da BU (sem filtro de owner/team), incluindo os joins de `area` e `team`:
  - `select('id, name, ..., scope, area_id, team_id, area:areas!kpi_metrics_area_id_fkey(id, name, color), team:teams!kpi_metrics_team_id_fkey(id, name)')`
- Filtrar para excluir `indicator_type = 'metric'` (somente KPIs, conforme requisito)
- Mapear `scope`, `areaId`, `areaName`, `areaColor`, `teamId`, `teamName` nos snapshots

### 3. Refatorar MbrPanoramaStep para exibir em 3 grupos

**Arquivo:** `src/modules/okrs/components/wizards/mbr/MbrPanoramaStep.tsx`

Substituir o grid plano por seções agrupadas usando `Accordion` (expandido por padrão):

```text
+------------------------------------------+
| Panorama Executivo           [X KPIs]    |
+------------------------------------------+
| [!] Y KPIs em atenção                    |
+------------------------------------------+
|                                          |
| >> KPIs Globais da BU (N)                |
|   [Card] [Card]                          |
|                                          |
| >> KPIs por Área                         |
|   --- Operações (3) ---                  |
|   [Card] [Card] [Card]                   |
|   --- Comercial (2) ---                  |
|   [Card] [Card]                          |
|                                          |
| >> KPIs por Time                         |
|   --- Dev Backend (2) ---                |
|   [Card] [Card]                          |
|   --- Vendas Inside (1) ---              |
|   [Card]                                 |
|                                          |
+------------------------------------------+
| [Decisão inline]                         |
| [Analisar KPIs Críticos >>]              |
+------------------------------------------+
```

Lógica de agrupamento:
- Usar `useMemo` para separar snapshots em 3 arrays: `orgKpis` (scope=org), `areaGroups` (scope=area, agrupados por areaName), `teamGroups` (scope=team, agrupados por teamName)
- Cada grupo mantém a ordenação RAG (red > yellow > green)
- Usar `Accordion` com `type="multiple"` e `defaultValue` com todos os grupos abertos
- Areas exibem `AreaBadge` no cabeçalho do subgrupo (conforme `AREA_BADGE_STANDARD.md`)
- Seções vazias são ocultadas automaticamente

### 4. Atualizar testes

**Arquivo:** `src/modules/okrs/components/wizards/mbr/__tests__/MbrPanoramaStep.test.tsx`

- Atualizar fixtures com os novos campos (`scope`, `areaName`, `teamName`)
- Adicionar testes para: renderização dos 3 grupos, ocultamento de grupo vazio, ordenação RAG dentro de cada grupo

## Detalhes Técnicos

- `useKpisForWizard` atual filtra por `owner_user_id` ou `team_id` -- para o MBR precisamos de **todos** da BU. Criaremos a query inline no `useEffect` do MbrPage (pattern já usado no `loadPrevious`) em vez de modificar o hook compartilhado.
- Os campos adicionados ao `MbrKpiSnapshot` são opcionais (`?`) para manter backward compatibility com drafts já salvos.
- O componente `AreaBadge` será usado conforme padrão canônico (outline + cor da área).
- Nenhuma migração de banco necessária.

