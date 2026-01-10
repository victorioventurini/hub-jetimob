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
  // Criação de OKRs - Contexto
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
  
  // Retrospectiva
  'retrospective-intro': {
    content: 'Aprender com o passado ajuda a definir metas mais realistas.',
    icon: 'lightbulb',
  },
  'abandoned-krs': {
    content: 'KRs abandonados podem indicar sobrecarga ou falta de alinhamento.',
    icon: 'help',
  },
  
  // Objetivo
  'objective-definition': {
    content: 'Objetivo não descreve tarefa. Descreve mudança.',
    icon: 'info',
  },
  'objective-inspirational': {
    content: 'Um bom objetivo motiva o time a ir além do básico.',
    icon: 'lightbulb',
  },
  
  // OKRs Compartilhados
  'shared-okr': {
    content: 'OKRs compartilhados envolvem mais de um time trabalhando juntos pelo mesmo resultado.',
    icon: 'info',
  },
  'responsibility-model': {
    content: 'Escolha quem lidera e quem contribui para evitar dispersão de responsabilidade.',
    icon: 'help',
  },
  
  // Tipos de KR
  'kr-foundational': {
    content: 'KR Fundacional: Prova que o objetivo aconteceu. É o resultado principal.',
    icon: 'info',
  },
  'kr-contribution': {
    content: 'KR Contribuição: Resultado do time que alimenta um objetivo maior.',
    icon: 'info',
  },
  'kr-enabler': {
    content: 'KR Habilitador: Entrega necessária para viabilizar os outros resultados.',
    icon: 'info',
  },
  'kr-limit': {
    content: 'Times com até 3 KRs têm maior foco. Mais que isso pode dispersar energia.',
    icon: 'lightbulb',
  },
  
  // Detalhamento de KR
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
  
  // Dependências
  'dependencies-intro': {
    content: 'Dependências não são ruíns, mas precisam ser gerenciadas.',
    icon: 'info',
  },
  'dependency-action': {
    content: 'Decidir agora evita surpresas no meio do ciclo.',
    icon: 'lightbulb',
  },
  
  // Iniciativas
  'initiatives-intro': {
    content: 'Iniciativas ajudam o KR, mas não substituem resultado.',
    icon: 'info',
  },
  'initiatives-mutability': {
    content: 'Iniciativas podem mudar durante o ciclo. KRs, não.',
    icon: 'help',
  },
  
  // Comunicação
  'share-intro': {
    content: 'Compartilhar OKRs cria alinhamento e compromisso.',
    icon: 'info',
  },
  
  // Check-in Colaborador
  'checkin-value': {
    content: 'Atualize com o valor mais recente. Seja honesto.',
    icon: 'info',
  },
  'checkin-confidence': {
    content: 'Confiança mostra sua percepção de risco. Não tem resposta errada.',
    icon: 'help',
  },
  'checkin-blocker': {
    content: 'Registrar bloqueadores ajuda seu líder a te apoiar.',
    icon: 'lightbulb',
  },
  
  // Preparação do Líder
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
  
  // Check-in de Time
  'team-review': {
    content: 'Revisar juntos cria alinhamento e responsabilidade compartilhada.',
    icon: 'info',
  },
  'team-decisions': {
    content: 'Decisões registradas viram compromissos do time.',
    icon: 'lightbulb',
  },
  
  // Check-in de Gestores
  'managers-panorama': {
    content: 'Panorama mostra como as áreas estão performando em relação às metas.',
    icon: 'info',
  },
  'managers-cross-issues': {
    content: 'Dependências entre áreas precisam de alinhamento no nível de gestão.',
    icon: 'help',
  },
  
  // Check-in C-Level
  'clevel-insights': {
    content: 'Insights estratégicos ajudam a calibrar a direção da empresa.',
    icon: 'info',
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
        variant === 'warning' && 'bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400',
        className
      )}
    >
      <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
      <p>{content}</p>
    </div>
  );
}
