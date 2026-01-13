/**
 * SkeletonPage - Componentes canônicos para skeletons de página/seção
 * 
 * Padroniza os patterns de skeleton inline encontrados no projeto.
 * Inclui variantes para: página, card, formulário, lista, tabela.
 */

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ============================================================
// SKELETON PAGE
// ============================================================

export interface SkeletonPageProps {
  /** Number of content blocks to show */
  blocks?: number;
  /** Variant of skeleton layout */
  variant?: "default" | "form" | "detail";
  /** Show header skeleton */
  showHeader?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Full page skeleton with header and content blocks
 */
export function SkeletonPage({
  blocks = 3,
  variant = "default",
  showHeader = true,
  className,
}: SkeletonPageProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {showHeader && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      )}
      
      {variant === "form" ? (
        <div className="space-y-4">
          {Array.from({ length: blocks }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : variant === "detail" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            {Array.from({ length: blocks }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from({ length: blocks }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SKELETON SECTION
// ============================================================

export interface SkeletonSectionProps {
  /** Number of rows/items */
  rows?: number;
  /** Show title skeleton */
  showTitle?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Section skeleton (for tabs or sections within a page)
 */
export function SkeletonSection({
  rows = 3,
  showTitle = true,
  className,
}: SkeletonSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {showTitle && <Skeleton className="h-10 w-48" />}
      <Skeleton className="h-64 w-full" />
      {rows > 1 && <Skeleton className="h-32 w-full" />}
    </div>
  );
}

// ============================================================
// SKELETON CARD (enhanced)
// ============================================================

export interface SkeletonCardContentProps {
  /** Number of lines in content */
  lines?: number;
  /** Show action button skeleton */
  showAction?: boolean;
  /** Show icon skeleton in header */
  showIcon?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Card skeleton with header and content
 */
export function SkeletonCardContent({
  lines = 3,
  showAction = false,
  showIcon = false,
  className,
}: SkeletonCardContentProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          {showIcon && <Skeleton className="h-10 w-10 rounded-lg" />}
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        {showAction && <Skeleton className="h-9 w-24" />}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton 
              key={i} 
              className={cn(
                "h-12 w-full",
                i === lines - 1 && "w-3/4"
              )} 
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// SKELETON GRID
// ============================================================

export interface SkeletonGridProps {
  /** Number of items */
  count?: number;
  /** Number of columns */
  columns?: 2 | 3 | 4;
  /** Height of each item */
  itemHeight?: string;
  /** Additional className */
  className?: string;
}

/**
 * Grid of skeleton cards
 */
export function SkeletonGrid({
  count = 4,
  columns = 2,
  itemHeight = "h-48",
  className,
}: SkeletonGridProps) {
  const gridCols = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={itemHeight} />
      ))}
    </div>
  );
}

// ============================================================
// SKELETON WIZARD STEP
// ============================================================

export interface SkeletonWizardStepProps {
  /** Show large content blocks */
  variant?: "default" | "form" | "list";
  /** Additional className */
  className?: string;
}

/**
 * Skeleton for wizard/step content
 */
export function SkeletonWizardStep({
  variant = "default",
  className,
}: SkeletonWizardStepProps) {
  return (
    <div className={cn("p-6 space-y-6", className)}>
      <Skeleton className="h-8 w-3/4" />
      {variant === "form" ? (
        <>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </>
      ) : variant === "list" ? (
        <>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </>
      ) : (
        <>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </>
      )}
    </div>
  );
}
