/**
 * Status Colors — paleta semântica única para badges, dots, rings.
 *
 * Use estes tokens em vez de strings literais nos componentes.
 * Valores HSL casam com tokens Tailwind do design system.
 *
 * @see src/index.css para definição dos tokens base
 */

export type StatusToneKey =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "primary"
  | "muted";

export interface StatusToneClasses {
  /** Background suave para badges. */
  bg: string;
  /** Texto escuro para badges. */
  text: string;
  /** Borda. */
  border: string;
  /** Background sólido (botões, chips de destaque). */
  solid: string;
  /** Texto sobre solid. */
  solidText: string;
  /** Anel/ring para focus/selected. */
  ring: string;
}

export const STATUS_TONES: Record<StatusToneKey, StatusToneClasses> = {
  neutral: {
    bg: "bg-muted",
    text: "text-foreground",
    border: "border-border",
    solid: "bg-foreground",
    solidText: "text-background",
    ring: "ring-border",
  },
  info: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/30",
    solid: "bg-primary",
    solidText: "text-primary-foreground",
    ring: "ring-primary",
  },
  success: {
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/30",
    solid: "bg-success",
    solidText: "text-success-foreground",
    ring: "ring-success",
  },
  warning: {
    bg: "bg-warning/10",
    text: "text-warning",
    border: "border-warning/30",
    solid: "bg-warning",
    solidText: "text-warning-foreground",
    ring: "ring-warning",
  },
  danger: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/30",
    solid: "bg-destructive",
    solidText: "text-destructive-foreground",
    ring: "ring-destructive",
  },
  primary: {
    bg: "bg-primary/15",
    text: "text-primary",
    border: "border-primary/40",
    solid: "bg-primary",
    solidText: "text-primary-foreground",
    ring: "ring-primary",
  },
  muted: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
    solid: "bg-muted-foreground",
    solidText: "text-background",
    ring: "ring-muted-foreground",
  },
};

/** Helper: combina tone bg+text+border em uma única string. */
export function statusBadgeClasses(tone: StatusToneKey): string {
  const t = STATUS_TONES[tone];
  return `${t.bg} ${t.text} ${t.border}`;
}
