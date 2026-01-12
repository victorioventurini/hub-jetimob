import { LucideIcon, Search, Filter, Plus, Lock, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Variant presets for common empty state scenarios.
 * Each variant provides default icon, title, and description.
 */
export type EmptyStateVariant = 
  | 'search'      // Search with no results
  | 'filter'      // Filters too restrictive  
  | 'firstUse'    // First use - CTA to create
  | 'noPermission' // No access
  | 'default';    // Generic

const variantDefaults: Record<EmptyStateVariant, {
  icon: LucideIcon;
  title: string;
  description: string;
}> = {
  search: {
    icon: Search,
    title: "Nenhum resultado encontrado",
    description: "Tente ajustar os termos de busca ou verifique a ortografia.",
  },
  filter: {
    icon: Filter,
    title: "Nenhum item corresponde aos filtros",
    description: "Tente remover alguns filtros para ver mais resultados.",
  },
  firstUse: {
    icon: Plus,
    title: "Comece agora",
    description: "Crie seu primeiro item para começar.",
  },
  noPermission: {
    icon: Lock,
    title: "Acesso restrito",
    description: "Você não tem permissão para visualizar este conteúdo.",
  },
  default: {
    icon: Inbox,
    title: "Nenhum item encontrado",
    description: "Não há itens para exibir no momento.",
  },
};

interface EmptyStateProps {
  /** Contextual variant - provides sensible defaults */
  variant?: EmptyStateVariant;
  /** Custom icon (overrides variant default) */
  icon?: LucideIcon;
  /** Title text (overrides variant default) */
  title?: string;
  /** Description text (overrides variant default) */
  description?: string;
  /** Action button label */
  actionLabel?: string;
  /** Action button callback */
  onAction?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Custom icon classes */
  iconClassName?: string;
  /** Compact mode for smaller spaces */
  compact?: boolean;
}

export function EmptyState({
  variant = 'default',
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  iconClassName,
  compact = false,
}: EmptyStateProps) {
  // Merge variant defaults with explicit props
  const defaults = variantDefaults[variant];
  const Icon = icon || defaults.icon;
  const displayTitle = title || defaults.title;
  const displayDescription = description || defaults.description;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4" : "py-16 px-4",
        className
      )}
    >
      <div
        className={cn(
          "rounded-full bg-muted flex items-center justify-center mb-4",
          compact ? "w-12 h-12" : "w-16 h-16"
        )}
      >
        <Icon
          className={cn(
            "text-muted-foreground",
            compact ? "w-6 h-6" : "w-8 h-8",
            iconClassName
          )}
        />
      </div>
      <h3
        className={cn(
          "font-semibold text-foreground mb-1",
          compact ? "text-base" : "text-xl"
        )}
      >
        {displayTitle}
      </h3>
      <p
        className={cn(
          "text-muted-foreground max-w-md",
          compact ? "text-sm mb-4" : "text-base mb-6"
        )}
      >
        {displayDescription}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size={compact ? "sm" : "default"}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}