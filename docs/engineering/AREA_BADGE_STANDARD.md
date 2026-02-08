# AreaBadge Standard

> **Status**: Active  
> **Version**: v1.0.0  
> **Updated**: 2026-02-08

## Visão Geral

O componente `AreaBadge` (`src/components/ui/area-badge.tsx`) é o **padrão único** para exibição de badges de área com cores personalizadas em todo o sistema.

## Problema Resolvido

Antes da padronização, diferentes componentes usavam abordagens inconsistentes:

| Abordagem | Problema |
|-----------|----------|
| `variant="secondary"` + `backgroundColor` via style | Texto branco fixo ficava ilegível em cores claras |
| `variant="outline"` + `borderColor/color` via style | Correto, mas duplicado em vários arquivos |
| Cores hardcoded | Violação do design system |

## Padrão Adotado

```tsx
import { AreaBadge } from "@/components/ui/area-badge";

// Uso básico
<AreaBadge area={{ name: "Operações", color: "#10B981" }} />

// Modo compacto (apenas 3 primeiras letras)
<AreaBadge area={{ name: "Operações", color: "#10B981" }} compact />

// Tamanho pequeno
<AreaBadge area={{ name: "Operações", color: "#10B981" }} size="sm" />
```

## Comportamento Visual

- **Variante**: `outline` (borda colorida, fundo transparente)
- **Cor da borda**: `area.color` ou `undefined` (fallback do design system)
- **Cor do texto**: `area.color` ou `undefined` (fallback do design system)
- **Legibilidade**: Garantida em qualquer cor de área

## Arquivos Atualizados (v1.0.0)

| Arquivo | Status |
|---------|--------|
| `src/modules/kpis/components/KpiCard.tsx` | ✅ Migrado |
| `src/modules/kpis/components/KpiSidePanel.tsx` | ✅ Migrado |
| `src/modules/kpis/components/KpiDashboardTable.tsx` | ✅ Migrado |
| `src/modules/kpis/components/KpiHistoryDialog.tsx` | ✅ Migrado |
| `src/modules/kpis/pages/KpiEvolutionPage.tsx` | ✅ Migrado |

## Regras para Novos Componentes

1. **SEMPRE** usar `<AreaBadge />` para exibir áreas com cores
2. **NUNCA** usar `Badge` com `backgroundColor` inline para áreas
3. Para áreas sem cor definida (`area.color === null`), o componente usa fallback automático

## Referência de Props

| Prop | Tipo | Default | Descrição |
|------|------|---------|-----------|
| `area` | `{ name: string; color: string \| null }` | *required* | Dados da área |
| `compact` | `boolean` | `false` | Exibe apenas 3 primeiras letras |
| `size` | `"sm" \| "md"` | `"md"` | Tamanho do badge |
| `className` | `string` | - | Classes CSS adicionais |

## Código do Componente

```tsx
// src/components/ui/area-badge.tsx
import { Badge, BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AreaData {
  name: string;
  color: string | null;
}

export interface AreaBadgeProps extends Omit<BadgeProps, "variant"> {
  area: AreaData;
  compact?: boolean;
  size?: "sm" | "md";
}

export function AreaBadge({
  area,
  compact = false,
  size = "md",
  className,
  ...props
}: AreaBadgeProps) {
  const displayText = compact ? area.name.slice(0, 3) : area.name;

  return (
    <Badge
      variant="outline"
      className={cn(
        "whitespace-nowrap",
        size === "sm" && "text-[10px] px-1.5 py-0",
        size === "md" && "text-xs",
        className
      )}
      style={{
        borderColor: area.color || undefined,
        color: area.color || undefined,
      }}
      {...props}
    >
      {displayText}
    </Badge>
  );
}
```
