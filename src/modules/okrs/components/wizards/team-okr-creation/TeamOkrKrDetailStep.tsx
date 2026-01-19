/**
 * TeamOkrKrDetailStep - Step 5: Detalhando KRs
 * 
 * Cap. 5 cont. do storytelling:
 * - Formulário contextual por tipo de KR
 * - Perguntas específicas por tipo
 * - Feedback em tempo real
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Target, Link2, Wrench, TrendingUp, TrendingDown, Equal, User, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepFooter } from '../shared';
import { useWizardAI } from '@/modules/okrs/hooks/useWizardAI';
import { useDebounce } from '@/hooks/useDebounce';
import { AskToVicStepHelper } from '@/modules/vic/components/AskToVic';
import type { OkrKrType, OkrDirection, DraftTeamKr } from '@/modules/okrs/types/wizard';
import type { KrPlan } from './TeamOkrKrTypeStep';

// ============================================================
// TYPES
// ============================================================

export interface TeamMember {
  id: string;
  fullName: string;
  avatarUrl?: string;
}

export interface TeamOkrKrDetailStepProps {
  objectiveTitle: string;
  krPlan: KrPlan;
  draftKrs: DraftTeamKr[];
  teamMembers: TeamMember[];
  onDraftKrsChange: (krs: DraftTeamKr[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// CONSTANTS
// ============================================================

const TYPE_CONFIG = {
  foundational: {
    icon: Target,
    color: 'text-success',
    bgColor: 'bg-success-muted',
    title: 'Fundacional',
    questions: [
      'Que número prova que esse objetivo foi atingido?',
      'Se esse KR bater, você diria que o objetivo foi um sucesso?',
    ],
  },
  contribution: {
    icon: Link2,
    color: 'text-info',
    bgColor: 'bg-info-muted',
    title: 'Contribuição',
    questions: [
      'Qual KR organizacional esse resultado alimenta?',
      'Qual a meta que deixa claro que você contribuiu?',
    ],
  },
  enabler: {
    icon: Wrench,
    color: 'text-warning',
    bgColor: 'bg-warning-muted',
    title: 'Habilitador',
    questions: [
      'O que precisa estar entregue para o resultado ser possível?',
      'Esse KR depende só do seu time?',
    ],
  },
};

const UNITS = ['%', 'un', 'R$', 'pontos', 'dias', 'horas', 'NPS', 'CSAT'];

// ============================================================
// COMPONENT
// ============================================================

export function TeamOkrKrDetailStep({
  objectiveTitle,
  krPlan,
  draftKrs,
  teamMembers,
  onDraftKrsChange,
  onContinue,
  onBack,
}: TeamOkrKrDetailStepProps) {
  const { invokeVic } = useWizardAI();
  const [currentKrIndex, setCurrentKrIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Generate list of KRs to fill based on plan
  const krSlots = useMemo(() => {
    const slots: { type: OkrKrType; index: number }[] = [];
    let idx = 0;
    
    for (let i = 0; i < krPlan.foundational; i++) {
      slots.push({ type: 'foundational', index: idx++ });
    }
    for (let i = 0; i < krPlan.contribution; i++) {
      slots.push({ type: 'contribution', index: idx++ });
    }
    for (let i = 0; i < krPlan.enabler; i++) {
      slots.push({ type: 'enabler', index: idx++ });
    }
    
    return slots;
  }, [krPlan]);

  // Initialize draft KRs if needed
  useEffect(() => {
    if (draftKrs.length !== krSlots.length) {
      const newDrafts: DraftTeamKr[] = krSlots.map((slot, i) => ({
        id: draftKrs[i]?.id || `draft-${i}-${Date.now()}`,
        type: slot.type,
        title: draftKrs[i]?.title || '',
        baseline: draftKrs[i]?.baseline ?? 0,
        target: draftKrs[i]?.target ?? 0,
        unit: draftKrs[i]?.unit || '%',
        direction: draftKrs[i]?.direction || 'up',
        owner_user_id: draftKrs[i]?.owner_user_id || null,
        linked_org_kr_id: draftKrs[i]?.linked_org_kr_id || null,
      }));
      onDraftKrsChange(newDrafts);
    }
  }, [krSlots, draftKrs, onDraftKrsChange]);

  const currentSlot = krSlots[currentKrIndex];
  const currentKr = draftKrs[currentKrIndex];
  const config = currentSlot ? TYPE_CONFIG[currentSlot.type] : null;

  // Update a specific KR field
  const updateKrField = useCallback(<K extends keyof DraftTeamKr>(
    field: K,
    value: DraftTeamKr[K]
  ) => {
    const updated = [...draftKrs];
    updated[currentKrIndex] = {
      ...updated[currentKrIndex],
      [field]: value,
    };
    onDraftKrsChange(updated);
  }, [draftKrs, currentKrIndex, onDraftKrsChange]);

  // Navigation
  const handleNext = useCallback(() => {
    if (currentKrIndex < krSlots.length - 1) {
      setCurrentKrIndex(prev => prev + 1);
    } else {
      onContinue();
    }
  }, [currentKrIndex, krSlots.length, onContinue]);

  const handlePrev = useCallback(() => {
    if (currentKrIndex > 0) {
      setCurrentKrIndex(prev => prev - 1);
    } else {
      onBack();
    }
  }, [currentKrIndex, onBack]);

  // Validation
  const isKrValid = useMemo(() => {
    if (!currentKr) return false;
    return (
      currentKr.title.trim().length >= 5 &&
      currentKr.owner_user_id &&
      (currentKr.target !== currentKr.baseline)
    );
  }, [currentKr]);

  const allKrsValid = useMemo(() => {
    return draftKrs.every(kr => 
      kr.title.trim().length >= 5 &&
      kr.owner_user_id &&
      kr.target !== kr.baseline
    );
  }, [draftKrs]);

  if (!currentSlot || !currentKr || !config) {
    return null;
  }

  const Icon = config.icon;
  const isLastKr = currentKrIndex === krSlots.length - 1;

  return (
    <div className="flex flex-col h-full">
      {/* Progress indicator */}
      <div className="px-6 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            KR {currentKrIndex + 1} de {krSlots.length}
          </span>
          <div className="flex gap-1">
            {krSlots.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 w-8 rounded-full transition-colors",
                  i < currentKrIndex && "bg-green-500",
                  i === currentKrIndex && "bg-primary",
                  i > currentKrIndex && "bg-muted"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* KR Type Header */}
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", config.bgColor)}>
              <Icon className={cn("h-5 w-5", config.color)} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">KR {config.title}</h2>
                <AskToVicStepHelper
                  context={{
                    module: 'okrs',
                    wizard: 'creation',
                    step: 'kr-detail',
                    objectiveTitle,
                    krType: currentSlot.type === 'foundational' ? 'fundacional' 
                      : currentSlot.type === 'contribution' ? 'contribuicao' 
                      : 'habilitador',
                    krTitle: currentKr.title,
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Para o objetivo: {objectiveTitle}
              </p>
            </div>
          </div>

          {/* Guiding Question */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <p className="text-sm font-medium">{config.questions[0]}</p>
          </div>

          {/* KR Title */}
          <div className="space-y-2">
            <Label htmlFor="kr-title">Título do KR</Label>
            <Input
              id="kr-title"
              placeholder="Ex: Aumentar NPS de 65 para 72 pontos"
              value={currentKr.title}
              onChange={(e) => updateKrField('title', e.target.value)}
            />
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="kr-baseline">Baseline</Label>
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    id="no-baseline"
                    checked={currentKr.noBaseline ?? false}
                    onCheckedChange={(checked) => {
                      updateKrField('noBaseline', !!checked);
                      if (checked) {
                        updateKrField('baseline', 0);
                      }
                    }}
                  />
                  <label 
                    htmlFor="no-baseline" 
                    className="text-xs text-muted-foreground cursor-pointer"
                  >
                    Sem baseline
                  </label>
                </div>
              </div>
              <Input
                id="kr-baseline"
                type="number"
                placeholder="0"
                disabled={currentKr.noBaseline}
                value={currentKr.noBaseline ? '' : (currentKr.baseline || '')}
                onChange={(e) => updateKrField('baseline', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kr-target">Meta</Label>
              <Input
                id="kr-target"
                type="number"
                placeholder="100"
                value={currentKr.target || ''}
                onChange={(e) => updateKrField('target', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kr-unit">Unidade</Label>
              <Select
                value={currentKr.unit}
                onValueChange={(value) => updateKrField('unit', value)}
              >
                <SelectTrigger id="kr-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map(unit => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Direction */}
          <div className="space-y-2">
            <Label>Direção</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={currentKr.direction === 'up' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => updateKrField('direction', 'up')}
              >
                <TrendingUp className="h-4 w-4" />
                Aumentar
              </Button>
              <Button
                type="button"
                variant={currentKr.direction === 'down' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => updateKrField('direction', 'down')}
              >
                <TrendingDown className="h-4 w-4" />
                Diminuir
              </Button>
              <Button
                type="button"
                variant={currentKr.direction === 'maintain' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => {
                  updateKrField('direction', 'maintain');
                  updateKrField('target', currentKr.baseline);
                }}
              >
                <Equal className="h-4 w-4" />
                Manter
              </Button>
            </div>
          </div>

          {/* Owner */}
          <div className="space-y-2">
            <Label htmlFor="kr-owner">Responsável</Label>
            <Select
              value={currentKr.owner_user_id || ''}
              onValueChange={(value) => updateKrField('owner_user_id', value)}
            >
              <SelectTrigger id="kr-owner">
                <SelectValue placeholder="Selecione o responsável" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {member.fullName}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          {isKrValid && (
            <Card className="border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 mb-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Preview do KR</span>
                </div>
                <p className="text-sm font-medium">{currentKr.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {currentKr.direction === 'up' ? 'Aumentar' : 'Diminuir'} de {currentKr.baseline} para {currentKr.target} {currentKr.unit}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      <WizardStepFooter
        backLabel={currentKrIndex === 0 ? 'Voltar' : 'KR Anterior'}
        onBack={handlePrev}
        primaryLabel={isLastKr ? (allKrsValid ? 'Revisar dependências' : 'Completar KRs restantes') : 'Próximo KR'}
        onPrimary={handleNext}
        primaryDisabled={!isKrValid}
      />
    </div>
  );
}
