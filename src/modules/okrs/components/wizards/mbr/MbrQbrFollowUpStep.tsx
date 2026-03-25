/**
 * MbrQbrFollowUpStep - Follow-up de decisões e compromissos do último QBR
 * 
 * Exibe decisões e compromissos cross-área pendentes do QBR anterior,
 * permitindo ao líder marcar como concluído ou escalar.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, AlertTriangle, Clock, ArrowRight, Link2 } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { WizardStepScaffold } from '@/modules/okrs/components/wizards/shared/WizardStepScaffold';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';

import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// ============================================================
// Types
// ============================================================

export interface QbrFollowUpItem {
  id: string;
  text: string;
  category: string;
  owner?: { id: string; name: string };
  deadline?: string | null;
  resolved: boolean;
  sourceType: 'decision' | 'commitment';
  fromTeam?: string;
  toTeam?: string;
}

interface MbrQbrFollowUpStepProps {
  followUpItems: QbrFollowUpItem[];
  onFollowUpItemsChange: (items: QbrFollowUpItem[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// Component
// ============================================================

export function MbrQbrFollowUpStep({
  followUpItems,
  onFollowUpItemsChange,
  onContinue,
  onBack,
}: MbrQbrFollowUpStepProps) {
  const { currentBuId } = useBu();
  const buSupabase = useBuScopedSupabase();

  // Load last completed QBR Post session for follow-up data
  const { data: lastQbrSession, isLoading } = useQuery({
    queryKey: ['mbr', 'qbr-followup', currentBuId],
    enabled: !!buSupabase && !!currentBuId && followUpItems.length === 0,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await buSupabase
        .from('okr_wizard_sessions')
        .select('id, reflection_data, completed_at, wizard_type')
        .in('wizard_type', ['qbr_post', 'qbr_meeting'])
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      return data;
    },
  });

  // Seed follow-up items from last QBR session
  useMemo(() => {
    if (followUpItems.length > 0 || !lastQbrSession?.reflection_data) return;

    const snapshot = (lastQbrSession.reflection_data as any)?.data || lastQbrSession.reflection_data;
    const items: QbrFollowUpItem[] = [];

    // Extract decisions
    const decisions = snapshot?.decisions || [];
    for (const d of decisions) {
      items.push({
        id: d.id || crypto.randomUUID(),
        text: d.text,
        category: d.category,
        owner: d.owner,
        deadline: d.deadline,
        resolved: false,
        sourceType: 'decision',
      });
    }

    // Extract cross-area commitments
    const commitments = snapshot?.crossCommitments || [];
    for (const c of commitments) {
      items.push({
        id: c.dependencyId || crypto.randomUUID(),
        text: c.description,
        category: 'commitment',
        deadline: c.deadline,
        resolved: false,
        sourceType: 'commitment',
        fromTeam: c.fromTeamId,
        toTeam: c.toTeamId,
      });
    }

    if (items.length > 0) {
      onFollowUpItemsChange(items);
    }
  }, [lastQbrSession, followUpItems.length, onFollowUpItemsChange]);

  // Handlers
  const toggleResolved = (itemId: string) => {
    onFollowUpItemsChange(
      followUpItems.map(item =>
        item.id === itemId ? { ...item, resolved: !item.resolved } : item
      )
    );
  };

  const resolvedCount = followUpItems.filter(i => i.resolved).length;
  const pendingCount = followUpItems.length - resolvedCount;
  const overdueCount = followUpItems.filter(i => !i.resolved && i.deadline && isPast(parseISO(i.deadline))).length;

  const decisionItems = followUpItems.filter(i => i.sourceType === 'decision');
  const commitmentItems = followUpItems.filter(i => i.sourceType === 'commitment');

  const noQbrData = !isLoading && followUpItems.length === 0;

  return (
    <WizardStepScaffold
      title="Follow-up do QBR"
      description="Acompanhamento de decisões e compromissos do último Quarterly Business Review"
      footer={
        <div className="flex justify-between w-full">
          <Button variant="outline" onClick={onBack}>Voltar</Button>
          <Button onClick={onContinue}>
            Continuar <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      }
    >
      {noQbrData ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Link2 className="mx-auto h-10 w-10 mb-3 opacity-40" />
            <p className="font-medium">Nenhum QBR anterior encontrado</p>
            <p className="text-sm mt-1">
              Não há decisões ou compromissos de QBR anteriores para acompanhar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary badges */}
          <div className="flex flex-wrap gap-3">
            <Badge variant="outline" className="flex items-center gap-1.5 py-1 px-3">
              <Clock className="h-3.5 w-3.5" />
              {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1.5 py-1 px-3 text-green-600 border-green-200 bg-green-50">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {resolvedCount} concluído{resolvedCount !== 1 ? 's' : ''}
            </Badge>
            {overdueCount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1.5 py-1 px-3">
                <AlertTriangle className="h-3.5 w-3.5" />
                {overdueCount} vencido{overdueCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* Decisions section */}
          {decisionItems.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Decisões do QBR</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-3">
                    {decisionItems.map(item => (
                      <FollowUpItemRow
                        key={item.id}
                        item={item}
                        onToggle={toggleResolved}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Commitments section */}
          {commitmentItems.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Compromissos Cross-Área</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-3">
                    {commitmentItems.map(item => (
                      <FollowUpItemRow
                        key={item.id}
                        item={item}
                        onToggle={toggleResolved}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </WizardStepScaffold>
  );
}

// ============================================================
// Sub-component
// ============================================================

function FollowUpItemRow({
  item,
  onToggle,
}: {
  item: QbrFollowUpItem;
  onToggle: (id: string) => void;
}) {
  const isOverdue = !item.resolved && item.deadline && isPast(parseISO(item.deadline));

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
        item.resolved
          ? 'bg-muted/30 border-muted'
          : isOverdue
          ? 'bg-destructive/5 border-destructive/20'
          : 'bg-card border-border'
      }`}
    >
      <Checkbox
        checked={item.resolved}
        onCheckedChange={() => onToggle(item.id)}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${item.resolved ? 'line-through text-muted-foreground' : ''}`}>
          {item.text}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {item.owner && (
            <span className="text-xs text-muted-foreground">
              → {item.owner.name}
            </span>
          )}
          {item.deadline && (
            <span className={`text-xs ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
              {isOverdue ? '⚠ ' : ''}Prazo: {format(parseISO(item.deadline), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          )}
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
            {item.category === 'commitment' ? 'Compromisso' :
             item.category === 'decision' ? 'Decisão' :
             item.category === 'focus_adjustment' ? 'Ajuste de foco' :
             item.category === 'next_step' ? 'Próximo passo' :
             item.category}
          </Badge>
        </div>
      </div>
    </div>
  );
}
