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
import { InitiativesSummary } from '../shared/InitiativesSummary';
import { MicrocopyQuestion } from '../shared/ReflectionQuestions';
import { WizardStepHeader } from '../shared/WizardStepHeader';
import { WizardStepFooter } from '../shared/WizardStepFooter';
import { WizardStepScaffold } from '../shared/WizardStepScaffold';
import { ProjectHealthBadge } from '@/modules/projects/components/ProjectHealthBadge';
import { InitiativeQuickUpdateDialog } from '@/modules/okrs/components/initiatives/InitiativeQuickUpdateDialog';
import type { WizardKr } from '@/modules/okrs/hooks';
import type { Initiative } from '@/modules/okrs/types/initiative';
import type { ProjectHealth } from '@/modules/projects/types';

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
}

// ============================================================
// COMPONENT
// ============================================================

export function CollaboratorInitiativesStep({
  krs,
  effectiveUserId,
  onContinue,
  onBack,
  onSkip,
}: CollaboratorInitiativesStepProps) {
  const supabase = useBuScopedSupabase();
  const [markedAtRisk, setMarkedAtRisk] = useState<string[]>([]);
  const [editingInitiative, setEditingInitiative] = useState<Initiative | null>(null);

  // Get KR IDs
  const krIds = useMemo(() => krs.map(kr => kr.id), [krs]);

  // Fetch initiatives for all KRs
  const { data: initiatives = [], isLoading } = useQuery({
    queryKey: queryKeys.okrs.initiativesByKrs(krIds),
    queryFn: async () => {
      if (krIds.length === 0) return [];

      const { data, error } = await supabase
        .from('okr_initiatives')
        .select('id, name, description, kr_id, owner_user_id, status, priority, start_date, expected_end_date, progress, notes, updated_at')
        .in('kr_id', krIds)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as Initiative[];
    },
    enabled: krIds.length > 0,
  });

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

  // Group initiatives by KR
  const initiativesByKr = useMemo(() => {
    const grouped = new Map<string, Initiative[]>();
    for (const init of initiatives) {
      const existing = grouped.get(init.kr_id) || [];
      existing.push(init);
      grouped.set(init.kr_id, existing);
    }
    return grouped;
  }, [initiatives]);

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

  // Handle mark at risk
  const handleMarkAtRisk = (initiativeId: string, atRisk: boolean) => {
    setMarkedAtRisk(prev => 
      atRisk 
        ? [...prev, initiativeId]
        : prev.filter(id => id !== initiativeId)
    );
  };

  // Handle continue
  const handleContinue = () => {
    onContinue(markedAtRisk);
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
            description="Revise as iniciativas e marque as que precisam de atenção"
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Iniciativas vinculadas</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{stats.total} iniciativas</Badge>
            {stats.needsAttention > 0 && (
              <Badge variant="destructive">{stats.needsAttention} atenção</Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Revise as iniciativas e marque as que precisam de atenção.
        </p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Prompt */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">
                O sistema não força atualização de iniciativas
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Apenas revise e sinalize se alguma merece atenção do time ou líder.
              </p>
            </div>
          </div>

          {/* Initiatives by KR */}
          {krs.map(kr => {
            const krInitiatives = initiativesByKr.get(kr.id) || [];
            const krProjects = projectsByKr.get(kr.id) || [];
            if (krInitiatives.length === 0 && krProjects.length === 0) return null;

            return (
              <div key={kr.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {kr.title}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {krInitiatives.length}
                  </Badge>
                </div>
                
                <InitiativesSummary
                  initiatives={krInitiatives}
                  markedAtRisk={markedAtRisk}
                  onMarkAtRisk={handleMarkAtRisk}
                  editable
                  onEdit={(init) => setEditingInitiative(init)}
                  canEdit={(init) =>
                    !!effectiveUserId && init.owner_user_id === effectiveUserId
                  }
                />

                {/* Projects linked to this KR */}
                {krProjects.length > 0 && (
                  <div className="space-y-1 pl-1">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <FolderKanban className="h-3 w-3" /> Projetos ({krProjects.length})
                    </p>
                    <ul className="space-y-1">
                      {krProjects.map(proj => (
                        <li key={proj.id} className="flex items-center gap-2 text-xs">
                          <ProjectHealthBadge health={proj.health} dotOnly />
                          <span className="truncate">{proj.name}</span>
                          <span className="text-muted-foreground shrink-0">{proj.completion_pct}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}

          {/* Question */}
          <MicrocopyQuestion 
            question="Alguma iniciativa merece atenção do time ou do líder na próxima reunião?"
            variant="highlight"
          />
        </div>
      </ScrollArea>

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
            {markedAtRisk.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {markedAtRisk.length} sinalizadas
              </Badge>
            )}
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
          const kr = krs.find(k => k.id === editingInitiative.kr_id);
          if (!kr) return undefined;
          return { id: kr.id, title: kr.title };
        })()}
      />
    </div>
  );
}
