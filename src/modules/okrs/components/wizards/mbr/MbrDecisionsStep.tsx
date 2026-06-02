/**
 * MbrDecisionsStep - Etapa 4: Decisões Estratégicas Consolidadas
 * 
 * Consolida decisões de todas as etapas anteriores + pendências do MBR anterior.
 * Permite CRUD completo com edição inline e reclassificação.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { TextareaAutoSubmit } from '@/components/ui/textarea-auto-submit';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Lightbulb, Target, CheckCircle2, Plus, Clock,
  LayoutDashboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardStepFooter, DecisionCard } from '../shared';
import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface MbrDecisionsStepProps {
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  previousMbrPendingItems: TeamCheckinDecision[];
  /** Itens sinalizados pelos líderes no MBR-PRE como "needs_decision" ou "cross_dependency" */
  mbrPreSurfacedItems?: Array<{
    key: string;
    teamId: string;
    kind: 'needs_decision' | 'cross_dependency';
    text: string;
  }>;
  /** Mapa teamId → nome para exibir origem dos itens sinalizados */
  teamNamesById?: Record<string, string>;
  /** Sugestões de pauta agregadas dos pré-MBRs dos times */
  mbrPreAgendaSuggestions?: Array<{
    key: string;
    teamId: string;
    title: string;
    detail?: string;
  }>;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// CONSTANTS
// ============================================================

const CATEGORY_CONFIG = {
  decision: { label: 'Decisão', icon: Lightbulb, color: 'bg-status-blue-muted text-status-blue' },
  focus_adjustment: { label: 'Ajuste de Foco', icon: Target, color: 'bg-status-purple-muted text-status-purple' },
  next_step: { label: 'Próximo Passo', icon: CheckCircle2, color: 'bg-status-green-muted text-status-green' },
} as const;

const SOURCE_STEP_LABELS: Record<string, string> = {
  panorama: 'Do Panorama',
  'kpi-gate': 'Do KPI Gate',
  'org-okrs': 'Das OKRs Org',
  decisions: 'Desta Etapa',
  closing: 'Do Encerramento',
};

const CATEGORIES = ['decision', 'focus_adjustment', 'next_step'] as const;

// ============================================================
// COMPONENT
// ============================================================

export function MbrDecisionsStep({
  decisions,
  onDecisionsChange,
  previousMbrPendingItems,
  mbrPreSurfacedItems = [],
  teamNamesById = {},
  mbrPreAgendaSuggestions = [],
  onContinue,
  onBack,
}: MbrDecisionsStepProps) {
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState<TeamCheckinDecision['category']>('decision');

  // Hidrata pendências do MBR anterior em `decisions` (uma única vez), marcando
  // `metadata.carry_over = true` para que sejam renderizadas na seção própria
  // e fiquem totalmente editáveis (texto, categoria, responsável, prazo).
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    if (!previousMbrPendingItems || previousMbrPendingItems.length === 0) return;
    const existingIds = new Set(decisions.map((d) => d.id));
    const toAdd = previousMbrPendingItems
      .filter((p) => !existingIds.has(p.id))
      .map<TeamCheckinDecision>((p) => ({
        ...p,
        sourceStep: 'decisions',
        metadata: {
          ...((p as { metadata?: Record<string, unknown> }).metadata ?? {}),
          carry_over: true,
        },
      }));
    hydratedRef.current = true;
    if (toAdd.length > 0) onDecisionsChange([...decisions, ...toAdd]);
  }, [previousMbrPendingItems, decisions, onDecisionsChange]);

  const carryOverDecisions = useMemo(
    () =>
      decisions.filter(
        (d) => (d.metadata as { carry_over?: boolean } | undefined)?.carry_over === true,
      ),
    [decisions],
  );

  // Group by source step (exclui carry-overs — eles têm seção própria)
  const groupedDecisions = useMemo(() => {
    const groups: Record<string, TeamCheckinDecision[]> = {};
    const stepOrder = ['panorama', 'kpi-gate', 'org-okrs', 'decisions'];

    for (const d of decisions) {
      if ((d.metadata as { carry_over?: boolean } | undefined)?.carry_over === true) continue;
      const step = (d.sourceStep as string) || 'decisions';
      if (!groups[step]) groups[step] = [];
      groups[step].push(d);
    }

    return stepOrder
      .filter(step => groups[step]?.length > 0)
      .map(step => ({ step, label: SOURCE_STEP_LABELS[step] || step, items: groups[step] }));
  }, [decisions]);

  const handleAdd = () => {
    if (!newText.trim()) return;
    const decision: TeamCheckinDecision = {
      id: `mbr-decision-${Date.now()}`,
      text: newText.trim(),
      category: newCategory,
      sourceStep: 'decisions',
    };
    onDecisionsChange([...decisions, decision]);
    setNewText('');
  };

  const handleRemove = (id: string) => onDecisionsChange(decisions.filter(d => d.id !== id));

  const handleUpdate = (id: string, updates: Partial<TeamCheckinDecision>) =>
    onDecisionsChange(decisions.map(d => d.id === id ? { ...d, ...updates } : d));

  return (
    <div className="flex flex-col h-full">
      <WizardStepHeader
        icon={LayoutDashboard}
        title="Pautas e decisões"
        tooltip="mbr-decisions"
        description={`${decisions.length} registro${decisions.length !== 1 ? 's' : ''} consolidados`}
        variant="green"
      />

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Add new */}
          <div className="space-y-3">
            <Label>Adicionar registro</Label>
            <div className="flex gap-2">
              <TextareaAutoSubmit
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Ex: Realocar orçamento de marketing para produto B"
                onSubmit={handleAdd}
                minRows={1}
                maxRows={4}
              />
              <Button onClick={handleAdd} disabled={!newText.trim()} className="self-end">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              {CATEGORIES.map((cat) => {
                const config = CATEGORY_CONFIG[cat];
                return (
                  <Badge
                    key={cat}
                    variant="outline"
                    className={cn('cursor-pointer transition-colors', newCategory === cat && config.color)}
                    onClick={() => setNewCategory(cat)}
                  >
                    {config.label}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Grouped decisions */}
          {groupedDecisions.length > 0 && (
            <div className="space-y-4">
              {groupedDecisions.map(({ step, label, items }) => (
                <div key={step} className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                  {items.map((d) => (
                    <DecisionCard
                      key={d.id}
                      decision={d}
                      onUpdate={handleUpdate}
                      onRemove={handleRemove}
                      showReclassify
                      showOwnerDeadline
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {decisions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum registro ainda. Adicione decisões, ajustes de foco ou próximos passos.
            </p>
          )}

          {/* Previous MBR pending items — editáveis com a mesma UI dos registros desta etapa */}
          {carryOverDecisions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-status-amber" />
                  Pendências do MBR Anterior ({carryOverDecisions.length})
                </h4>
                <p className="text-xs text-muted-foreground">
                  Próximos passos e ajustes de foco do último MBR. Edite, reclassifique ou atribua responsável/prazo.
                </p>
                {carryOverDecisions.map((d) => (
                  <DecisionCard
                    key={d.id}
                    decision={d}
                    onUpdate={handleUpdate}
                    onRemove={handleRemove}
                    showReclassify
                    showOwnerDeadline
                  />
                ))}
              </div>
            </>
          )}

          {/* Itens sinalizados pelos times no Pré-MBR */}
          {mbrPreSurfacedItems.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2 text-sm">
                  <Lightbulb className="h-4 w-4 text-status-amber" />
                  Sinalizações dos Pré-MBRs ({mbrPreSurfacedItems.length})
                </h4>
                <p className="text-xs text-muted-foreground">
                  Itens trazidos pelos líderes que pedem decisão ou são dependências cross-team
                </p>
                {mbrPreSurfacedItems.map((item) => {
                  const teamName = teamNamesById[item.teamId] ?? 'Time';
                  const kindLabel = item.kind === 'needs_decision' ? 'Pede decisão' : 'Cross-team';
                  return (
                    <Card key={item.key} className="border-dashed">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-status-amber flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{item.text}</p>
                            <div className="flex gap-1.5 mt-1">
                              <Badge variant="outline" className="text-[10px]">{teamName}</Badge>
                              <Badge variant="outline" className="text-[10px]">{kindLabel}</Badge>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const decision: TeamCheckinDecision = {
                                id: `mbr-pre-${item.key}-${Date.now()}`,
                                text: `[${teamName}] ${item.text}`,
                                category: item.kind === 'needs_decision' ? 'decision' : 'next_step',
                                sourceStep: 'decisions',
                              };
                              onDecisionsChange([...decisions, decision]);
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          {/* Sugestões de pauta foram movidas para o Step 1 (Panorama & Curadoria do MBR). */}
        </div>
      </ScrollArea>

      <WizardStepFooter
        onBack={onBack}
        onPrimary={onContinue}
        primaryLabel="Encerrar MBR"
      />
    </div>
  );
}
