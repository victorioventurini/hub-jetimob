/**
 * ReflectionStep — Step de Reflexão configurável por `questionSet`.
 *
 * Conjuntos suportados (espelham `ReflectionStepConfig.questionSet`):
 * - collaborator         → check-in semanal (impacto / ajuda)
 * - collaborator-final   → fechamento de ciclo do colaborador
 * - leader               → preparação do líder (time / cross)
 * - initiative           → reflexão sobre iniciativa específica
 * - strategic            → reflexão estratégica (QBR pré C-Level)
 *
 * Cada pergunta grava em uma chave estável de `data` (free-form), permitindo
 * que sessões antigas continuem deserializando — novas chaves são opcionais
 * e absorvidas via spread.
 */

import { memo, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { WizardStepScaffold } from '../../WizardStepScaffold';
import { WizardStepHeader } from '../../WizardStepHeader';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { getStepLabel, type StructureVersion } from '@/modules/okrs/constants/ritualLabels';
import type { WizardPersona, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import type { ReflectionStepConfig } from '../types';
import { InlineDecisionsSlot } from './_InlineDecisionsSlot';

/**
 * Shape aberto: cada questionSet usa um subconjunto de chaves. Mantemos
 * um único tipo para preservar compatibilidade com sessões antigas.
 */
export interface ReflectionStepData {
  // collaborator
  impactSummary?: string;
  helpNeeded?: string;
  // collaborator-final
  cycleHighlights?: string;
  cycleLearnings?: string;
  // leader
  teamPulse?: string;
  crossDependencies?: string;
  // initiative
  initiativeProgress?: string;
  initiativeRisks?: string;
  // strategic
  strategicBets?: string;
  strategicRisks?: string;
  /** Permite chaves desconhecidas oriundas de versões antigas */
  [key: string]: string | undefined;
}

interface QuestionDef {
  key: keyof ReflectionStepData;
  label: string;
  placeholder?: string;
  rows?: number;
}

const QUESTION_SETS: Record<ReflectionStepConfig['questionSet'], QuestionDef[]> = {
  collaborator: [
    {
      key: 'impactSummary',
      label: 'Qual foi o seu maior impacto na semana?',
      placeholder: 'Entregas, decisões ou avanços que se destacaram...',
    },
    {
      key: 'helpNeeded',
      label: 'Onde você precisa de ajuda?',
      placeholder: 'Bloqueios, dependências ou apoio necessário...',
    },
  ],
  'collaborator-final': [
    {
      key: 'cycleHighlights',
      label: 'O que mais te orgulha neste ciclo?',
      placeholder: 'Conquistas pessoais, técnicas ou de time...',
      rows: 4,
    },
    {
      key: 'cycleLearnings',
      label: 'Quais foram seus principais aprendizados?',
      placeholder: 'O que você faria diferente; o que vai levar adiante...',
      rows: 4,
    },
  ],
  leader: [
    {
      key: 'teamPulse',
      label: 'Como está o pulso do time?',
      placeholder: 'Energia, foco, riscos humanos, dinâmica geral...',
    },
    {
      key: 'crossDependencies',
      label: 'Quais dependências cross-time precisam de atenção?',
      placeholder: 'Áreas, pessoas ou rituais que precisam ser acionados...',
    },
  ],
  initiative: [
    {
      key: 'initiativeProgress',
      label: 'Como evoluiu esta iniciativa?',
      placeholder: 'Marcos atingidos, aprendizados, mudanças de escopo...',
      rows: 4,
    },
    {
      key: 'initiativeRisks',
      label: 'Quais são os principais riscos ou pontos de atenção?',
      placeholder: 'O que pode comprometer a entrega ou exige decisão...',
    },
  ],
  strategic: [
    {
      key: 'strategicBets',
      label: 'Quais apostas estratégicas precisam de validação no QBR?',
      placeholder: 'Movimentos que mudam o jogo do trimestre seguinte...',
      rows: 5,
    },
    {
      key: 'strategicRisks',
      label: 'Quais riscos estratégicos exigem decisão executiva?',
      placeholder: 'Sinais de mercado, competição, execução, capital...',
      rows: 4,
    },
  ],
};

export interface ReflectionStepProps {
  persona: WizardPersona;
  version: StructureVersion;
  stepId: string;
  config: ReflectionStepConfig;
  data: ReflectionStepData;
  onDataChange: (next: ReflectionStepData) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (next: TeamCheckinDecision[]) => void;
  footer: React.ReactNode;
  suppressInlineDecisions?: boolean;
}

export const ReflectionStep = memo(function ReflectionStep({
  persona,
  version,
  stepId,
  config,
  data,
  onDataChange,
  decisions,
  onDecisionsChange,
  footer,
  suppressInlineDecisions,
}: ReflectionStepProps) {
  const label = getStepLabel(persona, stepId, version);
  const questions = QUESTION_SETS[config.questionSet] ?? QUESTION_SETS.collaborator;

  const updateField = useCallback(
    (key: keyof ReflectionStepData, value: string) => {
      onDataChange({ ...data, [key]: value });
    },
    [data, onDataChange],
  );

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Sparkles}
          title={label.title}
          description={label.subtitle}
          variant="purple"
        />
      }
      bottomFixed={
        suppressInlineDecisions ? undefined : (
          <InlineDecisionsSlot
            stepId={stepId}
            decisions={decisions}
            onDecisionsChange={onDecisionsChange}
          />
        )
      }
      footer={footer}
    >
      <div className="p-4 md:p-6 space-y-5">
        {questions.map((q) => {
          const id = `reflection-${stepId}-${String(q.key)}`;
          const value = (data[q.key] as string | undefined) ?? '';
          return (
            <div key={String(q.key)} className="space-y-2">
              <Label htmlFor={id}>{q.label}</Label>
              <Textarea
                id={id}
                value={value}
                onChange={(e) => updateField(q.key, e.target.value)}
                placeholder={q.placeholder}
                className="min-h-[100px]"
                rows={q.rows}
              />
            </div>
          );
        })}
      </div>
    </WizardStepScaffold>
  );
});
