/**
 * Dialog Size Constants
 * 
 * Padronização de larguras de modais para consistência visual.
 * Usar estas constantes ao invés de valores arbitrários.
 * 
 * @example
 * import { DIALOG_SIZES } from "@/lib/dialog-sizes";
 * 
 * <DialogContent className={DIALOG_SIZES.md}>
 *   ...
 * </DialogContent>
 */

export const DIALOG_SIZES = {
  /** 480px - Forms simples (1-3 campos) */
  sm: 'sm:max-w-[480px]',
  
  /** 560px - Forms médios (4-8 campos) */
  md: 'sm:max-w-[560px]',
  
  /** 640px - Forms complexos (muitos campos, tabs) */
  lg: 'sm:max-w-[640px]',
  
  /** 768px - Multi-step wizards, tabelas inline */
  xl: 'sm:max-w-[768px]',
  
  /** 90vw - Full-screen dialogs (dashboards, visualizações) */
  full: 'sm:max-w-[90vw]',
} as const;

export type DialogSize = keyof typeof DIALOG_SIZES;

/**
 * Helper para combinar tamanho com classes adicionais
 */
export function getDialogSizeClass(size: DialogSize, additionalClasses?: string): string {
  const sizeClass = DIALOG_SIZES[size];
  return additionalClasses ? `${sizeClass} ${additionalClasses}` : sizeClass;
}
