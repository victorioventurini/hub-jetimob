/**
 * MyPendingDecisionsCard — card de pendências do usuário no dashboard.
 *
 * Reutiliza `useMyPendingDecisions` + `DecisionFollowUpRow` (modo compacto).
 * Renderiza somente quando há itens pendentes.
 */
import { Link } from 'react-router-dom';
import { Lightbulb, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useIdentity } from '@/hooks/useIdentity';
import {
  useMyPendingDecisions,
  useUpdateDecisionFollowUp,
  useDecisionThread,
} from '@/modules/okrs/hooks';
import { DecisionFollowUpRow } from '@/modules/okrs/components/wizards/shared/DecisionFollowUpRow';
import { getRitualLabel } from '@/modules/okrs/constants/ritualLabels';

const MAX_VISIBLE = 5;

export function MyPendingDecisionsCard() {
  const { profileId } = useIdentity();
  const { data: pendingItems = [], isLoading } = useMyPendingDecisions(profileId);
  const { mutate: updateFollowUp, isPending: isUpdating } = useUpdateDecisionFollowUp();
  const { mutate: addThreadMessage, isPending: isAddingMessage } = useDecisionThread();

  if (isLoading || pendingItems.length === 0) return null;

  const visibleItems = pendingItems.slice(0, MAX_VISIBLE);
  const hiddenCount = Math.max(0, pendingItems.length - MAX_VISIBLE);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4 text-primary" />
          Minhas decisões pendentes
          <Badge variant="secondary" className="ml-1">{pendingItems.length}</Badge>
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/decisions" className="gap-1 text-xs">
            Ver todas
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {visibleItems.map((item) => (
          <DecisionFollowUpRow
            key={`${item.sessionId}-${item.decision.id}`}
            decision={item.decision}
            sessionId={item.sessionId}
            onUpdate={({ sessionId, decisionId, updates }) => {
              updateFollowUp({ sessionId, decisionId, updates });
            }}
            isPending={isUpdating}
            onAddMessage={({ sessionId, decisionId, content }) => {
              addThreadMessage({ sessionId, decisionId, content });
            }}
            isAddingMessage={isAddingMessage}
            hideThread
          />
        ))}
        {hiddenCount > 0 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            +{hiddenCount} pendência{hiddenCount > 1 ? 's' : ''} não exibida{hiddenCount > 1 ? 's' : ''}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
