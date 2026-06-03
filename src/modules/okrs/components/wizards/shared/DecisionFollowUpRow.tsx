/**
 * DecisionFollowUpRow - Componente compartilhado para acompanhamento de decisões/registros.
 * 
 * Exibe:
 * - Checkbox de resolução (com permissão via useCanResolveDecision)
 * - Thread de mensagens de acompanhamento
 * - Modal obrigatório para resolução
 * - Detalhes de resolução quando concluído
 * 
 * Reutilizado em: RitualHistoryPage, CollaboratorDecisionsStep, e futuros contextos.
 */

import { useState } from 'react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, Clock, Lightbulb, Target, CheckCircle2, Send, Pencil, CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { BuUserSelect } from '@/components/selects';
import { cn } from '@/lib/utils';
import { useIdentity } from '@/hooks/useIdentity';
import { usePermissions } from '@/hooks/usePermissions';
import { useCanResolveDecision } from '@/modules/okrs/hooks';
import { useResolveParticipant } from '@/hooks/useResolveParticipant';
import type { TeamCheckinDecision, DecisionThreadMessage } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface DecisionFollowUpRowProps {
  decision: TeamCheckinDecision & { followUpStatus?: string };
  sessionId: string;
  /** Mutation callback for updating decision */
  onUpdate: (params: {
    sessionId: string;
    decisionId: string;
    updates: Partial<TeamCheckinDecision> & { followUpStatus?: 'pending' | 'done' };
  }) => void;
  isPending?: boolean;
  /** Callback for adding a thread message */
  onAddMessage?: (params: {
    sessionId: string;
    decisionId: string;
    content: string;
  }) => void;
  isAddingMessage?: boolean;
  /** Hide thread UI (e.g. in compact views) */
  hideThread?: boolean;
  /** Profile id of the user who conducted the ritual (allowed to edit owner/deadline) */
  conductorProfileId?: string | null;
  /** Label do rito de origem (ex.: "MBR", "Weekly") — exibido ao lado da etapa */
  ritualLabel?: string;
  /** Data ISO em que o item foi registrado (ex.: completed_at da sessão) */
  createdAt?: string | null;
}

// ============================================================
// CONSTANTS
// ============================================================

const CATEGORY_CONFIG = {
  decision: { label: 'Decisão', icon: Lightbulb, color: 'bg-status-blue-muted text-status-blue' },
  focus_adjustment: { label: 'Ajuste de Foco', icon: Target, color: 'bg-status-purple-muted text-status-purple' },
  next_step: { label: 'Próximo Passo', icon: CheckCircle2, color: 'bg-status-green-muted text-status-green' },
  strategic_proposal: { label: 'Proposta Estratégica', icon: Lightbulb, color: 'bg-status-amber-muted text-status-amber' },
} as const;

// ============================================================
// HELPER: OwnerNameResolved
// ============================================================

function OwnerNameResolved({ ownerId, snapshotName }: { ownerId: string; snapshotName?: string }) {
  const needsResolve = !snapshotName;
  const { data: participant } = useResolveParticipant(needsResolve ? ownerId : null, needsResolve);
  const displayName = snapshotName || participant?.displayName || 'Responsável';
  return <>{displayName}</>;
}

// ============================================================
// THREAD MESSAGE ITEM
// ============================================================

function ThreadMessageItem({ message }: { message: DecisionThreadMessage }) {
  const initials = message.authorName.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-start gap-2 py-2">
      <Avatar className="h-6 w-6 shrink-0">
        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">{message.authorName}</span>
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(parseISO(message.createdAt), { addSuffix: true, locale: ptBR })}
          </span>
        </div>
        <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function DecisionFollowUpRow({
  decision,
  sessionId,
  onUpdate,
  isPending = false,
  onAddMessage,
  isAddingMessage = false,
  hideThread = false,
  conductorProfileId,
  ritualLabel,
  createdAt,
}: DecisionFollowUpRowProps) {
  const { profileId } = useIdentity();
  const { isWildcard } = usePermissions();
  const { canResolve, isLoading: permLoading } = useCanResolveDecision(decision.owner?.id);
  const config = CATEGORY_CONFIG[decision.category] ?? CATEGORY_CONFIG.decision;
  const Icon = config.icon;
  const isDone = decision.followUpStatus === 'done';
  const canEditMeta = !isDone && (
    isWildcard ||
    (!!profileId && !!conductorProfileId && profileId === conductorProfileId)
  );
  const [isEditingMeta, setIsEditingMeta] = useState(false);

  // Resolution modal state
  const [showModal, setShowModal] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');

  // Thread input state
  const [threadMessage, setThreadMessage] = useState('');

  const handleCheckboxClick = () => {
    if (isDone) {
      if (!canResolve) return;
      onUpdate({
        sessionId,
        decisionId: decision.id,
        updates: {
          followUpStatus: 'pending',
          resolvedAt: undefined,
          resolvedBy: undefined,
          resolutionNote: undefined,
        } as any,
      });
    } else {
      setResolutionNote('');
      setShowModal(true);
    }
  };

  const handleConfirmResolution = () => {
    if (!resolutionNote.trim() || !profileId) return;

    onUpdate({
      sessionId,
      decisionId: decision.id,
      updates: {
        followUpStatus: 'done',
        resolvedAt: new Date().toISOString(),
        resolvedBy: { id: profileId, name: '' },
        resolutionNote: resolutionNote.trim(),
      } as any,
    });
    setShowModal(false);
  };

  const handleSendThreadMessage = () => {
    if (!threadMessage.trim() || !onAddMessage) return;
    onAddMessage({
      sessionId,
      decisionId: decision.id,
      content: threadMessage.trim(),
    });
    setThreadMessage('');
  };

  const threadMessages = decision.thread ?? [];

  return (
    <>
      <div className={cn(
        'flex flex-col gap-2 p-3 rounded-lg border transition-colors',
        isDone && 'bg-muted/40 opacity-70'
      )}>
        {/* Main row */}
        <div className="flex items-start gap-3">
          {/* Checkbox with permission guard */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Checkbox
                    checked={isDone}
                    onCheckedChange={handleCheckboxClick}
                    disabled={isPending || permLoading || !canResolve}
                    className="mt-0.5"
                  />
                </div>
              </TooltipTrigger>
              {!canResolve && !permLoading && (
                <TooltipContent>
                  Apenas o responsável ou seu líder pode resolver
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            <p className={cn('text-sm', isDone && 'line-through text-muted-foreground')}>
              {decision.text}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5', config.color)}>
                <Icon className="h-3 w-3 mr-0.5" />
                {config.label}
              </Badge>

              {decision.sourceStep && (
                <span className="text-[10px] text-muted-foreground">
                  Etapa: {decision.sourceStep}
                </span>
              )}

              {!isEditingMeta && decision.owner && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <OwnerNameResolved ownerId={decision.owner.id} snapshotName={decision.owner.name} />
                </span>
              )}

              {!isEditingMeta && decision.deadline && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {format(parseISO(decision.deadline), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              )}

              {canEditMeta && !isEditingMeta && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                  onClick={() => setIsEditingMeta(true)}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  {decision.owner || decision.deadline ? 'Editar' : 'Definir responsável/prazo'}
                </Button>
              )}
            </div>

            {canEditMeta && isEditingMeta && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <div className="w-[200px]">
                  <BuUserSelect
                    value={decision.owner?.id}
                    onValueChange={() => { /* handled by onUserSelected */ }}
                    onUserSelected={(user) => {
                      if (user) {
                        onUpdate({
                          sessionId,
                          decisionId: decision.id,
                          updates: { owner: { id: user.id, name: user.displayName } },
                        });
                      } else {
                        onUpdate({
                          sessionId,
                          decisionId: decision.id,
                          updates: { owner: undefined },
                        });
                      }
                    }}
                    placeholder="Responsável"
                    allowNone
                    noneLabel="Sem responsável"
                    showSearch
                    showBadges={false}
                    className="h-8 text-xs"
                  />
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'h-8 px-2.5 text-xs font-normal gap-1.5',
                        !decision.deadline && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {decision.deadline
                        ? format(parseISO(decision.deadline), 'dd/MM/yyyy', { locale: ptBR })
                        : 'Prazo'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={decision.deadline ? parseISO(decision.deadline) : undefined}
                      onSelect={(date) => {
                        onUpdate({
                          sessionId,
                          decisionId: decision.id,
                          updates: { deadline: date ? date.toISOString() : null },
                        });
                      }}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px]"
                  onClick={() => setIsEditingMeta(false)}
                  disabled={isPending}
                >
                  Concluir
                </Button>
              </div>
            )}

            {/* Resolution details */}
            {isDone && decision.resolutionNote && (
              <div className="mt-2 p-2 rounded bg-muted/50 space-y-1">
                <p className="text-xs italic text-foreground">{decision.resolutionNote}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  {decision.resolvedBy && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <OwnerNameResolved ownerId={decision.resolvedBy.id} snapshotName={decision.resolvedBy.name || undefined} />
                    </span>
                  )}
                  {decision.resolvedAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(parseISO(decision.resolvedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          <Badge
            variant={isDone ? 'default' : 'outline'}
            className={cn('shrink-0 text-[10px]', isDone && 'bg-status-green text-white')}
          >
            {isDone ? 'Concluído' : 'Pendente'}
          </Badge>
        </div>

        {/* Thread section */}
        {!hideThread && (threadMessages.length > 0 || (!isDone && onAddMessage)) && (
          <>
            <Separator className="my-1" />
            <div className="space-y-1">
              {threadMessages.length > 0 && (
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-0.5 px-1">
                    {threadMessages.map((msg) => (
                      <ThreadMessageItem key={msg.id} message={msg} />
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Thread input — only when not done */}
              {!isDone && onAddMessage && (
                <div className="flex items-end gap-2 pt-1">
                  <Textarea
                    placeholder="Adicionar atualização..."
                    value={threadMessage}
                    onChange={(e) => setThreadMessage(e.target.value)}
                    className="min-h-[36px] max-h-[80px] text-sm resize-none"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendThreadMessage();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSendThreadMessage}
                    disabled={!threadMessage.trim() || isAddingMessage}
                    className="shrink-0 h-9 w-9 p-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Resolution Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar resolução</DialogTitle>
            <DialogDescription>
              Descreva o que foi resolvido para esta decisão/registro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="p-3 rounded-lg border bg-muted/30">
              <p className="text-sm">{decision.text}</p>
            </div>
            <Textarea
              placeholder="O que foi resolvido?"
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              className="min-h-[100px]"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmResolution}
              disabled={!resolutionNote.trim() || isPending}
            >
              Confirmar resolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
