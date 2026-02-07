

# Plano: Status Visual "Estagnado" para Tickets

## Resumo Executivo

Implementar um indicador visual **"Estagnado"** na camada frontend para tickets sem interacao por mais de 7 dias (a partir do 8o dia), **sem qualquer alteracao no banco de dados ou backend**. O indicador complementa o status operacional existente.

---

## Validacoes do Pre-Checklist

| Doc Canonico | Status | Observacao |
|--------------|--------|------------|
| TCR v3.0.0 | Consultado | Arquitetura de modules/tickets confirmada |
| DATA_MODEL_REGISTRY | Consultado | `tickets.updated_at` existe; `last_message_at` computado via `ticketQueryUtils.ts` |
| IDENTITY_CONVENTION | N/A | Feature visual, nao envolve perfis |
| PERMISSIONS_AND_RBAC | N/A | Feature visual, sem restricoes de acesso |
| Implementacao similar | Verificado | Token `ALERT_BANNER_STYLES.stagnant` ja existe em `colors.ts` |

---

## Arquitetura Tecnica

### 1. Funcao Utilitaria Central

**Novo arquivo:** `src/modules/tickets/lib/ticketStagnation.ts`

```typescript
import { differenceInDays } from "date-fns";
import type { Ticket } from "../types";

/** Threshold em dias para considerar um ticket estagnado */
export const STAGNATION_THRESHOLD_DAYS = 8;

/**
 * Verifica se um ticket esta estagnado (sem interacao ha 8+ dias)
 * 
 * Regras:
 * - Tickets finalizados (done/discarded) NAO podem estar estagnados
 * - Usa `last_message_at` como referencia primaria (interacao real)
 * - Fallback para `updated_at` se nao houver mensagens
 */
export function isTicketStagnant(ticket: Ticket): boolean {
  // Tickets finalizados nao podem ser estagnados
  if (ticket.status === "done" || ticket.status === "discarded") {
    return false;
  }
  
  const lastInteraction = ticket.last_message_at || ticket.updated_at;
  const daysSinceInteraction = differenceInDays(new Date(), new Date(lastInteraction));
  
  return daysSinceInteraction >= STAGNATION_THRESHOLD_DAYS;
}

/**
 * Retorna o numero de dias desde a ultima interacao
 */
export function getDaysSinceLastInteraction(ticket: Ticket): number {
  const lastInteraction = ticket.last_message_at || ticket.updated_at;
  return differenceInDays(new Date(), new Date(lastInteraction));
}
```

### 2. Token de Cor (Novo)

**Editar:** `src/lib/colors.ts`

Adicionar token especifico para badge de estagnacao de tickets (nao usar `ALERT_BANNER_STYLES` diretamente pois e para banners):

```typescript
// Adicionar apos TICKET_TYPE_STYLES (linha ~183)
export const TICKET_STAGNANT_STYLE = {
  badge: "bg-status-yellow-muted/60 text-status-yellow-muted-foreground border-status-yellow/30",
  dot: "bg-status-yellow",
} as const;
```

### 3. Componente StagnantBadge

**Novo arquivo:** `src/modules/tickets/components/StagnantBadge.tsx`

Badge reutilizavel com tooltip explicativo usando componentes existentes:

```typescript
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PauseCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TICKET_STAGNANT_STYLE } from "@/lib/colors";
import { isTicketStagnant, getDaysSinceLastInteraction } from "../lib/ticketStagnation";
import type { Ticket } from "../types";

interface StagnantBadgeProps {
  ticket: Ticket;
  className?: string;
}

export function StagnantBadge({ ticket, className }: StagnantBadgeProps) {
  if (!isTicketStagnant(ticket)) return null;
  
  const days = getDaysSinceLastInteraction(ticket);
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className={cn("gap-1 text-xs", TICKET_STAGNANT_STYLE.badge, className)}>
          <PauseCircle className="h-3 w-3" />
          Estagnado
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>Este ticket esta sem interacoes ha {days} dias.</p>
      </TooltipContent>
    </Tooltip>
  );
}
```

---

## Pontos de Integracao

### 4.1 TicketsTable (Lista Principal)

**Editar:** `src/modules/tickets/components/TicketsTable.tsx`

Na coluna de Status, adicionar `StagnantBadge` ao lado do badge de status existente:

```diff
<TableCell>
  <Badge className={cn("gap-1.5", TICKET_STATUS_STYLES[ticket.status].badge)}>
    <span className={cn("h-1.5 w-1.5 rounded-full", TICKET_STATUS_STYLES[ticket.status].dot)} />
    {statusLabels[ticket.status]}
  </Badge>
+ <StagnantBadge ticket={ticket} />
</TableCell>
```

Imports adicionais:
- `import { StagnantBadge } from "./StagnantBadge";`

### 4.2 TicketCard (Vista Cards)

**Editar:** `src/modules/tickets/components/TicketCard.tsx`

No header do card, junto com tipo e status:

```diff
<div className="flex items-center gap-2 mb-2">
  <span className={cn("px-2 py-0.5 rounded text-xs font-medium", type.className)}>
    {type.label}
  </span>
  <Badge variant={status.variant} className="text-xs">
    {status.label}
  </Badge>
+ <StagnantBadge ticket={ticket} />
  {isOverdue && (...)}
</div>
```

Imports adicionais:
- `import { StagnantBadge } from "./StagnantBadge";`

### 4.3 TicketDetailHeader (Pagina de Detalhe)

**Editar:** `src/modules/tickets/components/TicketDetailHeader.tsx`

Problema: O componente atual recebe props individuais, nao o objeto `ticket` completo. Para usar `StagnantBadge`, precisamos passar `lastMessageAt` e `updatedAt`.

Opcao escolhida: Passar props adicionais para evitar breaking change:

```diff
interface TicketDetailHeaderProps {
  title: string;
  type: "internal" | "external";
  status: TicketStatus;
  createdAt: string;
  expectedDueAt?: string | null;
  ticketId?: string;
+ lastMessageAt?: string | null;
+ updatedAt: string;
}
```

Criar objeto ticket parcial para `StagnantBadge`:

```typescript
// Dentro do componente
const ticketForStagnant = {
  status,
  last_message_at: lastMessageAt,
  updated_at: updatedAt,
} as Ticket;
```

Adicionar na area de actions:

```diff
const actions = (
  <div className="flex items-center gap-2">
    <span className={...}>{isExternal ? "Externo" : "Interno"}</span>
    <Badge className={cn("gap-1.5", statusStyles.badge)}>
      <span className={...} />
      {statusLabels[status]}
    </Badge>
+   <StagnantBadge ticket={ticketForStagnant} />
  </div>
);
```

Nota: O chamador (`TicketDetailPage`) precisara passar `lastMessageAt` e `updatedAt`.

---

## Resumo de Arquivos

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/modules/tickets/lib/ticketStagnation.ts` | **Criar** | Funcoes `isTicketStagnant()` e `getDaysSinceLastInteraction()` |
| `src/lib/colors.ts` | **Editar** | Adicionar `TICKET_STAGNANT_STYLE` |
| `src/modules/tickets/components/StagnantBadge.tsx` | **Criar** | Componente de badge com tooltip |
| `src/modules/tickets/components/TicketsTable.tsx` | **Editar** | Integrar StagnantBadge |
| `src/modules/tickets/components/TicketCard.tsx` | **Editar** | Integrar StagnantBadge |
| `src/modules/tickets/components/TicketDetailHeader.tsx` | **Editar** | Adicionar props + StagnantBadge |
| Pagina de detalhe (chamador) | **Editar** | Passar novas props ao TicketDetailHeader |

---

## Conformidade com Padroes do Hub

| Padrao | Status |
|--------|--------|
| Tokens semanticos de cores | Usa `status-yellow-*` via `TICKET_STAGNANT_STYLE` |
| Nao duplicar componentes | `StagnantBadge` e reutilizavel em todos os pontos |
| Logica centralizada | `ticketStagnation.ts` (lib dedicada) |
| Zero alteracao backend | Nenhuma migration, RPC ou coluna nova |
| URL state | N/A (apenas visual) |
| Select explicito | N/A (usa dados ja carregados) |

---

## Comportamento Esperado

1. **Badge aparece** quando `daysSinceLastInteraction >= 8` e status nao e `done`/`discarded`
2. **Badge desaparece** automaticamente quando nova mensagem e criada (atualiza `last_message_at`)
3. **Tooltip** exibe: "Este ticket esta sem interacoes ha X dias."
4. **Nao afeta** SLA, metricas, automacoes ou acoes do usuario

---

## Dependencias

- `date-fns`: Ja instalado (`differenceInDays`)
- `@radix-ui/react-tooltip`: Ja instalado
- Componentes shadcn: `Badge`, `Tooltip`, `TooltipContent`, `TooltipTrigger`

