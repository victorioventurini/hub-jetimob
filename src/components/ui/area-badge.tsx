import { Badge, BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * AreaBadge - Badge padronizado para exibir áreas com cores personalizadas
 * 
 * Este componente garante consistência visual em todos os contextos onde
 * áreas são exibidas, usando a cor definida na área de forma correta.
 * 
 * Padrão: variant="outline" com borderColor e textColor aplicados via style
 * 
 * @example
 * // Uso básico
 * <AreaBadge area={{ name: "Operações", color: "#10B981" }} />
 * 
 * // Versão compacta (apenas inicial)
 * <AreaBadge area={{ name: "Operações", color: "#10B981" }} compact />
 * 
 * // Tamanho pequeno
 * <AreaBadge area={{ name: "Operações", color: "#10B981" }} size="sm" />
 */

interface AreaData {
  name: string;
  color: string | null;
}

export interface AreaBadgeProps extends Omit<BadgeProps, "variant"> {
  /** Dados da área (name e color) */
  area: AreaData;
  /** Modo compacto: exibe apenas as 3 primeiras letras */
  compact?: boolean;
  /** Tamanho do badge */
  size?: "sm" | "md";
}

export function AreaBadge({
  area,
  compact = false,
  size = "md",
  className,
  ...props
}: AreaBadgeProps) {
  const displayText = compact ? area.name.slice(0, 3) : area.name;

  return (
    <Badge
      variant="outline"
      className={cn(
        "whitespace-nowrap",
        size === "sm" && "text-[10px] px-1.5 py-0",
        size === "md" && "text-xs",
        className
      )}
      style={{
        borderColor: area.color || undefined,
        color: area.color || undefined,
      }}
      {...props}
    >
      {displayText}
    </Badge>
  );
}
