import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Breadcrumb item para navegação no Hub
 */
interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface HubPageHeaderProps {
  /** Título principal da página (H1) */
  title: string;
  /** Descrição opcional abaixo do título */
  description?: React.ReactNode;
  /** Ações no lado direito (botões) */
  actions?: React.ReactNode;
  /** Breadcrumbs de navegação - omitir o primeiro (Hub) que é automático */
  breadcrumbs?: BreadcrumbItem[];
  /** Classes adicionais */
  className?: string;
}

/**
 * Header padronizado para todas as páginas do /hub
 * 
 * Inclui:
 * - Breadcrumbs de navegação
 * - Título H1 padronizado
 * - Descrição em texto muted
 * - Área para ações (botões)
 * 
 * @example
 * <HubPageHeader
 *   title="Business Units"
 *   description="Gerencie as unidades de negócio"
 *   breadcrumbs={[{ label: "Business Units" }]}
 *   actions={<Button>Nova BU</Button>}
 * />
 */
export function HubPageHeader({
  title,
  description,
  actions,
  breadcrumbs = [],
  className,
}: HubPageHeaderProps) {
  // Monta breadcrumbs completo com Hub como primeiro item
  const fullBreadcrumbs: BreadcrumbItem[] = [
    { label: "Hub", href: "/hub" },
    ...breadcrumbs,
  ];

  return (
    <div className={cn("space-y-4 mb-8", className)}>
      {/* Breadcrumbs */}
      <nav aria-label="Navegação" className="flex items-center gap-1 text-sm">
        {fullBreadcrumbs.map((crumb, index) => {
          const isLast = index === fullBreadcrumbs.length - 1;
          const isFirst = index === 0;

          return (
            <span key={index} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              )}
              {isLast ? (
                <span className="text-foreground font-medium">{crumb.label}</span>
              ) : crumb.href ? (
                <Link
                  to={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  {isFirst && <Home className="h-3.5 w-3.5" />}
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-muted-foreground flex items-center gap-1">
                  {isFirst && <Home className="h-3.5 w-3.5" />}
                  {crumb.label}
                </span>
              )}
            </span>
          );
        })}
      </nav>

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}
