import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  /** Link para voltar - exibe botão de voltar se fornecido */
  backTo?: string;
  /** Label do botão de voltar (padrão: "Voltar") */
  backLabel?: string;
  /** Ícone do header (opcional) */
  icon?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  backTo,
  backLabel = "Voltar",
  icon,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-2 mb-6", className)}>
      {backTo && (
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to={backTo}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backLabel}
          </Link>
        </Button>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {description && (
              <p className="text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}
