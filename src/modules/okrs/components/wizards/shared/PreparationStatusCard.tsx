/**
 * PreparationStatusCard — Componente unificado de status de preparação
 *
 * Aparece no Step 1 de TODO rito principal que tem preparatórios alimentando-o.
 * Mostra status de participação (não conteúdo) de forma transparente.
 *
 * MODOS:
 *  - 'antessala'      → Pré-Weekly: lista as fontes do próprio líder antes de destilar
 *  - 'compact'        → Check-in do Time: 1 fonte (próprio líder fez Pré-Check-in)
 *  - 'list'           → Weekly / MBR: lista de N preparadores homogêneos
 *  - 'sectioned'      → QBR: dois grupos (Líderes + C-Level)
 *  - 'source-ritual'  → Pós-QBR: variante que mostra estado do rito-fonte
 *
 * SSOT:
 *  - Estados em PREPARATION_PARTICIPANT_STATES
 *  - Cores via tokens semânticos (success/warning/destructive/muted)
 *  - Sem cor hardcoded; sem RGB; tudo via index.css
 *
 * Princípio de transparência: nomes de pendentes são públicos (decisão consciente,
 * alinhada com filosofia do Next e padrão já estabelecido em RitualHistoryPage).
 */

import { ReactNode, useMemo } from 'react';
import { CheckCircle2, Clock, AlertCircle, MinusCircle, ExternalLink, Bell, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================================
// TYPES
// ============================================================

export type PreparationStatus =
  | 'completed'           // ✅ enviado dentro da janela
  | 'pending-in-window'   // ⏳ janela ainda aberta
  | 'pending-late'        // ❌ janela fechou, não enviou
  | 'not-applicable';     // ➖ dispensado (ex: time sem OKRs ativos)

export interface PreparationParticipant {
  /** ID estável do participante (profile_id ou contextual) */
  id: string;
  /** Nome para exibição pública (transparência saudável) */
  name: string;
  /** Contexto curto: time, área ou função (ex: "Produto", "CEO") */
  context?: string;
  status: PreparationStatus;
  /** Timestamp de conclusão (se completed) ou de fechamento da janela */
  timestamp?: string | Date | null;
  /** Resumo curto do que foi registrado no preparatório */
  summary?: string;
  /** Motivo da dispensa (quando status = not-applicable) */
  dispensedReason?: string;
  /** Janela ainda aberta até esta data (quando pending-in-window) */
  windowEndsAt?: string | Date | null;
}

export interface PreparationSection {
  /** Rótulo da seção (ex: "Líderes de Time", "C-Level") */
  label: string;
  participants: PreparationParticipant[];
  /** Texto auxiliar exibido sob o título da seção */
  description?: string;
}

export interface SourceRitualSummary {
  /** Nome do rito-fonte (ex: "QBR de 15 de abril") */
  label: string;
  /** Métricas consolidadas a destacar */
  highlights: Array<{ label: string; icon?: ReactNode }>;
  /** Callback para abrir snapshot completo */
  onOpenSnapshot?: () => void;
}

export type PreparationStatusMode =
  | 'antessala'
  | 'compact'
  | 'list'
  | 'sectioned'
  | 'source-ritual';

export interface PreparationStatusCardProps {
  mode: PreparationStatusMode;
  /** Título exibido no card (ex: "Suas fontes desta semana") */
  title?: string;
  /** Subtítulo/descrição curta */
  description?: string;

  // ── Dados conforme o modo ──
  /** Antessala / compact / list */
  participants?: PreparationParticipant[];
  /** Sectioned */
  sections?: PreparationSection[];
  /** Source-ritual */
  sourceRitual?: SourceRitualSummary;

  // ── Thresholds e gates ──
  /** Cobertura abaixo deste valor (0–1) marca o card como crítico */
  criticalThreshold?: number;
  /** Cobertura abaixo deste valor (0–1) e acima do critical marca como warning */
  warningThreshold?: number;
  /** Mostrar contador (ex: "5 de 6 concluíram") */
  showCounter?: boolean;

  // ── Ações ──
  /** Chamado quando o usuário clica em "Ver conteúdo" de um participante */
  onViewContent?: (participantId: string) => void;
  /** Chamado quando o usuário clica em "Enviar lembrete" de um pendente tardio */
  onSendReminder?: (participantId: string) => void;
  /** Chamado quando o usuário clica em "Fazer agora" (modo compact) */
  onFillNow?: () => void;

  className?: string;
}

// ============================================================
// CONSTANTS
// ============================================================

interface StatusVisual {
  Icon: typeof CheckCircle2;
  iconClassName: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  badgeClassName: string;
  label: string;
}

export const PREPARATION_PARTICIPANT_STATES: Record<PreparationStatus, StatusVisual> = {
  'completed': {
    Icon: CheckCircle2,
    iconClassName: 'text-success',
    badgeVariant: 'outline',
    badgeClassName: 'border-success/40 text-success bg-success/5',
    label: 'Concluído',
  },
  'pending-in-window': {
    Icon: Clock,
    iconClassName: 'text-muted-foreground',
    badgeVariant: 'outline',
    badgeClassName: 'border-muted-foreground/30 text-muted-foreground bg-muted/30',
    label: 'Janela aberta',
  },
  'pending-late': {
    Icon: AlertCircle,
    iconClassName: 'text-destructive',
    badgeVariant: 'outline',
    badgeClassName: 'border-destructive/40 text-destructive bg-destructive/5',
    label: 'Pendente',
  },
  'not-applicable': {
    Icon: MinusCircle,
    iconClassName: 'text-muted-foreground/60',
    badgeVariant: 'outline',
    badgeClassName: 'border-border text-muted-foreground/70 bg-transparent',
    label: 'Não se aplica',
  },
};

// ============================================================
// HELPERS
// ============================================================

function formatTimestamp(ts: string | Date | null | undefined): string | null {
  if (!ts) return null;
  try {
    const date = typeof ts === 'string' ? new Date(ts) : ts;
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  } catch {
    return null;
  }
}

function computeCoverage(participants: PreparationParticipant[]): {
  total: number;
  completed: number;
  pendingLate: number;
  notApplicable: number;
  rate: number;
  level: 'full' | 'partial' | 'critical';
} {
  const applicable = participants.filter(p => p.status !== 'not-applicable');
  const completed = applicable.filter(p => p.status === 'completed').length;
  const pendingLate = applicable.filter(p => p.status === 'pending-late').length;
  const notApplicable = participants.length - applicable.length;
  const rate = applicable.length === 0 ? 1 : completed / applicable.length;

  let level: 'full' | 'partial' | 'critical' = 'full';
  if (rate < 0.5) level = 'critical';
  else if (rate < 0.8) level = 'partial';

  return {
    total: applicable.length,
    completed,
    pendingLate,
    notApplicable,
    rate,
    level,
  };
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function ParticipantRow({
  participant,
  onViewContent,
  onSendReminder,
}: {
  participant: PreparationParticipant;
  onViewContent?: (id: string) => void;
  onSendReminder?: (id: string) => void;
}) {
  const visual = PREPARATION_PARTICIPANT_STATES[participant.status];
  const { Icon } = visual;
  const ts = formatTimestamp(participant.timestamp);
  const windowEnds = formatTimestamp(participant.windowEndsAt);

  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', visual.iconClassName)} aria-hidden />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium text-foreground truncate">{participant.name}</span>
          {participant.context && (
            <span className="text-xs text-muted-foreground">· {participant.context}</span>
          )}
          {ts && participant.status === 'completed' && (
            <span className="text-xs text-muted-foreground">· {ts}</span>
          )}
          {participant.status === 'pending-in-window' && windowEnds && (
            <span className="text-xs text-muted-foreground">· janela aberta {windowEnds}</span>
          )}
          {participant.status === 'pending-late' && ts && (
            <span className="text-xs text-destructive/80">· janela fechou {ts}</span>
          )}
          {participant.status === 'not-applicable' && participant.dispensedReason && (
            <span className="text-xs text-muted-foreground">· {participant.dispensedReason}</span>
          )}
        </div>
        {participant.summary && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{participant.summary}</p>
        )}
        <div className="flex gap-2 mt-1">
          {participant.status === 'completed' && onViewContent && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onViewContent(participant.id)}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Ver conteúdo
            </Button>
          )}
          {participant.status === 'pending-late' && onSendReminder && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onSendReminder(participant.id)}
            >
              <Bell className="h-3 w-3 mr-1" />
              Enviar lembrete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function CoverageHeader({
  total,
  completed,
  level,
  showCounter,
  title,
  description,
}: {
  total: number;
  completed: number;
  level: 'full' | 'partial' | 'critical';
  showCounter: boolean;
  title?: string;
  description?: string;
}) {
  const levelLabel: Record<typeof level, string> = {
    full: 'Cobertura completa',
    partial: 'Cobertura parcial',
    critical: 'Cobertura crítica',
  };
  const levelBadge: Record<typeof level, string> = {
    full: 'border-success/40 text-success bg-success/5',
    partial: 'border-warning/40 text-warning bg-warning/5',
    critical: 'border-destructive/40 text-destructive bg-destructive/5',
  };

  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {showCounter && total > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">
            {completed} de {total} concluídos
          </span>
          <Badge variant="outline" className={cn('text-xs', levelBadge[level])}>
            {levelLabel[level]}
          </Badge>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function PreparationStatusCard({
  mode,
  title,
  description,
  participants = [],
  sections = [],
  sourceRitual,
  criticalThreshold = 0.5,
  warningThreshold = 0.8,
  showCounter = true,
  onViewContent,
  onSendReminder,
  onFillNow,
  className,
}: PreparationStatusCardProps) {
  // Hooks SEMPRE no topo (antes de qualquer early return)
  const coverage = useMemo(() => computeCoverage(participants), [participants]);
  const isAntessala = mode === 'antessala';
  const grouped = useMemo(() => {
    if (isAntessala) return null;
    return {
      completed: participants.filter(p => p.status === 'completed'),
      pending: participants.filter(p =>
        p.status === 'pending-in-window' || p.status === 'pending-late'
      ),
      notApplicable: participants.filter(p => p.status === 'not-applicable'),
    };
  }, [isAntessala, participants]);

  // ── source-ritual variant ──
  if (mode === 'source-ritual' && sourceRitual) {
    return (
      <Card className={cn('p-4 space-y-3', className)}>
        <div className="flex items-start justify-between gap-2">
          <div>
            {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
            <p className="text-xs text-muted-foreground mt-0.5">Fonte: {sourceRitual.label}</p>
          </div>
          {sourceRitual.onOpenSnapshot && (
            <Button variant="ghost" size="sm" onClick={sourceRitual.onOpenSnapshot}>
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Ver snapshot
            </Button>
          )}
        </div>
        <Separator />
        <ul className="space-y-1.5">
          {sourceRitual.highlights.map((h, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-foreground">
              {h.icon ?? <CheckCircle2 className="h-4 w-4 text-success shrink-0" aria-hidden />}
              <span>{h.label}</span>
            </li>
          ))}
        </ul>
      </Card>
    );
  }



  // ── compact mode (1 participante) ──
  if (mode === 'compact' && participants.length === 1) {
    const p = participants[0];
    const visual = PREPARATION_PARTICIPANT_STATES[p.status];
    const { Icon } = visual;
    const ts = formatTimestamp(p.timestamp);

    return (
      <Card className={cn('p-3 flex items-center gap-3', className)}>
        <Icon className={cn('h-5 w-5 shrink-0', visual.iconClassName)} aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">
            {title ?? p.name}
            {ts && p.status === 'completed' && (
              <span className="text-muted-foreground"> · {ts}</span>
            )}
          </p>
          {p.summary && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.summary}</p>
          )}
        </div>
        {p.status !== 'completed' && onFillNow && (
          <Button size="sm" variant="outline" onClick={onFillNow}>
            Fazer agora
          </Button>
        )}
        {p.status === 'completed' && onViewContent && (
          <Button size="sm" variant="ghost" onClick={() => onViewContent(p.id)}>
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        )}
      </Card>
    );
  }

  // ── sectioned mode ──
  if (mode === 'sectioned') {
    const allParticipants = sections.flatMap(s => s.participants);
    const coverage = computeCoverage(allParticipants);

    return (
      <Card className={cn('p-4 space-y-4', className)}>
        <CoverageHeader
          total={coverage.total}
          completed={coverage.completed}
          level={coverage.level}
          showCounter={showCounter}
          title={title}
          description={description}
        />
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-baseline justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {section.label}
              </h4>
              {section.description && (
                <span className="text-xs text-muted-foreground">{section.description}</span>
              )}
            </div>
            <Separator />
            <div className="divide-y divide-border/50">
              {section.participants.map(p => (
                <ParticipantRow
                  key={p.id}
                  participant={p}
                  onViewContent={onViewContent}
                  onSendReminder={onSendReminder}
                />
              ))}
            </div>
          </div>
        ))}
      </Card>
    );
  }

  // ── list / antessala mode ──
  const isCritical = coverage.rate < criticalThreshold && coverage.total > 0;
  const isWarning = !isCritical && coverage.rate < warningThreshold && coverage.total > 0;

  return (
    <Card className={cn('p-4 space-y-3', className)}>
      <CoverageHeader
        total={coverage.total}
        completed={coverage.completed}
        level={coverage.level}
        showCounter={showCounter && !isAntessala}
        title={title}
        description={description}
      />

      {isCritical && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          ⚠️ Apenas {coverage.completed} de {coverage.total} prepararam.
          A curadoria executiva ficará parcial. Considere adiar ou prosseguir com ressalva.
        </div>
      )}
      {isWarning && (
        <div className="rounded-md border border-warning/40 bg-warning/5 p-3 text-xs text-warning-foreground">
          Cobertura abaixo do ideal ({coverage.completed} de {coverage.total}).
          O agente sinalizará confiança reduzida.
        </div>
      )}

      {/* Antessala: lista linear, sem agrupamento, com gate flexível */}
      {isAntessala && (
        <div className="divide-y divide-border/50">
          {participants.map(p => (
            <ParticipantRow
              key={p.id}
              participant={p}
              onViewContent={onViewContent}
              onSendReminder={onSendReminder}
            />
          ))}
        </div>
      )}

      {/* Lista completa: agrupada por estado */}
      {!isAntessala && grouped && (
        <div className="space-y-3">
          {grouped.completed.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-success mb-1">
                Concluídos ({grouped.completed.length})
              </h4>
              <div className="divide-y divide-border/50">
                {grouped.completed.map(p => (
                  <ParticipantRow
                    key={p.id}
                    participant={p}
                    onViewContent={onViewContent}
                    onSendReminder={onSendReminder}
                  />
                ))}
              </div>
            </section>
          )}
          {grouped.pending.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-destructive mb-1">
                Não concluíram ({grouped.pending.length})
              </h4>
              <div className="divide-y divide-border/50">
                {grouped.pending.map(p => (
                  <ParticipantRow
                    key={p.id}
                    participant={p}
                    onViewContent={onViewContent}
                    onSendReminder={onSendReminder}
                  />
                ))}
              </div>
            </section>
          )}
          {grouped.notApplicable.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Não se aplica ({grouped.notApplicable.length})
              </h4>
              <div className="divide-y divide-border/50">
                {grouped.notApplicable.map(p => (
                  <ParticipantRow key={p.id} participant={p} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </Card>
  );
}
