/**
 * ConfirmDialog - Componente genérico para confirmações
 * 
 * Consolida DeleteConfirmDialog e implementações inline de AlertDialog.
 * Suporta variantes: destructive, warning, info
 */

import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// ============================================================
// TYPES
// ============================================================

export type ConfirmDialogVariant = "destructive" | "warning" | "info" | "default";

export interface ConfirmDialogProps {
  /** Dialog open state */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when user confirms */
  onConfirm: () => void | Promise<void>;
  /** Dialog title */
  title: string;
  /** Dialog description - can be string or JSX */
  description: ReactNode;
  /** Confirm button label */
  confirmLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
  /** Visual variant */
  variant?: ConfirmDialogVariant;
  /** Loading state - disables buttons and shows spinner */
  isLoading?: boolean;
  /** Disable cancel button during loading */
  disableCancelOnLoading?: boolean;
}

// ============================================================
// VARIANT STYLES
// ============================================================

const VARIANT_STYLES: Record<ConfirmDialogVariant, string> = {
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  warning: "bg-warning text-warning-foreground hover:bg-warning/90",
  info: "bg-primary text-primary-foreground hover:bg-primary/90",
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
};

const DEFAULT_LABELS: Record<ConfirmDialogVariant, string> = {
  destructive: "Excluir",
  warning: "Continuar",
  info: "Confirmar",
  default: "Confirmar",
};

// ============================================================
// COMPONENT
// ============================================================

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  variant = "default",
  isLoading = false,
  disableCancelOnLoading = true,
}: ConfirmDialogProps) {
  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    await onConfirm();
  };

  const resolvedConfirmLabel = confirmLabel ?? DEFAULT_LABELS[variant];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild={typeof description !== "string"}>
            {typeof description === "string" ? description : <div>{description}</div>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={disableCancelOnLoading && isLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(VARIANT_STYLES[variant])}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {resolvedConfirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================================
// CONVENIENCE EXPORTS
// ============================================================

/** Alias for destructive variant */
export function DeleteConfirmDialogV2(
  props: Omit<ConfirmDialogProps, "variant">
) {
  return <ConfirmDialog {...props} variant="destructive" />;
}

/** Alias for warning variant */
export function WarningConfirmDialog(
  props: Omit<ConfirmDialogProps, "variant">
) {
  return <ConfirmDialog {...props} variant="warning" />;
}
