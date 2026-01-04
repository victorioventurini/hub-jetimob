import { Button, ButtonProps } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVic } from "../contexts/VicContext";
import { useVicEnabled } from "../hooks/useVicAgent";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { VicAgentSlug, VicActionContext, VicContext } from "../types";

interface VicActionButtonProps extends Omit<ButtonProps, "onClick"> {
  agentSlug: VicAgentSlug;
  actionContext: VicActionContext;
  context: VicContext;
  label?: string;
  onApply?: (response: string) => void;
  showIcon?: boolean;
  compact?: boolean;
}

export function VicActionButton({
  agentSlug,
  actionContext,
  context,
  label = "Pergunte ao Vic",
  onApply,
  showIcon = true,
  compact = false,
  className,
  variant = "outline",
  size = "sm",
  ...props
}: VicActionButtonProps) {
  const { openPanel, getAgentInfo } = useVic();
  const { isEnabled, isLoading: isCheckingEnabled } = useVicEnabled();

  const agentInfo = getAgentInfo(agentSlug);

  const handleClick = () => {
    openPanel({
      agentSlug,
      actionContext,
      context,
      onApply,
    });
  };

  // If IA is disabled, show disabled button with tooltip
  if (!isEnabled && !isCheckingEnabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              variant={variant}
              size={size}
              className={cn(
                "gap-1.5 opacity-50 cursor-not-allowed",
                compact && "px-2",
                className
              )}
              disabled
              {...props}
            >
              {showIcon && <Sparkles className="h-3.5 w-3.5" />}
              {!compact && <span>{label}</span>}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>IA desativada nesta BU</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn(
            "gap-1.5 text-primary hover:text-primary",
            compact && "px-2",
            className
          )}
          onClick={handleClick}
          disabled={isCheckingEnabled}
          {...props}
        >
          {showIcon && <Sparkles className="h-3.5 w-3.5" />}
          {!compact && <span>{label}</span>}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{agentInfo.name}</p>
        <p className="text-xs text-muted-foreground">{agentInfo.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
