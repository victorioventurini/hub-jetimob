/**
 * SectionHeader - Componente canônico para cabeçalhos de seção em Cards
 * 
 * Padroniza o pattern CardHeader + CardTitle + actions.
 * Suporta: ícone, título, descrição e ações.
 */

import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ============================================================
// TYPES
// ============================================================

export interface SectionHeaderProps {
  /** Section title */
  title: string;
  /** Optional description below title */
  description?: ReactNode;
  /** Optional icon displayed before title */
  icon?: LucideIcon;
  /** Icon className for customization */
  iconClassName?: string;
  /** Actions to display on the right side */
  actions?: ReactNode;
  /** Badge or status indicator next to title */
  badge?: ReactNode;
  /** Additional className for CardHeader */
  className?: string;
  /** Compact mode with reduced padding */
  compact?: boolean;
}

// ============================================================
// COMPONENT
// ============================================================

export function SectionHeader({
  title,
  description,
  icon: Icon,
  iconClassName,
  actions,
  badge,
  className,
  compact = false,
}: SectionHeaderProps) {
  const hasIcon = !!Icon;
  const hasActions = !!actions;
  
  return (
    <CardHeader 
      className={cn(
        "flex-row items-center justify-between space-y-0",
        compact && "pb-3",
        className
      )}
    >
      <div className={cn("flex items-center gap-3", !hasActions && "flex-1")}>
        {hasIcon && (
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Icon className={cn("h-5 w-5 text-primary", iconClassName)} />
          </div>
        )}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className={cn(compact ? "text-base" : "text-lg")}>
              {title}
            </CardTitle>
            {badge}
          </div>
          {description && (
            <CardDescription>{description}</CardDescription>
          )}
        </div>
      </div>
      {hasActions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </CardHeader>
  );
}

// ============================================================
// COMPACT VARIANT
// ============================================================

export interface SimpleSectionHeaderProps {
  /** Section title */
  title: string;
  /** Optional count to display in parentheses */
  count?: number;
  /** Actions to display on the right side */
  actions?: ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * Simplified section header for inline use (not in cards)
 */
export function SimpleSectionHeader({
  title,
  count,
  actions,
  className,
}: SimpleSectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <h3 className="text-base font-semibold">
        {title}
        {typeof count === "number" && (
          <span className="text-muted-foreground font-normal ml-1">
            ({count})
          </span>
        )}
      </h3>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
