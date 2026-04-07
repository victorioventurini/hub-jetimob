

## Plano: Aumentar largura do modal de detalhe de KPI

### Arquivo impactado
`src/modules/kpis/components/KpiDetailDialog.tsx`

### Mudança
Trocar `max-w-2xl` (672px) por `max-w-3xl` (768px) nas duas ocorrências de `DialogContent`:

- **Linha 70** (estado de loading): `max-w-2xl` → `max-w-3xl`
- **Linha 139** (conteúdo principal): `max-w-2xl` → `max-w-3xl`

Isso dá ~96px a mais de largura, suficiente para acomodar todas as colunas da tabela (Data, Usuário, Anterior, Atual, Variação, Origem, Info, Ações) sem scroll horizontal.

### O que não muda
- Nenhuma alteração em `KpiValuesTable.tsx`
- Altura máxima e scroll vertical mantidos (`max-h-[90vh] overflow-y-auto`)

