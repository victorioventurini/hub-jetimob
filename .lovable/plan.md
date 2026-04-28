## Objetivo

Quando uma KPI tiver time vinculado (`kpi.team`), exibir um **badge com o nome do time** ao lado do `AreaBadge` na coluna **Área** do `KpiDashboardTable`.

## Estado atual

- Coluna "Área" hoje renderiza `AreaBadge` + `KpiScopeBadge` (escopo).
- O nome do time aparece como subtexto cinza abaixo do nome do indicador (linhas 143-145 de `KpiDashboardTable.tsx`).
- `kpi.team` (id + name) já vem no payload — não há mudança de hook/query.

## Alteração

**Arquivo:** `src/modules/kpis/components/KpiDashboardTable.tsx`

1. **Coluna Área (linhas 156-165)** — adicionar badge de time logo após o `AreaBadge`:
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
   - Importar `Users` de `lucide-react`.
   - O wrapper já tem `flex-wrap gap-1.5`, então não precisa de mudança de layout.
   - O fallback `—` (quando não há área e scope ≠ org) é mantido apenas se também não houver time.

2. **Coluna Indicador (linhas 143-145)** — remover o subtexto cinza com nome do time, já que agora ele está como badge na coluna correta. Evita duplicação visual.

3. **Skeleton (linha 80)** — opcional: aumentar largura do skeleton da coluna Área para acomodar o segundo badge.

## Fora do escopo

- `KpiCard` (vista de cards) — não foi mencionado pelo usuário; o time já aparece no card como linha separada.
- Mudanças em hook/query: `kpi.team` já é hidratado.
- Mudanças no badge de área (`AreaBadge`).

## Validação

- Inspecionar `/kpis` em vista tabela: KPIs com escopo `team` devem mostrar `[Área] [👥 Time] [Escopo]`.
- KPIs `org`/`area` sem time vinculado devem manter aparência atual.
