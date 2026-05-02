/**
 * CollaboratorInitiativesStep - Etapa 3 do Wizard Colaborador (Opcional)
 * 
 * Exibe iniciativas vinculadas aos KRs do colaborador:
 * - Destaca iniciativas paradas, atrasadas ou recém-iniciadas
 * - Permite marcar iniciativas como "em risco"
 * - Permite adicionar comentários rápidos
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight,
  ArrowLeft,
  ClipboardList,
  SkipForward,
  Lightbulb,
  FolderKanban,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';
import { projectsKeys } from '@/lib/queryKeys/projects';
import { EmptyState } from '@/components/ui/empty-state';
import { InitiativeCard } from '@/modules/okrs/components/initiatives/InitiativeCard';
import { KrContextCard } from '@/modules/okrs/components/wizards/shared/KrContextCard';
import { MicrocopyQuestion } from '../shared/ReflectionQuestions';
import { WizardStepHeader } from '../shared/WizardStepHeader';
import { WizardStepFooter } from '../shared/WizardStepFooter';
import { WizardStepScaffold } from '../shared/WizardStepScaffold';
import { InlineAgendaSuggestionInput } from '../shared/InlineAgendaSuggestionInput';
import { ProjectHealthBadge } from '@/modules/projects/components/ProjectHealthBadge';
import { InitiativeQuickUpdateDialog } from '@/modules/okrs/components/initiatives/InitiativeQuickUpdateDialog';
import type { WizardKr } from '@/modules/okrs/hooks';
import type { Initiative } from '@/modules/okrs/types/initiative';
import type { ProjectHealth } from '@/modules/projects/types';
import type { RitualAgendaSuggestion } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface CollaboratorInitiativesStepProps {
  /**
   * KRs do colaborador (vindos de useUserKrsForWizard) — usados apenas para
   * enriquecer a exibição (ex.: badges/projetos vinculados). A lista de
   * iniciativas exibida é independente e centrada no usuário (owner OR
   * contributor) no ciclo ativo. Ver TCR §4.8 — Collaborator Check-in /
   * Filtro de Iniciativas do Step.
   */
  krs: WizardKr[];
  /** Profile id efetivo do colaborador — usado para gating row-aware. */
  effectiveUserId: string | null;
  /** Ciclo trimestral ativo — limita a busca de iniciativas. */
  cycleId: string | null;
  onContinue: (markedAtRisk: string[]) => void;
  onBack: () => void;
  onSkip: () => void;
  agendaSuggestions?: RitualAgendaSuggestion[];
  onAgendaSuggestionsChange?: (next: RitualAgendaSuggestion[]) => void;
  agendaTriggerLabel?: string;
}

const AGENDA_SOURCE_STEP = 'collaborator-initiatives';

// ============================================================
// COMPONENT
// ============================================================

export function CollaboratorInitiativesStep({
  krs,
  effectiveUserId,
  cycleId,
  onContinue,
  onBack,
  onSkip,
  agendaSuggestions,
  onAgendaSuggestionsChange,
  agendaTriggerLabel,
}: CollaboratorInitiativesStepProps) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const [editingInitiative, setEditingInitiative] = useState<Initiative | null>(null);

  // KR titles vindos do array `krs` (enriquecimento de exibição).
  // A lista de iniciativas é centrada no usuário (ver query abaixo).
  const krTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const kr of krs) map.set(kr.id, kr.title);
    return map;
  }, [krs]);

  // Fetch initiatives centered on the collaborator (owner OR contributor)
  // for the active cycle. KRs são derivados das iniciativas retornadas.
  // Ver TCR §4.8 — Collaborator Check-in / Filtro de Iniciativas do Step.
  const { data: initiatives = [], isLoading } = useQuery({
    queryKey: queryKeys.okrs.initiativesForCollaborator(currentBuId, cycleId, effectiveUserId),
    queryFn: async () => {
      if (!effectiveUserId || !cycleId) return [];

      const { data, error } = await supabase
        .from('okr_initiatives')
        .select(`
          id, name, description, kr_id, owner_user_id, status, priority,
          start_date, expected_end_date, progress, notes, contributors, updated_at,
          kr:okr_team_key_results!inner (
            id,
            title,
            baseline,
            current_value,
            target,
            unit,
            direction,
            status,
            last_checkin_at,
            team_objective:okr_team_objectives!inner (
              id,
              title,
              cycle_id,
              cancelled_at,
              deleted_at,
              team:teams ( id, name )
            )
          )
        `)
        .or(`owner_user_id.eq.${effectiveUserId},contributors.cs.{"${effectiveUserId}"}`)
        .eq('kr.team_objective.cycle_id', cycleId)
        .is('kr.team_objective.cancelled_at', null)
        .is('kr.team_objective.deleted_at', null)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const rows = (data ?? []) as unknown as Array<Initiative & { kr?: { id: string; title: string } | null }>;

      // Hidratar `owner` (profiles cross-BU) — necessário para o
      // InitiativeQuickUpdateDialog exibir nome + avatar do responsável.
      const ownerIds = Array.from(new Set(rows.map((r) => r.owner_user_id).filter(Boolean)));
      let ownerMap = new Map<string, { id: string; display_name: string | null; first_name: string | null; last_name: string | null; photo_url: string | null }>();
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase
          .from('profiles')
          .select('id, display_name, first_name, last_name, photo_url')
          .in('id', ownerIds);
        ownerMap = new Map((owners ?? []).map((o) => [o.id, o]));
      }

      return rows.map((r) => ({ ...r, owner: ownerMap.get(r.owner_user_id) })) as Array<
        Initiative & { kr?: { id: string; title: string } | null }
      >;
    },
    enabled: !!effectiveUserId && !!cycleId,
  });

  // KR IDs derivados das iniciativas efetivamente retornadas
  const krIds = useMemo(
    () => Array.from(new Set(initiatives.map(i => i.kr_id))),
    [initiatives],
  );

  // Fetch projects linked to KRs
  const { data: projectsByKrData = [] } = useQuery({
    queryKey: [...projectsKeys.allPrefix(), 'by-krs', krIds],
    queryFn: async () => {
      if (krIds.length === 0) return [];

      const { data, error } = await supabase
        .from('project_krs')
        .select(`
          key_result_id,
          project:projects!project_krs_project_id_fkey(
            id, name, status, due_date,
            project_milestones(id, status, due_date, deleted_at)
          )
        `)
        .in('key_result_id', krIds);

      if (error) throw error;
      return (data || []).filter((r: any) => r.project);
    },
    enabled: krIds.length > 0,
  });

  // Group projects by KR
  const projectsByKr = useMemo(() => {
    const grouped = new Map<string, Array<{ id: string; name: string; health: ProjectHealth; completion_pct: number }>>();
    for (const row of projectsByKrData as any[]) {
      const p = row.project;
      const milestones = (p.project_milestones || []).filter((m: any) => !m.deleted_at);
      const total = milestones.length;
      const done = milestones.filter((m: any) => m.status === 'done').length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;

      let health: ProjectHealth = 'on_track';
      if (p.due_date) {
        const daysLeft = (new Date(p.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        if (daysLeft < 0) health = 'late';
        else if (pct < 50 && daysLeft < 14) health = 'at_risk';
      }

      const krId = row.key_result_id;
      const existing = grouped.get(krId) || [];
      if (!existing.find(x => x.id === p.id)) {
        existing.push({ id: p.id, name: p.name, health, completion_pct: pct });
      }
      grouped.set(krId, existing);
    }
    return grouped;
  }, [projectsByKrData]);

  // Group initiatives by KR + capture KR titles from the join (fallback when
  // the KR isn't present in the `krs` prop, e.g. when the user is only a
  // contributor of the initiative).
  const { initiativesByKr, krTitleResolved } = useMemo(() => {
    const grouped = new Map<string, Initiative[]>();
    const titles = new Map<string, string>(krTitleById);
    for (const init of initiatives) {
      const existing = grouped.get(init.kr_id) || [];
      existing.push(init);
      grouped.set(init.kr_id, existing);
      const joinedTitle = (init as any).kr?.title as string | undefined;
      if (joinedTitle && !titles.has(init.kr_id)) {
        titles.set(init.kr_id, joinedTitle);
      }
    }
    return { initiativesByKr: grouped, krTitleResolved: titles };
  }, [initiatives, krTitleById]);

  // Stats
  const stats = useMemo(() => {
    const total = initiatives.length;
    const blocked = initiatives.filter(i => i.status === 'blocked').length;
    const overdue = initiatives.filter(i => {
      if (!i.expected_end_date) return false;
      if (i.status === 'completed') return false;
      return new Date(i.expected_end_date) < new Date();
    }).length;
    return { total, blocked, overdue, needsAttention: blocked + overdue };
  }, [initiatives]);

  // Handle continue (markedAtRisk descontinuado — UI de iniciativas usa
  // padrão canônico InitiativeCard sem marcação/comentário inline).
  const handleContinue = () => {
    onContinue([]);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // If no initiatives, show empty state with canonical footer (Voltar/Pular/Continuar)
  if (initiatives.length === 0) {
    return (
      <WizardStepScaffold
        header={
          <WizardStepHeader
            icon={ClipboardList}
            title="Iniciativas vinculadas"
            tooltip="collaborator-initiatives"
            description="Revise o andamento das suas iniciativas no ciclo"
            variant="purple"
          />
        }
        footer={
          <WizardStepFooter
            showBack
            onBack={onBack}
            primaryLabel="Continuar"
            onPrimary={() => onContinue([])}
            showSkip
            skipLabel="Pular"
            onSkip={onSkip}
          />
        }
        bottomFixed={
          agendaSuggestions && onAgendaSuggestionsChange && agendaTriggerLabel ? (
            <InlineAgendaSuggestionInput
              suggestions={agendaSuggestions}
              onSuggestionsChange={onAgendaSuggestionsChange}
              sourceStep={AGENDA_SOURCE_STEP}
              triggerLabel={agendaTriggerLabel}
            />
          ) : undefined
        }
      >
        <div className="flex-1 flex items-center justify-center p-6 min-h-[320px]">
          <EmptyState
            icon={ClipboardList}
            title="Nenhuma iniciativa vinculada"
            description="Você não possui iniciativas vinculadas aos seus KRs. Iniciativas são opcionais — você pode pular ou avançar."
          />
        </div>
      </WizardStepScaffold>
    );
  }

  return (
    <div className="flex flex-col h-full min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-muted/20 min-w-0">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <ClipboardList className="h-5 w-5 text-primary shrink-0" />
            <h3 className="font-semibold truncate">Iniciativas vinculadas</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary">{stats.total} iniciativas</Badge>
            {stats.needsAttention > 0 && (
              <Badge variant="destructive">{stats.needsAttention} atenção</Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Revise o andamento das suas iniciativas. Bloqueadas e atrasadas já vêm sinalizadas.
        </p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-w-0">
        <div className="p-6 space-y-6 min-w-0">
          {/* Initiatives by KR — itera sobre os KRs efetivamente presentes
              nas iniciativas do colaborador (e não sobre `krs` da prop). */}
          {Array.from(initiativesByKr.keys())
            .sort((a, b) =>
              (krTitleResolved.get(a) ?? '').localeCompare(krTitleResolved.get(b) ?? '')
            )
            .map(krId => {
            const krInitiatives = initiativesByKr.get(krId) || [];
            const krProjects = projectsByKr.get(krId) || [];
            const krTitle = krTitleResolved.get(krId) ?? 'KR';
            if (krInitiatives.length === 0 && krProjects.length === 0) return null;

            return (
              <div key={krId} className="space-y-3 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {krTitle}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {krInitiatives.length}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {krInitiatives.map((init) => {
                    const canEditThis =
                      !!effectiveUserId && init.owner_user_id === effectiveUserId;
                    return (
                      <InitiativeCard
                        key={init.id}
                        initiative={init}
                        onQuickUpdate={canEditThis ? (i) => setEditingInitiative(i) : undefined}
                      />
                    );
                  })}
                </div>

              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Sugestão de pauta para o rito-mãe (Check-in do Time) */}
      {agendaSuggestions && onAgendaSuggestionsChange && agendaTriggerLabel && (
        <div className="shrink-0 min-w-0 max-w-full overflow-x-hidden">
          <InlineAgendaSuggestionInput
            suggestions={agendaSuggestions}
            onSuggestionsChange={onAgendaSuggestionsChange}
            sourceStep={AGENDA_SOURCE_STEP}
            triggerLabel={agendaTriggerLabel}
          />
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-4 border-t bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>

          <Button variant="outline" onClick={onSkip}>
            <SkipForward className="h-4 w-4 mr-1" />
            Pular
          </Button>

          <Button onClick={handleContinue} className="flex-1">
            Continuar
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Quick update dialog (canonical) — montado por demanda */}
      <InitiativeQuickUpdateDialog
        open={!!editingInitiative}
        onOpenChange={(open) => { if (!open) setEditingInitiative(null); }}
        initiative={editingInitiative}
        krContext={(() => {
          if (!editingInitiative) return undefined;
          const title = krTitleResolved.get(editingInitiative.kr_id);
          if (!title) return undefined;
          return { id: editingInitiative.kr_id, title };
        })()}
      />
    </div>
  );
}
