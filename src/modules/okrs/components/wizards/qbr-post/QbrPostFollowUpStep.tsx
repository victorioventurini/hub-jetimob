/**
 * QbrPostFollowUpStep - Step 4: Cadência de acompanhamento
 * 
 * Configura cadência de follow-up e temas para o próximo MBR.
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarClock, Plus, X } from 'lucide-react';
import { useState } from 'react';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
} from '../shared';
import type { QbrPostSnapshot } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

type FollowUpCadence = QbrPostSnapshot['followUpCadence'];

export interface QbrPostFollowUpStepProps {
  followUpCadence: FollowUpCadence;
  onFollowUpCadenceChange: (cadence: FollowUpCadence) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function QbrPostFollowUpStep({
  followUpCadence,
  onFollowUpCadenceChange,
  onContinue,
  onBack,
}: QbrPostFollowUpStepProps) {
  const [newTopic, setNewTopic] = useState('');

  const handleAddTopic = () => {
    if (!newTopic.trim()) return;
    onFollowUpCadenceChange({
      ...followUpCadence,
      nextMbrTopics: [...followUpCadence.nextMbrTopics, newTopic.trim()],
    });
    setNewTopic('');
  };

  const handleRemoveTopic = (index: number) => {
    onFollowUpCadenceChange({
      ...followUpCadence,
      nextMbrTopics: followUpCadence.nextMbrTopics.filter((_, i) => i !== index),
    });
  };

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={CalendarClock}
          title="Cadência de Acompanhamento"
          description="Configure o ritmo de follow-up e pauta do próximo MBR"
          variant="amber"
        />
      }
      footer={
        <WizardStepFooter onBack={onBack} onPrimary={onContinue} />
      }
    >
      <div className="p-6 space-y-6">
        {/* Frequency */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Frequência de verificação de decisões</Label>
              <Select
                value={followUpCadence.checkDecisionsEvery}
                onValueChange={(v) => onFollowUpCadenceChange({ ...followUpCadence, checkDecisionsEvery: v as FollowUpCadence['checkDecisionsEvery'] })}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="biweekly">Quinzenal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Data do próximo MBR</Label>
              <Input
                type="date"
                value={followUpCadence.nextMbrDate}
                onChange={(e) => onFollowUpCadenceChange({ ...followUpCadence, nextMbrDate: e.target.value })}
                className="text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Next MBR topics */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <Label className="text-sm font-medium">
              Temas para o próximo MBR ({followUpCadence.nextMbrTopics.length})
            </Label>

            {followUpCadence.nextMbrTopics.length > 0 && (
              <div className="space-y-1">
                {followUpCadence.nextMbrTopics.map((topic, i) => (
                  <div key={i} className="flex items-center gap-2 p-1.5 rounded bg-muted/50">
                    <Badge variant="outline" className="text-[10px] shrink-0">{i + 1}</Badge>
                    <span className="text-sm flex-1">{topic}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => handleRemoveTopic(i)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="Tema para o próximo MBR..."
                className="text-sm flex-1"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddTopic(); }}
              />
              <Button size="sm" variant="outline" onClick={handleAddTopic} disabled={!newTopic.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </WizardStepScaffold>
  );
}
