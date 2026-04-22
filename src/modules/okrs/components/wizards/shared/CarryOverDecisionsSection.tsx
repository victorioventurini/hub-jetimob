/**
 * CarryOverDecisionsSection — seção compartilhada que exibe decisões
 * pendentes do rito anterior (mesmo `wizard_type`/`team_id`).
 *
 * Renderiza somente quando há itens. Usa `DecisionCard` em modo read-only
 * (sem `onUpdate`/`onRemove` efetivos) para manter consistência visual.
 *
 * Padrão de consumo:
 *   <CarryOverDecisionsSection items={carryOverDecisions} />
 *
 * Onde `carryOverDecisions` vem de `useCarryOverDecisions({ wizardType, teamId })`.
 */
import { Clock } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { DecisionCard } from './DecisionCard';
import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';

export interface CarryOverDecisionsSectionProps {
  items: TeamCheckinDecision[] | undefined | null;
  /** Texto curto identificando o rito anterior (ex.: "do MBR anterior"). */
  contextLabel?: string;
  /** Mostrar separador acima da seção (default: true). */
  showSeparator?: boolean;
}

const noopUpdate = (_id: string, _updates: Partial<TeamCheckinDecision>) => {};
const noopRemove = (_id: string) => {};

export function CarryOverDecisionsSection({
  items,
  contextLabel = 'do rito anterior',
  showSeparator = true,
}: CarryOverDecisionsSectionProps) {
  if (!items || items.length === 0) return null;

  return (
    <>
      {showSeparator && <Separator />}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-status-amber" />
          <h4 className="text-sm font-medium text-foreground">
            Pendências {contextLabel}
          </h4>
          <Badge variant="outline" className="ml-1 text-xs">
            {items.length}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Decisões e próximos passos que ainda não foram resolvidos.
        </p>
        <div className="space-y-2">
          {items.map((d) => (
            <DecisionCard
              key={d.id}
              decision={d}
              onUpdate={noopUpdate}
              onRemove={noopRemove}
            />
          ))}
        </div>
      </section>
    </>
  );
}
