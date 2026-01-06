import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info, 
  ArrowRight, 
  Target, 
  Gauge,
  HelpCircle,
} from "lucide-react";
import { 
  type LinkingValidation, 
  type LimitValidation,
  type KrType,
  getKrTypeExplanation,
  OKR_LIMITS,
} from "../utils/linkingRules";

interface LinkingValidationAlertProps {
  validation: LinkingValidation;
  className?: string;
}

/**
 * Shows validation result for linking rules
 */
export function LinkingValidationAlert({ validation, className }: LinkingValidationAlertProps) {
  if (validation.isValid && !validation.warningMessage) {
    return null;
  }

  const variant = validation.isValid ? "default" : "destructive";
  const Icon = validation.isValid ? AlertTriangle : XCircle;

  return (
    <Alert variant={variant} className={className}>
      <Icon className="h-4 w-4" />
      <AlertTitle>
        {validation.isValid ? "Atenção" : "Vínculo não permitido"}
      </AlertTitle>
      <AlertDescription>
        {validation.errorMessage || validation.warningMessage}
      </AlertDescription>
    </Alert>
  );
}

interface LimitAlertProps {
  validation: LimitValidation;
  entityName: string;
  className?: string;
}

/**
 * Shows educational alert about OKR limits
 */
export function LimitAlert({ validation, entityName, className }: LimitAlertProps) {
  const { isWithinLimit, currentCount, maxCount, educationalMessage } = validation;

  if (isWithinLimit && currentCount < maxCount - 1) {
    return null; // Only show when approaching or at limit
  }

  const variant = isWithinLimit ? "default" : "destructive";
  const Icon = isWithinLimit ? Info : AlertTriangle;
  const title = isWithinLimit 
    ? `Aproximando do limite de ${entityName}` 
    : `Limite de ${entityName} atingido`;

  return (
    <Alert variant={variant} className={className}>
      <Icon className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        {title}
        <Badge variant={isWithinLimit ? "secondary" : "destructive"} className="font-mono">
          {currentCount}/{maxCount}
        </Badge>
      </AlertTitle>
      <AlertDescription className="mt-2">
        {educationalMessage}
      </AlertDescription>
    </Alert>
  );
}

interface LimitBadgeProps {
  current: number;
  max: number;
  label?: string;
}

/**
 * Compact badge showing current/max count
 */
export function LimitBadge({ current, max, label }: LimitBadgeProps) {
  const isAtLimit = current >= max;
  const isNearLimit = current === max - 1;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant={isAtLimit ? "destructive" : isNearLimit ? "secondary" : "outline"}
          className="font-mono cursor-help"
        >
          {label && <span className="mr-1">{label}</span>}
          {current}/{max}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-sm">
          {isAtLimit 
            ? `Limite atingido. A metodologia OKR recomenda máximo ${max} para manter o foco.`
            : isNearLimit
            ? `Quase no limite. Considere se realmente precisa adicionar mais.`
            : `${max - current} restante(s) dentro do limite recomendado.`
          }
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

interface KrTypeBadgeProps {
  type: KrType;
  showTooltip?: boolean;
}

/**
 * Badge showing KR type with explanation tooltip
 */
export function KrTypeBadge({ type, showTooltip = true }: KrTypeBadgeProps) {
  const config = {
    contribution: { label: "Contribuição", variant: "default" as const, color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    enabler: { label: "Habilitador", variant: "secondary" as const, color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
    foundational: { label: "Fundacional", variant: "outline" as const, color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  };

  const { label, color } = config[type];

  const badge = (
    <Badge className={`${color} cursor-help`}>
      {label}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-sm">{getKrTypeExplanation(type)}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface LinkingRulesDiagramProps {
  className?: string;
}

/**
 * Visual diagram showing allowed linking rules
 */
export function LinkingRulesDiagram({ className }: LinkingRulesDiagramProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-sm font-medium">Regras de Vínculo</div>
      
      {/* Objective → Objective */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Target className="w-3.5 h-3.5" />
          Objetivo → Objetivo
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline" className="text-xs">Time</Badge>
          <ArrowRight className="w-4 h-4 text-green-500" />
          <Badge variant="outline" className="text-xs">Org</Badge>
          <CheckCircle className="w-4 h-4 text-green-500" />
        </div>
        <div className="flex items-center gap-2 text-sm opacity-50">
          <Badge variant="outline" className="text-xs">Org</Badge>
          <ArrowRight className="w-4 h-4" />
          <Badge variant="outline" className="text-xs">Time</Badge>
          <XCircle className="w-4 h-4 text-destructive" />
        </div>
      </div>

      {/* KR → KR */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Gauge className="w-3.5 h-3.5" />
          KR → KR
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Badge className="bg-blue-100 text-blue-800 text-xs">Contribuição</Badge>
          <ArrowRight className="w-4 h-4 text-green-500" />
          <Badge variant="outline" className="text-xs">KR Org</Badge>
          <CheckCircle className="w-4 h-4 text-green-500" />
        </div>
        <div className="flex items-center gap-2 text-sm opacity-50">
          <Badge className="bg-amber-100 text-amber-800 text-xs">Fundacional</Badge>
          <ArrowRight className="w-4 h-4" />
          <Badge variant="outline" className="text-xs">KR Org</Badge>
          <XCircle className="w-4 h-4 text-destructive" />
        </div>
        <div className="flex items-center gap-2 text-sm opacity-50">
          <Badge className="bg-purple-100 text-purple-800 text-xs">Habilitador</Badge>
          <ArrowRight className="w-4 h-4" />
          <Badge variant="outline" className="text-xs">KR Org</Badge>
          <XCircle className="w-4 h-4 text-destructive" />
        </div>
      </div>

      {/* Limits */}
      <div className="pt-2 border-t space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <HelpCircle className="w-3.5 h-3.5" />
          Limites Recomendados
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="font-semibold">{OKR_LIMITS.MAX_OBJECTIVES_PER_TEAM}</div>
            <div className="text-muted-foreground">Objetivos/Time</div>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="font-semibold">{OKR_LIMITS.MAX_KRS_PER_OBJECTIVE}</div>
            <div className="text-muted-foreground">KRs/Objetivo</div>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="font-semibold">{OKR_LIMITS.MAX_CONTRIBUTIONS_PER_KR}</div>
            <div className="text-muted-foreground">Contrib./KR</div>
          </div>
        </div>
      </div>
    </div>
  );
}
