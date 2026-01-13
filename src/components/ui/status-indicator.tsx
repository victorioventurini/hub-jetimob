import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

/**
 * Status indicator variants using semantic design tokens.
 * 
 * Use these instead of hardcoded colors like:
 * - text-green-600 → variant="success"
 * - text-red-600 → variant="danger" 
 * - text-yellow-600 → variant="warning"
 * - text-blue-600 → variant="info"
 * 
 * @example
 * <StatusIndicator variant="success">Aprovado</StatusIndicator>
 * <StatusIndicator variant="warning" dot>Em análise</StatusIndicator>
 * <StatusIndicator variant="danger" muted>Erro ao processar</StatusIndicator>
 */

const statusIndicatorVariants = cva(
  "inline-flex items-center gap-1.5 text-sm font-medium",
  {
    variants: {
      variant: {
        success: "text-success",
        warning: "text-warning",
        danger: "text-danger",
        info: "text-info",
        muted: "text-muted-foreground",
      },
      muted: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      { variant: "success", muted: true, className: "bg-success-muted text-success-muted-foreground px-2 py-1 rounded-md" },
      { variant: "warning", muted: true, className: "bg-warning-muted text-warning-muted-foreground px-2 py-1 rounded-md" },
      { variant: "danger", muted: true, className: "bg-danger-muted text-danger-muted-foreground px-2 py-1 rounded-md" },
      { variant: "info", muted: true, className: "bg-info-muted text-info-muted-foreground px-2 py-1 rounded-md" },
    ],
    defaultVariants: {
      variant: "muted",
      muted: false,
    },
  }
);

const dotVariants = cva(
  "h-2 w-2 rounded-full shrink-0",
  {
    variants: {
      variant: {
        success: "bg-success",
        warning: "bg-warning",
        danger: "bg-danger",
        info: "bg-info",
        muted: "bg-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "muted",
    },
  }
);

interface StatusIndicatorProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusIndicatorVariants> {
  /** Show a colored dot before the text */
  dot?: boolean;
}

export function StatusIndicator({
  className,
  variant,
  muted,
  dot,
  children,
  ...props
}: StatusIndicatorProps) {
  return (
    <span
      className={cn(statusIndicatorVariants({ variant, muted }), className)}
      {...props}
    >
      {dot && <span className={dotVariants({ variant })} />}
      {children}
    </span>
  );
}

/**
 * Status dot component for compact indicators
 * 
 * @example
 * <StatusDot variant="success" />
 * <StatusDot variant="warning" size="lg" />
 */
const statusDotVariants = cva(
  "rounded-full shrink-0",
  {
    variants: {
      variant: {
        success: "bg-success",
        warning: "bg-warning",
        danger: "bg-danger",
        info: "bg-info",
        muted: "bg-muted-foreground",
      },
      size: {
        sm: "h-1.5 w-1.5",
        default: "h-2 w-2",
        lg: "h-2.5 w-2.5",
      },
    },
    defaultVariants: {
      variant: "muted",
      size: "default",
    },
  }
);

interface StatusDotProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusDotVariants> {}

export function StatusDot({
  className,
  variant,
  size,
  ...props
}: StatusDotProps) {
  return (
    <span
      className={cn(statusDotVariants({ variant, size }), className)}
      {...props}
    />
  );
}

/**
 * Utility object for status-based styling
 * Use with cn() for conditional class application
 * 
 * @example
 * <span className={cn(statusStyles.text[status])}>
 *   {statusLabel}
 * </span>
 */
export const statusStyles = {
  text: {
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    info: "text-info",
    muted: "text-muted-foreground",
  },
  bg: {
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    info: "bg-info",
    muted: "bg-muted",
  },
  bgMuted: {
    success: "bg-success-muted",
    warning: "bg-warning-muted",
    danger: "bg-danger-muted",
    info: "bg-info-muted",
    muted: "bg-muted",
  },
  textMuted: {
    success: "text-success-muted-foreground",
    warning: "text-warning-muted-foreground",
    danger: "text-danger-muted-foreground",
    info: "text-info-muted-foreground",
    muted: "text-muted-foreground",
  },
} as const;

export type StatusVariant = keyof typeof statusStyles.text;
