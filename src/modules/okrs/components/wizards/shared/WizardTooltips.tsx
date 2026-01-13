/**
 * WizardTooltips - Tooltips contextuais para wizards de OKRs
 * 
 * Padrão:
 * - Curtos e objetivos
 * - Explicam o "porquê", não só o "quê"
 * - Nunca obrigatórios
 */

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle, Info, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// TOOLTIP DEFINITIONS
// ============================================================

export const WIZARD_TOOLTIPS = {
  // ============================================================
  // CRIAÇÃO DE OKRs - Contexto
  // ============================================================
  'context-intro': {
    content: 'Você não começa do zero. Todo OKR nasce de um contexto.',
    icon: 'info',
  },
  'org-objectives': {
    content: 'OKRs organizacionais definem a direção estratégica. Seus OKRs devem contribuir para esses resultados.',
    icon: 'info',
  },
  'strategic-kpis': {
    content: 'KPIs mostram onde a BU está hoje. Use-os para calibrar suas metas.',
    icon: 'info',
  },
  
  // ============================================================
  // RETROSPECTIVA
  // ============================================================
  'retrospective-intro': {
    content: 'Aprender com o passado ajuda a definir metas mais realistas.',
    icon: 'lightbulb',
  },
  'abandoned-krs': {
    content: 'KRs abandonadas podem indicar sobrecarga ou falta de alinhamento.',
    icon: 'help',
  },
  'past-success': {
    content: 'O que funcionou no passado pode indicar padrões a replicar.',
    icon: 'lightbulb',
  },
  
  // ============================================================
  // OBJETIVO
  // ============================================================
  'objective-definition': {
    content: 'Objetivo não descreve tarefa. Descreve mudança.',
    icon: 'info',
  },
  'objective-inspirational': {
    content: 'Um bom objetivo motiva o time a ir além do básico.',
    icon: 'lightbulb',
  },
  'objective-ownership': {
    content: 'Todo objetivo precisa de um time responsável.',
    icon: 'help',
  },
  
  // ============================================================
  // OKRs COMPARTILHADOS
  // ============================================================
  'shared-okr': {
    content: 'Mais de um time é responsável por este resultado.',
    icon: 'info',
  },
  'responsibility-model': {
    content: 'Escolha quem lidera e quem contribui para evitar dispersão de responsabilidade.',
    icon: 'help',
  },
  'shared-ownership': {
    content: 'Se der errado, quem decide? Defina isso antes de começar.',
    icon: 'lightbulb',
  },
  
  // ============================================================
  // TIPOS DE KR (OBRIGATÓRIOS)
  // ============================================================
  'kr-foundational': {
    content: 'Prova se o objetivo realmente aconteceu.',
    icon: 'info',
  },
  'kr-contribution': {
    content: 'Resultado do seu time que ajuda um objetivo maior.',
    icon: 'info',
  },
  'kr-enabler': {
    content: 'Entrega necessária, mas que sozinha não prova sucesso.',
    icon: 'info',
  },
  'kr-limit': {
    content: 'Times com até 3 KRs têm maior foco. Mais que isso pode dispersar energia.',
    icon: 'lightbulb',
  },
  
  // ============================================================
  // DETALHAMENTO DE KR
  // ============================================================
  'kr-baseline': {
    content: 'Baseline é o ponto de partida. De onde você está saindo?',
    icon: 'help',
  },
  'kr-target': {
    content: 'Meta deve ser ambiciosa mas alcançável. Nem fácil demais, nem impossível.',
    icon: 'info',
  },
  'kr-owner': {
    content: 'Responsável é quem acompanha e atualiza, não quem faz tudo sozinho.',
    icon: 'help',
  },
  'kr-metric': {
    content: 'Escolha uma métrica que o time consegue medir com frequência.',
    icon: 'info',
  },
  
  // ============================================================
  // DEPENDÊNCIAS
  // ============================================================
  'dependencies-intro': {
    content: 'Dependências não são ruins, mas precisam ser gerenciadas.',
    icon: 'info',
  },
  'dependency-action': {
    content: 'Decidir agora evita surpresas no meio do ciclo.',
    icon: 'lightbulb',
  },
  
  // ============================================================
  // INICIATIVAS
  // ============================================================
  'initiatives-intro': {
    content: 'Iniciativas ajudam o KR, mas não substituem resultado.',
    icon: 'info',
  },
  'initiatives-mutability': {
    content: 'Iniciativas podem mudar durante o ciclo. KRs, não.',
    icon: 'help',
  },
  'initiatives-optional': {
    content: 'Iniciativas não são obrigatórias. Crie apenas quando o caminho não for óbvio.',
    icon: 'lightbulb',
  },
  
  // ============================================================
  // COMUNICAÇÃO
  // ============================================================
  'share-intro': {
    content: 'Compartilhar OKRs cria alinhamento e compromisso.',
    icon: 'info',
  },
  
  // ============================================================
  // CHECK-IN COLABORADOR
  // ============================================================
  'checkin-value': {
    content: 'Atualize com o valor mais recente. Seja honesto.',
    icon: 'info',
  },
  'checkin-confidence': {
    content: 'Sinaliza risco, não falha. Não tem resposta errada.',
    icon: 'help',
  },
  'checkin-confidence-low': {
    content: 'Confiança baixa sinaliza risco, não falha.',
    icon: 'help',
  },
  'checkin-blocker': {
    content: 'Registrar bloqueadores ajuda seu líder a te apoiar.',
    icon: 'lightbulb',
  },
  'checkin-ritual': {
    content: 'Atualização fora da janela recomendada. Sem bloqueio.',
    icon: 'info',
  },
  'checkin-comment': {
    content: '1-2 frases são suficientes. Foque no essencial.',
    icon: 'lightbulb',
  },
  
  // ============================================================
  // PREPARAÇÃO DO LÍDER
  // ============================================================
  'leader-overview': {
    content: 'Visão geral mostra a saúde do time antes da reunião.',
    icon: 'info',
  },
  'leader-highlights': {
    content: 'Destaques mostram onde focar a conversa.',
    icon: 'lightbulb',
  },
  'leader-prep': {
    content: 'Marcar KRs para discussão ajuda a priorizar a reunião.',
    icon: 'info',
  },
  'leader-notes': {
    content: 'Notas pré-reunião ajudam a guiar a discussão.',
    icon: 'lightbulb',
  },
  
  // ============================================================
  // CHECK-IN DE TIME
  // ============================================================
  'team-review': {
    content: 'Revisar juntos cria alinhamento e responsabilidade compartilhada.',
    icon: 'info',
  },
  'team-decisions': {
    content: 'Decisões registradas viram compromissos do time.',
    icon: 'lightbulb',
  },
  'team-checklist': {
    content: 'Sabemos no que focar? No que NÃO fazer? Quem é responsável?',
    icon: 'help',
  },
  
  // ============================================================
  // CHECK-IN DE GESTORES
  // ============================================================
  'managers-panorama': {
    content: 'Panorama mostra como as áreas estão performando.',
    icon: 'info',
  },
  'managers-cross-issues': {
    content: 'Dependências entre áreas precisam de alinhamento no nível de gestão.',
    icon: 'help',
  },
  'managers-adjustments': {
    content: 'Ajustes devem ser comunicados para todos os afetados.',
    icon: 'lightbulb',
  },
  
  // ============================================================
  // CHECK-IN C-LEVEL
  // ============================================================
  'clevel-company-okrs': {
    content: 'OKRs organizacionais refletem a direção estratégica da empresa.',
    icon: 'info',
  },
  'clevel-insights': {
    content: 'Insights estratégicos ajudam a calibrar a direção da empresa.',
    icon: 'info',
  },
  'clevel-decisions': {
    content: 'Decisões executivas registradas viram compromissos da liderança.',
    icon: 'lightbulb',
  },
  'clevel-directives': {
    content: 'Diretrizes são mensagens que cascateiam para toda a organização.',
    icon: 'lightbulb',
  },
} as const;

export type WizardTooltipKey = keyof typeof WIZARD_TOOLTIPS;

// ============================================================
// COMPONENTS
// ============================================================

interface WizardTooltipProps {
  tooltipKey: WizardTooltipKey;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  iconSize?: 'sm' | 'md';
}

export function WizardTooltip({
  tooltipKey,
  side = 'top',
  className,
  iconSize = 'sm',
}: WizardTooltipProps) {
  const tooltip = WIZARD_TOOLTIPS[tooltipKey];
  
  const IconComponent = tooltip.icon === 'help' 
    ? HelpCircle 
    : tooltip.icon === 'lightbulb' 
      ? Lightbulb 
      : Info;

  const sizeClass = iconSize === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center justify-center rounded-full p-0.5',
            'text-muted-foreground/60 hover:text-muted-foreground transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
            className
          )}
          aria-label="Mais informações"
        >
          <IconComponent className={sizeClass} />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-[250px]">
        <p className="text-sm">{tooltip.content}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Tooltip inline para usar junto a labels
 */
export function WizardTooltipInline({
  tooltipKey,
  className,
}: Pick<WizardTooltipProps, 'tooltipKey' | 'className'>) {
  return (
    <WizardTooltip
      tooltipKey={tooltipKey}
      className={cn('ml-1 align-middle', className)}
      iconSize="sm"
    />
  );
}

/**
 * Card de dica para seções maiores
 */
interface WizardTipCardProps {
  content: string;
  variant?: 'default' | 'highlight' | 'warning';
  className?: string;
}

export function WizardTipCard({
  content,
  variant = 'default',
  className,
}: WizardTipCardProps) {
  return (
    <div
      className={cn(
        'p-3 rounded-lg text-sm flex items-start gap-2',
        variant === 'default' && 'bg-muted/50 text-muted-foreground',
        variant === 'highlight' && 'bg-primary/5 border-l-4 border-primary text-foreground',
        variant === 'warning' && 'bg-status-yellow-muted text-status-yellow-muted-foreground',
        className
      )}
    >
      <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
      <p>{content}</p>
    </div>
  );
}
