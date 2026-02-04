import { ArrowLeft, ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/**
 * Breadcrumb item para navegação
 */
interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  /** Link para voltar - exibe botão de voltar se fornecido */
  backTo?: string;
  /** Label do botão de voltar (padrão: "Voltar") */
  backLabel?: string;
  /** 
   * Breadcrumbs de navegação. Se fornecido, exibe breadcrumbs em vez do botão de voltar.
   * O primeiro item (Hub) é adicionado automaticamente.
   */
  breadcrumbs?: BreadcrumbItem[];
}

/**
 * Header padronizado para todas as páginas
 * 
 * Suporta dois modos de navegação:
 * 1. backTo/backLabel: Exibe botão de voltar
 * 2. breadcrumbs: Exibe breadcrumbs automáticos (Hub → ...)
 * 
 * @example
 * // Com botão de voltar
 * <PageHeader
 *   title="Detalhes do Ticket"
 *   backTo="/tickets"
 *   backLabel="Voltar para Tickets"
 * />
 * 
 * @example
 * // Com breadcrumbs
 * <PageHeader
 *   title="Business Units"
 *   description="Gerencie as unidades de negócio"
 *   breadcrumbs={[{ label: "Business Units" }]}
 *   actions={<Button>Nova BU</Button>}
 * />
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
  backTo,
  backLabel = "Voltar",
  breadcrumbs,
}: PageHeaderProps) {
  // Se breadcrumbs forem fornecidos, monta com Hub como primeiro item
  // Usa "/" como link para a tela inicial da BU (acessível a todos os usuários)
  const fullBreadcrumbs: BreadcrumbItem[] | undefined = breadcrumbs
    ? [{ label: "Hub", href: "/" }, ...breadcrumbs]
    : undefined;

  return (
    <div className={cn("space-y-2 mb-6", className)}>
      {/* Breadcrumbs (se fornecidos) */}
      {fullBreadcrumbs && (
        <nav aria-label="Navegação" className="flex items-center gap-1 text-sm mb-2">
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
      )}

      {/* Back button (se fornecido e sem breadcrumbs) */}
      {backTo && !breadcrumbs && (
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to={backTo}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backLabel}
          </Link>
        </Button>
      )}

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}
