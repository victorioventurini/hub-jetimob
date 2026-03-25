/**
 * QbrMeetingClosingStep - Step 6: Checklist de governança e encerramento
 * 
 * 4 itens obrigatórios + feedback do rito via estrelas.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ShieldCheck, Star, Plus, X, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardLastStepFooter,
  WizardStepScaffold,
} from '../shared';
import type {
  QbrMeetingGovernanceChecklist,
  RitualImprovementFeedback,
} from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface QbrMeetingClosingStepProps {
  checklist: QbrMeetingGovernanceChecklist;
  onChecklistChange: (checklist: QbrMeetingGovernanceChecklist) => void;
  ritualFeedback: RitualImprovementFeedback[];
  onRitualFeedbackChange: (feedback: RitualImprovementFeedback[]) => void;
  isCompleting?: boolean;
  onComplete: () => void;
  onBack: () => void;
}

// ============================================================
// CHECKLIST ITEMS
// ============================================================

const CHECKLIST_ITEMS: { key: keyof QbrMeetingGovernanceChecklist; label: string }[] = [
  { key: 'allTeamsReviewed', label: 'Todos os times tiveram OKRs revisados?' },
  { key: 'decisionsHaveOwners', label: 'Toda decisão tem dono e prazo?' },
  { key: 'dependenciesFormalized', label: 'Dependências cross-área registradas?' },
  { key: 'feedbackLinkSent', label: 'Link de avaliação enviado para participantes?' },
];

// ============================================================
// STAR RATING
// ============================================================

function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          className="p-0.5 transition-colors"
        >
          <Star className={cn(
            'h-5 w-5',
            star <= (hovered || value) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
          )} />
        </button>
      ))}
    </div>
  );
}

// ============================================================
// COMPONENT
// ============================================================

export function QbrMeetingClosingStep({
  checklist,
  onChecklistChange,
  ritualFeedback,
  onRitualFeedbackChange,
  isCompleting,
  onComplete,
  onBack,
}: QbrMeetingClosingStepProps) {
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');

  const allChecked = CHECKLIST_ITEMS.every(item => checklist[item.key]);

  const handleToggle = (key: keyof QbrMeetingGovernanceChecklist) => {
    onChecklistChange({ ...checklist, [key]: !checklist[key] });
  };

  const handleAddFeedback = () => {
    if (feedbackRating < 1) return;
    const fb: RitualImprovementFeedback = {
      id: `fb-${Date.now()}`,
      rating: feedbackRating,
      text: feedbackText.trim() || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    onRitualFeedbackChange([...ritualFeedback, fb]);
    setFeedbackRating(0);
    setFeedbackText('');
  };

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={ShieldCheck}
          title="Encerramento"
          description="Checklist de governança e feedback do rito"
          variant="green"
        />
      }
      footer={
        <WizardLastStepFooter
          onBack={onBack}
          onPrimary={onComplete}
          primaryDisabled={!allChecked}
          primaryLoading={isCompleting}
        />
      }
    >
      <div className="p-6 space-y-6">
        {/* Governance checklist */}
        <Card>
          <CardContent className="p-4 space-y-3">
            {CHECKLIST_ITEMS.map(item => (
              <div key={item.key} className="flex items-center gap-3">
                <Checkbox
                  id={item.key}
                  checked={checklist[item.key]}
                  onCheckedChange={() => handleToggle(item.key)}
                />
                <Label htmlFor={item.key} className="text-sm cursor-pointer flex-1">
                  {item.label}
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Ritual feedback */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Feedback do Rito</span>
            </div>

            <div className="flex items-center gap-3">
              <StarRatingInput value={feedbackRating} onChange={setFeedbackRating} />
              {feedbackRating > 0 && (
                <span className="text-xs text-muted-foreground">{feedbackRating}/5</span>
              )}
            </div>

            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Sugestão de melhoria (opcional)..."
              className="text-xs min-h-[60px]"
            />

            <Button
              size="sm"
              variant="outline"
              onClick={handleAddFeedback}
              disabled={feedbackRating < 1}
            >
              <Plus className="h-3 w-3 mr-1" /> Adicionar feedback
            </Button>

            {ritualFeedback.length > 0 && (
              <div className="space-y-1 mt-2">
                {ritualFeedback.map((fb) => (
                  <div key={fb.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/50">
                    <span className="font-medium">{fb.rating}★</span>
                    {fb.suggestion && <span className="flex-1 truncate">{fb.suggestion}</span>}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => onRitualFeedbackChange(ritualFeedback.filter(f => f.id !== fb.id))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </WizardStepScaffold>
  );
}
