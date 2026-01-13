/**
 * DeleteConfirmDialog - Re-exportado de ConfirmDialog
 * 
 * @deprecated Use ConfirmDialog com variant="destructive" diretamente.
 * Este arquivo existe apenas para retrocompatibilidade.
 */

import { ConfirmDialog, type ConfirmDialogProps } from "./confirm-dialog";

export interface DeleteConfirmDialogProps extends Omit<ConfirmDialogProps, "variant" | "confirmLabel"> {
  /** @deprecated Use ConfirmDialog com variant="destructive" */
  confirmLabel?: string;
}

/**
 * @deprecated Use `<ConfirmDialog variant="destructive" />` diretamente.
 */
export function DeleteConfirmDialog(props: DeleteConfirmDialogProps) {
  return (
    <ConfirmDialog 
      {...props} 
      variant="destructive"
      confirmLabel={props.confirmLabel}
    />
  );
}
