// ============================================================
// SHARED CONSTANTS - Next da Jet
// ============================================================
//
// Ponto único de exportação de constantes transversais.
// Constantes específicas de módulo continuam em src/modules/<m>/constants/.
// ============================================================

export * from './units';
export * from './okrLimits';
export * from './entityLimits';
export * from './statusTones';

// Re-exports retrocompatíveis de constantes que já viviam em src/lib/.
// Novo código deve importar de '@/shared/constants'; os caminhos antigos
// continuam válidos por compatibilidade.
export { DIALOG_SIZES, getDialogSizeClass, type DialogSize } from '@/lib/dialog-sizes';
