import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, ArrowRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { OkrProgressBar } from "../OkrProgressBar";
import { calculateProgress } from "../../types";
import type { CheckinKrData, CheckinStatus } from "./checkinTypes";

interface CheckinProgressBlockProps {
  kr: CheckinKrData;
  currentValue: string;
  status: CheckinStatus;
  isAutomatic: boolean;
  onValueChange: (value: string) => void;
}

export function CheckinProgressBlock({
  kr,
  currentValue,
  status,
  isAutomatic,
  onValueChange,
}: CheckinProgressBlockProps) {
  const previewValue = isAutomatic ? kr.current_value : (parseFloat(currentValue) || kr.current_value);
  const valueDiff = previewValue - kr.current_value;
  const isPositiveChange = kr.direction === 'up' ? valueDiff >= 0 : valueDiff <= 0;
  const newProgress = calculateProgress(kr.baseline, previewValue, kr.target, kr.direction);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold flex items-center gap-2">
        <TrendingUp className="w-4 h-4" />
        Progresso
      </Label>

      {/* Progress bar preview */}
      <div className="p-3 bg-muted/30 rounded-lg">
        <OkrProgressBar
          baseline={kr.baseline}
          current={previewValue}
          target={kr.target}
          direction={kr.direction}
          status={status}
          unit={kr.unit}
          size="md"
        />
      </div>

      {/* Value comparison */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-2 rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Anterior</p>
          <p className="font-semibold text-sm">{kr.current_value} {kr.unit}</p>
        </div>
        <div className="flex items-center justify-center">
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-xs text-muted-foreground">Meta</p>
          <p className="font-semibold text-sm text-primary">{kr.target} {kr.unit}</p>
        </div>
      </div>

      {/* Value input */}
      {isAutomatic ? (
        <div className="flex items-center gap-2 p-3 bg-info-muted border border-info/30 rounded-lg">
          <Lock className="w-4 h-4 text-info" />
          <span className="text-sm text-info-muted-foreground">
            Este KR é atualizado automaticamente pela KPI vinculada
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="currentValue">Valor atual *</Label>
          <div className="flex items-center gap-2">
            <Input
              id="currentValue"
              type="number"
              step="any"
              value={currentValue}
              onChange={(e) => onValueChange(e.target.value)}
              className="flex-1"
              required
            />
            <span className="text-sm text-muted-foreground font-medium w-16">{kr.unit}</span>
          </div>
          {valueDiff !== 0 && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              isPositiveChange ? 'text-success' : 'text-destructive'
            )}>
              {isPositiveChange ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>
                {valueDiff > 0 ? '+' : ''}{valueDiff.toFixed(2)} {kr.unit} ({newProgress.toFixed(0)}% da meta)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
