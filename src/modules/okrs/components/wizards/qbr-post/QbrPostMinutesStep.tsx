/**
 * QbrPostMinutesStep - Step 5: Ata executiva e encerramento
 * 
 * Resumo automático (dados estruturados) + carta de contexto do CEO +
 * campo de texto para ata + checklist dinâmico de governança.
 * Transiciona qbr_status → 'done'.
 */

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { FileText, ShieldCheck, ChevronDown, ChevronUp, Target, ListChecks, ArrowRight, AlertTriangle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  WizardStepHeader,
  WizardLastStepFooter,
  WizardStepScaffold,
} from '../shared';
import type { QbrPostGovernanceChecklist } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface QbrPostMinutesSummaryData {
  promotedOkrs: Array<{ teamName: string; objectiveTitle: string; krCount: number }>;
  decisions: Array<{ text: string; ownerName?: string; deadline?: string }>;
  crossCommitments: Array<{ fromTeamName: string; toTeamName: string; description: string; deadline: string }>;
  teamsWithoutPromotion: string[];
}

export interface QbrPostMinutesStepProps {
  executiveMinutes: string;
  onExecutiveMinutesChange: (minutes: string) => void;
  checklist: QbrPostGovernanceChecklist;
  onChecklistChange: (checklist: QbrPostGovernanceChecklist) => void;
  summaryData?: QbrPostMinutesSummaryData;
  /** Se há pelo menos 1 OKR promovido no Step 1 */
  hasPromotedOkrs?: boolean;
  /** Carta de contexto do CEO */
  ceoContextMessage?: string;
  onCeoContextMessageChange?: (message: string) => void;
  isCompleting?: boolean;
  onComplete: () => void;
  onBack: () => void;
}

// ============================================================
// CHECKLIST ITEMS
// ============================================================

interface ChecklistItemConfig {
  key: keyof QbrPostGovernanceChecklist;
  label: string;
  dynamicDisable?: boolean;
  disabledTooltip?: string;
}

// ============================================================
// AUTO SUMMARY
// ============================================================

function AutoSummary({ data }: { data: QbrPostMinutesSummaryData }) {
  const [open, setOpen] = useState(true);
  const hasContent = data.promotedOkrs.length > 0 || data.decisions.length > 0 || data.crossCommitments.length > 0;

  if (!hasContent && data.teamsWithoutPromotion.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-dashed">
        <CardContent className="p-4 space-y-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent">
              <span className="text-sm font-medium flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                Resumo do QBR (dados consolidados)
              </span>
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-4 pt-2">
            {/* Promoted OKRs */}
            {data.promotedOkrs.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Target className="h-3 w-3" /> OKRs Promovidos
                </p>
                <div className="space-y-0.5">
                  {data.promotedOkrs.map((okr, i) => (
                    <div key={i} className="text-xs flex items-baseline gap-1.5">
                      <span className="font-medium shrink-0">{okr.teamName}:</span>
                      <span className="text-muted-foreground truncate">{okr.objectiveTitle}</span>
                      <span className="text-muted-foreground shrink-0">({okr.krCount} KRs)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Decisions */}
            {data.decisions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Decisões</p>
                <div className="space-y-0.5">
                  {data.decisions.map((d, i) => (
                    <div key={i} className="text-xs text-muted-foreground">
                      • {d.text}
                      {d.ownerName && <span className="font-medium"> — {d.ownerName}</span>}
                      {d.deadline && <span> (até {new Date(d.deadline).toLocaleDateString('pt-BR')})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cross commitments */}
            {data.crossCommitments.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Compromissos Cross-área</p>
                <div className="space-y-0.5">
                  {data.crossCommitments.map((c, i) => (
                    <div key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="font-medium">{c.fromTeamName}</span>
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      <span className="font-medium">{c.toTeamName}</span>
                      <span className="truncate">— {c.description}</span>
                      <span className="shrink-0">(até {new Date(c.deadline).toLocaleDateString('pt-BR')})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Teams without promotion */}
            {data.teamsWithoutPromotion.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Times sem OKR promovido
                </p>
                <p className="text-xs text-muted-foreground">{data.teamsWithoutPromotion.join(', ')}</p>
              </div>
            )}
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  );
}

// ============================================================
// COMPONENT
// ============================================================

export function QbrPostMinutesStep({
  executiveMinutes,
  onExecutiveMinutesChange,
  checklist,
  onChecklistChange,
  summaryData,
  hasPromotedOkrs = false,
  ceoContextMessage,
  onCeoContextMessageChange,
  isCompleting,
  onComplete,
  onBack,
}: QbrPostMinutesStepProps) {
  const checklistItems: ChecklistItemConfig[] = [
    { key: 'strategicFocusClear', label: 'O foco estratégico do próximo ciclo está claro para todos?' },
    { key: 'decisionsHaveOwners', label: 'Todas as decisões têm dono e prazo definidos?' },
    { key: 'dependenciesFormalized', label: 'Dependências entre times estão formalizadas?' },
    {
      key: 'nextCycleOkrsActive',
      label: 'OKRs do próximo ciclo foram promovidos e estão ativos?',
      dynamicDisable: !hasPromotedOkrs,
      disabledTooltip: 'Promova pelo menos um OKR no Step 1 para habilitar este item.',
    },
  ];

  // For "complete" button: all non-disabled items must be checked
  const allRequiredChecked = checklistItems.every(item => {
    if (item.dynamicDisable) return true; // disabled items don't block
    return checklist[item.key];
  });

  const handleToggle = (key: keyof QbrPostGovernanceChecklist) => {
    onChecklistChange({ ...checklist, [key]: !checklist[key] });
  };

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={FileText}
          title="Ata executiva e encerramento"
          tooltip="qbr-post-minutes"
          description="Formalize o que foi decidido. Ao concluir, os OKRs são ativados e os times são notificados."
          variant="green"
        />
      }
      footer={
        <WizardLastStepFooter
          onBack={onBack}
          onPrimary={onComplete}
          primaryDisabled={!allRequiredChecked || !executiveMinutes.trim()}
          primaryLoading={isCompleting}
        />
      }
    >
      <div className="p-6 space-y-6">
        {/* Auto summary */}
        {summaryData && <AutoSummary data={summaryData} />}

        {/* CEO context message */}
        {onCeoContextMessageChange && (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Carta de contexto — opcional
            </Label>
            <p className="text-xs text-muted-foreground">
              Esta mensagem será enviada para todos os times junto com a notificação de OKRs ativos. 
              É a oportunidade de dar contexto estratégico ao que foi decidido.
            </p>
            <Textarea
              value={ceoContextMessage || ''}
              onChange={(e) => onCeoContextMessageChange(e.target.value)}
              placeholder="Por que escolhemos estes OKRs para o próximo quarter?
O que o quarter que encerrou nos ensinou?"
              className="min-h-[100px] text-sm"
            />
          </div>
        )}

        {/* Executive minutes */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Ata Executiva
          </Label>
          <p className="text-xs text-muted-foreground">
            Síntese das decisões, compromissos e direcionamentos aprovados no QBR.
          </p>
          <Textarea
            value={executiveMinutes}
            onChange={(e) => onExecutiveMinutesChange(e.target.value)}
            placeholder="Resumo executivo do QBR...

• Decisões-chave tomadas
• OKRs aprovados e ajustados
• Compromissos cross-área formalizados
• Próximos passos e cadência de acompanhamento"
            className="min-h-[200px] text-sm"
          />
        </div>

        {/* Governance checklist */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Checklist de Governança</span>
            </div>
            <TooltipProvider>
              {checklistItems.map(item => {
                const isDisabled = !!item.dynamicDisable;
                const checkboxEl = (
                  <div key={item.key} className={cn('flex items-center gap-3', isDisabled && 'opacity-50')}>
                    <Checkbox
                      id={item.key}
                      checked={checklist[item.key]}
                      onCheckedChange={() => handleToggle(item.key)}
                      disabled={isDisabled}
                    />
                    <Label htmlFor={item.key} className={cn('text-sm flex-1', isDisabled ? 'cursor-not-allowed' : 'cursor-pointer')}>
                      {item.label}
                    </Label>
                  </div>
                );

                if (isDisabled && item.disabledTooltip) {
                  return (
                    <Tooltip key={item.key}>
                      <TooltipTrigger asChild>
                        {checkboxEl}
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">{item.disabledTooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return checkboxEl;
              })}
            </TooltipProvider>
          </CardContent>
        </Card>
      </div>
    </WizardStepScaffold>
  );
}
