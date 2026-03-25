/**
 * RitualsTab — Gestão de rituais de OKR (QBR)
 * 
 * Permite BU admins abrir/fechar o QBR do ciclo trimestral ativo,
 * visualizar o status atual e entender a máquina de estados.
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Play,
  Square,
  RotateCcw,
  ChevronRight,
  Info,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Briefcase,
  FileText,
  ClipboardCheck,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { queryKeys } from '@/lib/queryKeys';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ── QBR Status Machine ──

const QBR_STATES = [
  {
    value: 'closed',
    label: 'Fechado',
    description: 'QBR não iniciado para este ciclo',
    icon: Square,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    badgeVariant: 'secondary' as const,
  },
  {
    value: 'open',
    label: 'Aberto',
    description: 'Líderes podem iniciar o QBR Pre',
    icon: Play,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    badgeVariant: 'default' as const,
  },
  {
    value: 'collecting',
    label: 'Coletando',
    description: 'Líderes estão submetendo seus QBR Pre',
    icon: Users,
    color: 'text-info',
    bgColor: 'bg-info/10',
    badgeVariant: 'outline' as const,
  },
  {
    value: 'reviewing',
    label: 'Revisão C-Level',
    description: 'C-Level está revisando as submissões',
    icon: Briefcase,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    badgeVariant: 'outline' as const,
  },
  {
    value: 'ready',
    label: 'Pronto',
    description: 'QBR Meeting concluído, aguardando post',
    icon: ClipboardCheck,
    color: 'text-success',
    bgColor: 'bg-success/10',
    badgeVariant: 'outline' as const,
  },
  {
    value: 'done',
    label: 'Concluído',
    description: 'QBR finalizado com sucesso',
    icon: CheckCircle2,
    color: 'text-success',
    bgColor: 'bg-success/10',
    badgeVariant: 'outline' as const,
  },
] as const;

type QbrStatus = (typeof QBR_STATES)[number]['value'];

const QBR_WIZARD_FLOW = [
  {
    step: 1,
    label: 'QBR Pre',
    description: 'Líderes de time fazem balanço do ciclo',
    route: '/okrs/qbr-pre',
    actor: 'Líder de Time',
    requiredStatus: ['open', 'collecting'] as QbrStatus[],
  },
  {
    step: 2,
    label: 'QBR Pre C-Level',
    description: 'C-Level consolida e define diretrizes',
    route: '/okrs/qbr-pre-clevel',
    actor: 'Admin / C-Level',
    requiredStatus: ['reviewing'] as QbrStatus[],
  },
  {
    step: 3,
    label: 'QBR Meeting',
    description: 'Reunião trimestral de revisão',
    route: '/okrs/qbr',
    actor: 'Admin / C-Level',
    requiredStatus: ['reviewing'] as QbrStatus[],
  },
  {
    step: 4,
    label: 'QBR Post',
    description: 'Promoção de OKRs e encerramento',
    route: '/okrs/qbr-post',
    actor: 'Admin / C-Level',
    requiredStatus: ['ready', 'done'] as QbrStatus[],
  },
];

function getStateConfig(status: string) {
  return QBR_STATES.find(s => s.value === status) ?? QBR_STATES[0];
}

// ══════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════

export function RitualsTab() {
  const { client: supabase, buId } = useOptionalBuClient();
  const queryClient = useQueryClient();
  const { has, isWildcard } = usePermissions();
  const canManage = isWildcard || has('okrs.settings.manage:bu');

  const [confirmAction, setConfirmAction] = useState<'open' | 'close' | null>(null);

  // ── Fetch quarterly cycles with qbr_status ──
  const { data: quarterCycles, isLoading } = useQuery({
    queryKey: [...queryKeys.okrs.settingsCycles(buId ?? null), 'qbr-status'],
    queryFn: async () => {
      if (!supabase || !buId) return [];
      const { data, error } = await supabase
        .from('cycles')
        .select('id, name, type, start_date, end_date, qbr_status')
        .eq('type', 'quarter')
        .order('start_date', { ascending: false })
        .limit(8);
      if (error) throw error;
      return data as Array<{
        id: string;
        name: string;
        type: string;
        start_date: string;
        end_date: string;
        qbr_status: string;
      }>;
    },
    enabled: !!buId && !!supabase,
  });

  // ── Current quarter ──
  const currentQuarter = useMemo(() => {
    if (!quarterCycles) return null;
    const now = new Date();
    return quarterCycles.find(c => now >= parseISO(c.start_date) && now <= parseISO(c.end_date)) ?? quarterCycles[0] ?? null;
  }, [quarterCycles]);

  const currentStatus = currentQuarter?.qbr_status as QbrStatus | undefined;
  const stateConfig = getStateConfig(currentStatus ?? 'closed');

  // ── Mutation: update qbr_status ──
  const statusMutation = useMutation({
    mutationFn: async ({ cycleId, newStatus }: { cycleId: string; newStatus: QbrStatus }) => {
      if (!supabase) throw new Error('Sem conexão');
      const { error } = await supabase
        .from('cycles')
        .update({ qbr_status: newStatus })
        .eq('id', cycleId);
      if (error) throw error;
    },
    onSuccess: (_, { newStatus }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.settingsCycles(null) });
      queryClient.invalidateQueries({ queryKey: ['qbr'] });
      const label = getStateConfig(newStatus).label;
      toast.success(`QBR status alterado para "${label}"`);
      setConfirmAction(null);
    },
    onError: (error) => {
      toast.error('Erro ao alterar status do QBR');
      console.error('QBR status mutation error:', error);
      setConfirmAction(null);
    },
  });

  const handleOpenQbr = () => {
    if (!currentQuarter) return;
    statusMutation.mutate({ cycleId: currentQuarter.id, newStatus: 'open' });
  };

  const handleCloseQbr = () => {
    if (!currentQuarter) return;
    statusMutation.mutate({ cycleId: currentQuarter.id, newStatus: 'closed' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Rituais de Gestão</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie o ciclo do Quarterly Business Review (QBR) e acompanhe o fluxo dos rituais
        </p>
      </div>

      {/* QBR Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-primary" />
            QBR — Ciclo Atual
          </CardTitle>
          <CardDescription>
            Status do Quarterly Business Review do ciclo trimestral ativo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !currentQuarter ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Nenhum ciclo trimestral encontrado</p>
              <p className="text-sm mt-1">Crie um ciclo trimestral na aba "Ciclos" primeiro.</p>
            </div>
          ) : (
            <>
              {/* Current cycle info + status */}
              <div className="flex items-start justify-between gap-4 p-4 rounded-lg border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">{currentQuarter.name}</span>
                    <Badge variant="outline" className="text-success border-success/30">Atual</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(currentQuarter.start_date), "dd 'de' MMMM", { locale: ptBR })} — {format(parseISO(currentQuarter.end_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>

                <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg', stateConfig.bgColor)}>
                  <stateConfig.icon className={cn('h-5 w-5', stateConfig.color)} />
                  <div>
                    <p className={cn('font-medium text-sm', stateConfig.color)}>{stateConfig.label}</p>
                    <p className="text-xs text-muted-foreground">{stateConfig.description}</p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              {canManage && (
                <div className="flex items-center gap-3">
                  {currentStatus === 'closed' && (
                    <Button
                      onClick={() => setConfirmAction('open')}
                      className="gap-2"
                      disabled={statusMutation.isPending}
                    >
                      <Play className="h-4 w-4" />
                      Abrir QBR
                    </Button>
                  )}
                  {currentStatus && currentStatus !== 'closed' && currentStatus !== 'done' && (
                    <Button
                      variant="destructive"
                      onClick={() => setConfirmAction('close')}
                      className="gap-2"
                      disabled={statusMutation.isPending}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Resetar QBR
                    </Button>
                  )}
                  {currentStatus === 'done' && (
                    <div className="flex items-center gap-2 text-sm text-success">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>QBR concluído para este ciclo</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* State Machine Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-5 w-5" />
            Máquina de Estados do QBR
          </CardTitle>
          <CardDescription>
            O QBR segue uma sequência rigorosa de etapas. Cada transição é validada pelo banco de dados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 overflow-x-auto py-2">
            {QBR_STATES.map((state, index) => {
              const isActive = currentStatus === state.value;
              const isPast = QBR_STATES.findIndex(s => s.value === currentStatus) > index;
              const Icon = state.icon;

              return (
                <div key={state.value} className="flex items-center gap-1 shrink-0">
                  <div
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
                      isActive && 'border-primary bg-primary/5 ring-2 ring-primary/20',
                      isPast && 'border-success/30 bg-success/5',
                      !isActive && !isPast && 'border-border bg-background',
                    )}
                  >
                    <Icon className={cn(
                      'h-4 w-4',
                      isActive ? 'text-primary' : isPast ? 'text-success' : 'text-muted-foreground'
                    )} />
                    <span className={cn(
                      'text-sm font-medium whitespace-nowrap',
                      isActive ? 'text-primary' : isPast ? 'text-success' : 'text-muted-foreground'
                    )}>
                      {state.label}
                    </span>
                  </div>
                  {index < QBR_STATES.length - 1 && (
                    <ChevronRight className={cn(
                      'h-4 w-4 shrink-0',
                      isPast ? 'text-success' : 'text-muted-foreground/40'
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Wizard Flow Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-primary" />
            Fluxo de Wizards do QBR
          </CardTitle>
          <CardDescription>
            Cada etapa do QBR é executada por um wizard específico
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {QBR_WIZARD_FLOW.map(wizard => {
              const isAccessible = currentStatus ? wizard.requiredStatus.includes(currentStatus) : false;

              return (
                <div
                  key={wizard.step}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-lg border transition-all',
                    isAccessible ? 'border-primary/30 bg-primary/5' : 'border-border',
                  )}
                >
                  <div className={cn(
                    'flex items-center justify-center h-8 w-8 rounded-full text-sm font-bold shrink-0',
                    isAccessible ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}>
                    {wizard.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{wizard.label}</span>
                      {isAccessible && (
                        <Badge className="bg-primary/10 text-primary border-0">Acessível</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{wizard.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-medium">Ator:</span> {wizard.actor} · <span className="font-medium">Rota:</span>{' '}
                      <code className="text-xs bg-muted px-1 rounded">{wizard.route}</code>
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    Status: {wizard.requiredStatus.map(s => getStateConfig(s).label).join(', ')}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* QBR History for other quarters */}
      {quarterCycles && quarterCycles.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de QBR por Ciclo</CardTitle>
            <CardDescription>Status do QBR em ciclos anteriores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {quarterCycles.map(cycle => {
                const cfg = getStateConfig(cycle.qbr_status);
                const isCurrent = currentQuarter?.id === cycle.id;

                return (
                  <div
                    key={cycle.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border',
                      isCurrent && 'border-primary/30 bg-primary/5',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-sm">{cycle.name}</span>
                      {isCurrent && <Badge variant="outline" className="text-xs text-success border-success/30">Atual</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <cfg.icon className={cn('h-4 w-4', cfg.color)} />
                      <Badge variant={cfg.badgeVariant}>{cfg.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialogs */}
      <AlertDialog open={confirmAction === 'open'} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abrir QBR para {currentQuarter?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao abrir o QBR, todos os líderes de time terão acesso ao wizard QBR Pre 
              para submeter seu balanço do ciclo. Esta ação pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleOpenQbr} disabled={statusMutation.isPending}>
              {statusMutation.isPending ? 'Abrindo...' : 'Abrir QBR'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAction === 'close'} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar QBR de {currentQuarter?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai resetar o status do QBR para "Fechado". Os rascunhos de wizard 
              existentes não serão removidos, mas o QBR ficará inacessível até ser reaberto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCloseQbr}
              disabled={statusMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {statusMutation.isPending ? 'Resetando...' : 'Resetar QBR'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
