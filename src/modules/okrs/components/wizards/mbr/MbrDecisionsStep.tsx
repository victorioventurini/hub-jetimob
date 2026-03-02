/**
 * MbrDecisionsStep - Etapa 4: Decisões Estratégicas Consolidadas
 * 
 * Consolida decisões de todas as etapas anteriores + pendências do MBR anterior.
 * Permite CRUD completo com edição inline e reclassificação.
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { TextareaAutoSubmit } from '@/components/ui/textarea-auto-submit';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Lightbulb, Target, CheckCircle2, Plus, X, Pencil, Check, Clock,
  LayoutDashboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardStepFooter } from '../shared';
import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface MbrDecisionsStepProps {
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  previousMbrPendingItems: TeamCheckinDecision[];
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
// SUBCOMPONENT: DecisionCard with reclassification
// ============================================================

function MbrDecisionCard({
  decision,
  onUpdate,
  onRemove,
  onReclassify,
}: {
  decision: TeamCheckinDecision;
  onUpdate: (id: string, text: string) => void;
  onRemove: (id: string) => void;
  onReclassify: (id: string, category: TeamCheckinDecision['category']) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(decision.text);
  const config = CATEGORY_CONFIG[decision.category];
  const Icon = config.icon;

  const handleSave = () => {
    if (editText.trim()) onUpdate(decision.id, editText.trim());
    setIsEditing(false);
  };

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <Icon className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex gap-2">
                <TextareaAutoSubmit
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="text-sm"
                  autoFocus
                  onSubmit={handleSave}
                  minRows={1}
                  maxRows={4}
                  onKeyDownCapture={(e) => { if (e.key === 'Escape') setIsEditing(false); }}
                />
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 self-end" onClick={handleSave}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <p className="text-sm">{decision.text}</p>
            )}
            {/* Category badges for reclassification */}
            <div className="flex gap-1 mt-1.5">
              {CATEGORIES.map((cat) => {
                const c = CATEGORY_CONFIG[cat];
                return (
                  <Badge
                    key={cat}
                    variant="outline"
                    className={cn(
                      'text-[10px] h-5 px-1.5 cursor-pointer transition-colors',
                      decision.category === cat && c.color
                    )}
                    onClick={() => onReclassify(decision.id, cat)}
                  >
                    {c.label}
                  </Badge>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {!isEditing && (
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => { setEditText(decision.text); setIsEditing(true); }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(decision.id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// COMPONENT
// ============================================================

export function MbrDecisionsStep({
  decisions,
  onDecisionsChange,
  previousMbrPendingItems,
  onContinue,
  onBack,
}: MbrDecisionsStepProps) {
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState<TeamCheckinDecision['category']>('decision');

  // Group by source step
  const groupedDecisions = useMemo(() => {
    const groups: Record<string, TeamCheckinDecision[]> = {};
    const stepOrder = ['panorama', 'kpi-gate', 'org-okrs', 'decisions'];

    for (const d of decisions) {
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
  const handleUpdate = (id: string, text: string) => onDecisionsChange(decisions.map(d => d.id === id ? { ...d, text } : d));
  const handleReclassify = (id: string, category: TeamCheckinDecision['category']) =>
    onDecisionsChange(decisions.map(d => d.id === id ? { ...d, category } : d));

  return (
    <div className="flex flex-col h-full">
      <WizardStepHeader
        icon={LayoutDashboard}
        title="Decisões Estratégicas"
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
                    <MbrDecisionCard
                      key={d.id}
                      decision={d}
                      onUpdate={handleUpdate}
                      onRemove={handleRemove}
                      onReclassify={handleReclassify}
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

          {/* Previous MBR pending items */}
          {previousMbrPendingItems.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-status-amber" />
                  Pendências do MBR Anterior ({previousMbrPendingItems.length})
                </h4>
                <p className="text-xs text-muted-foreground">
                  Próximos passos e ajustes de foco do último MBR
                </p>
                {previousMbrPendingItems.map((item) => {
                  const config = CATEGORY_CONFIG[item.category];
                  const Icon = config.icon;
                  return (
                    <Card key={item.id} className="border-dashed">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <p className="text-sm flex-1">{item.text}</p>
                          <Badge variant="secondary" className={cn('text-[10px]', config.color)}>
                            {config.label}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
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
