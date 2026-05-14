/**
 * PreviewEnvironmentButton — botão centralizado para abrir o preview do ambiente
 * de uma prova em nova aba. Reusado na detail page e na listagem.
 */
import { memo } from "react";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type PreviewEnvironmentButtonProps = {
  assessmentId: string;
  /** "default": botão com label; "icon": apenas ícone com tooltip (para listas). */
  variant?: "default" | "icon";
  className?: string;
};

export const PreviewEnvironmentButton = memo(function PreviewEnvironmentButton({
  assessmentId,
  variant = "default",
  className,
}: PreviewEnvironmentButtonProps) {
  const to = `/assessments/provas/${assessmentId}/preview`;

  if (variant === "icon") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button asChild variant="ghost" size="sm" aria-label="Pré-visualizar ambiente da prova" className={className}>
            <Link to={to} target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Pré-visualizar ambiente</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button asChild variant="outline" className={className}>
      <Link to={to} target="_blank" rel="noopener noreferrer">
        <Eye className="h-4 w-4 mr-2" />Pré-visualizar ambiente
      </Link>
    </Button>
  );
});
