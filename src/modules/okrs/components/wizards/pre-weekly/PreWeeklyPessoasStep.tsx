/**
 * PreWeeklyPessoasStep — Step 3 do Pré-Weekly v2
 *
 * "Pessoas" — sinais estruturais sobre o time que merecem destaque na Weekly.
 *
 * Mantém-se separado da pauta de performance/projetos para garantir que o
 * tema pessoas tenha tração própria — historicamente é o que cai primeiro
 * quando há aperto de tempo.
 */

import { useCallback } from 'react';
import { Users, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
  InlineDecisionInput,
} from '../shared';
import type {
  PreWeeklyPeopleSignal,
  TeamCheckinDecision,
} from '@/modules/okrs/types/wizard';

// ============================================================
// CONSTANTS
// ============================================================

const SIGNAL_TYPE_LABEL: Record<PreWeeklyPeopleSignal['type'], string> = {
  celebracao: 'Celebração',
  risco: 'Risco',
  mudanca: 'Mudança',
  feedback: 'Feedback',
};

// ============================================================
// TYPES
// ============================================================

export interface PreWeeklyPessoasStepProps {
  peopleSignals: PreWeeklyPeopleSignal[];
  onPeopleSignalsChange: (signals: PreWeeklyPeopleSignal[]) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function PreWeeklyPessoasStep({
  peopleSignals,
  onPeopleSignalsChange,
  decisions,
  onDecisionsChange,
  onContinue,
  onBack,
}: PreWeeklyPessoasStepProps) {
  const handleAdd = useCallback(() => {
    const newSignal: PreWeeklyPeopleSignal = {
      id: `signal-${Date.now()}`,
      type: 'celebracao',
      description: '',
    };
    onPeopleSignalsChange([...peopleSignals, newSignal]);
  }, [peopleSignals, onPeopleSignalsChange]);

  const handleUpdate = useCallback(
    (id: string, patch: Partial<PreWeeklyPeopleSignal>) => {
      onPeopleSignalsChange(
        peopleSignals.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      );
    },
    [peopleSignals, onPeopleSignalsChange],
  );

  const handleRemove = useCallback(
    (id: string) => {
      onPeopleSignalsChange(peopleSignals.filter((s) => s.id !== id));
    },
    [peopleSignals, onPeopleSignalsChange],
  );

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Users}
          title="Pessoas"
          description="Sinais estruturais sobre o time para a Weekly"
          variant="purple"
          rightContent={
            <Badge variant="outline" className="text-xs">
              {peopleSignals.length}{' '}
              {peopleSignals.length === 1 ? 'sinal' : 'sinais'}
            </Badge>
          }
        />
      }
      bottomFixed={
        <InlineDecisionInput
          decisions={decisions}
          onDecisionsChange={onDecisionsChange}
          sourceStep="pre-weekly-pessoas"
          placeholder="Registrar decisão sobre pessoas…"
        />
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
          primaryLabel="Continuar para Resumo"
        />
      }
    >
      <div className="p-4 sm:p-6 space-y-4">
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Por que separar Pessoas?</CardTitle>
            <CardDescription>
              Pessoas é estrutural — não compete por tempo com performance e
              projetos. Use este espaço para celebrar, sinalizar riscos,
              registrar mudanças e devolver feedbacks ao grupo.
            </CardDescription>
          </CardHeader>
        </Card>

        {peopleSignals.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Nenhum sinal adicionado.
              </p>
              <Button onClick={handleAdd} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar sinal
              </Button>
            </CardContent>
          </Card>
        )}

        {peopleSignals.map((signal, idx) => (
          <Card key={signal.id}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Sinal {idx + 1}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(signal.id)}
                aria-label="Remover sinal"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select
                  value={signal.type}
                  onValueChange={(v) =>
                    handleUpdate(signal.id, {
                      type: v as PreWeeklyPeopleSignal['type'],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.keys(SIGNAL_TYPE_LABEL) as PreWeeklyPeopleSignal['type'][]
                    ).map((t) => (
                      <SelectItem key={t} value={t}>
                        {SIGNAL_TYPE_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor={`desc-${signal.id}`} className="text-xs">
                  Descrição
                </Label>
                <Textarea
                  id={`desc-${signal.id}`}
                  value={signal.description}
                  onChange={(e) =>
                    handleUpdate(signal.id, { description: e.target.value })
                  }
                  placeholder="Descreva o sinal…"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        {peopleSignals.length > 0 && (
          <Button
            onClick={handleAdd}
            variant="outline"
            size="sm"
            className="w-full gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar mais um sinal
          </Button>
        )}
      </div>
    </WizardStepScaffold>
  );
}
