/**
 * DuplicateActionButton — botão centralizado para duplicar entidades de Assessments.
 * Combina Button + ConfirmActionDialog. Usado em listas (icon) e headers (full).
 */
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "./ConfirmActionDialog";

interface DuplicateActionButtonProps {
  title: string;
  description?: string;
  onConfirm: () => void;
  isPending?: boolean;
  variant?: "icon" | "full";
  ariaLabel?: string;
}

export function DuplicateActionButton({
  title,
  description,
  onConfirm,
  isPending,
  variant = "icon",
  ariaLabel = "Duplicar",
}: DuplicateActionButtonProps) {
  const trigger =
    variant === "icon" ? (
      <Button
        variant="ghost"
        size="icon"
        aria-label={ariaLabel}
        disabled={isPending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <Copy className="h-4 w-4" />
      </Button>
    ) : (
      <Button variant="outline" disabled={isPending}>
        <Copy className="h-4 w-4 mr-2" />
        Duplicar
      </Button>
    );

  return (
    <ConfirmActionDialog
      trigger={trigger}
      title={title}
      description={description}
      confirmLabel="Duplicar"
      destructive={false}
      onConfirm={onConfirm}
      disabled={isPending}
    />
  );
}
