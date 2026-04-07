

## Correção: AddKpiValueDialog sendo bloqueado pelo KpiDetailDialog

### Pré-checklist

| Doc | Consultado |
|-----|-----------|
| TCR v3.22.0 | ✅ — Referenciado via DEVELOPMENT_STANDARDS |
| DEVELOPMENT_STANDARDS v1.28.0 | ✅ — Padrões de propagação de eventos |
| Codebase patterns | ✅ — `onCloseAutoFocus` já usado em KpiSelect, BuUserSelect, TicketResponsibleSelect |

### Diagnóstico

Quando o usuário clica em "Atualizar" no `DropdownMenu` do `KpiActionsMenu` (dentro de um `TableRow` ou `KpiCard` clicável):

1. O item do dropdown seta `updateValueOpen(true)` e o dropdown fecha
2. Radix devolve foco ao trigger button via `onCloseAutoFocus`
3. Esse evento de foco/pointer propaga para o `TableRow`/`Card` pai
4. O pai dispara `onKpiClick` → abre `KpiDetailDialog` por cima do `AddKpiValueDialog`
5. Resultado: dialog de registro de valor fica atrás do modal de detalhes

### Correção

Adicionar `onCloseAutoFocus={(e) => e.preventDefault()}` no `DropdownMenuContent` — padrão já estabelecido em 3 outros componentes do projeto (KpiSelect, BuUserSelect, TicketResponsibleSelect).

### Arquivo afetado

| Arquivo | Mudança |
|---------|---------|
| `src/modules/kpis/components/KpiActionsMenu.tsx` | Adicionar `onCloseAutoFocus` no `DropdownMenuContent` (linha 176) |

### Detalhe da mudança

```tsx
// Antes (linha 176):
<DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>

// Depois:
<DropdownMenuContent 
  align="end" 
  onClick={(e) => e.stopPropagation()}
  onCloseAutoFocus={(e) => e.preventDefault()}
>
```

