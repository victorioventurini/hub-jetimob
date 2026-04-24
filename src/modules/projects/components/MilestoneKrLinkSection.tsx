/**
 * MilestoneKrLinkSection — KRs vinculadas a um milestone individual
 *
 * Padrão visual idêntico ao ProjectKrLinkSection mas inline (sem Card wrapper).
 * Suporta KRs de Time e Organizacionais (ciclo ativo: quarter + year).
 */

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Search, Link2 } from 'lucide-react';
import { useMilestoneKrs } from '../hooks/useMilestoneKrs';
import { useKrsForLinking, type KrForLinking } from '../hooks/useKrsForLinking';
import { useAddMilestoneKrLink, useRemoveMilestoneKrLink } from '../hooks/useMilestoneKrLinks';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ProjectImpact, KrLinkKind } from '../types';

interface MilestoneKrLinkSectionProps {
  milestoneId: string;
  projectId: string;
  canEdit: boolean;
}

const IMPACT_LABELS: Record<ProjectImpact, string> = {
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
};

const IMPACT_COLORS: Record<ProjectImpact, string> = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-warning/10 text-warning-foreground',
  low: 'bg-muted text-muted-foreground',
};

const KIND_CLASS: Record<KrLinkKind, string> = {
  org: 'bg-primary/10 text-primary border-primary/20',
  team: 'bg-muted text-muted-foreground border-border',
};

/** Texto do badge: nome do time (Team) ou 'Org'. Fallback defensivo: 'Time'. */
function badgeLabel(kind: KrLinkKind, teamName: string | null | undefined) {
  if (kind === 'org') return 'Org';
  return teamName?.trim() || 'Time';
}

function groupByObjective(krs: KrForLinking[]) {
  const groups = new Map<
    string,
    { objectiveTitle: string; cycleName: string | null; kind: KrLinkKind; teamName: string | null; items: KrForLinking[] }
  >();
  for (const kr of krs) {
    const key = `${kr.kind}:${kr.objective_id ?? 'none'}`;
    const existing = groups.get(key);
    if (existing) existing.items.push(kr);
    else
      groups.set(key, {
        objectiveTitle: kr.objective_title ?? 'Sem objetivo',
        cycleName: kr.cycle_name,
        kind: kr.kind,
        teamName: kr.team_name,
        items: [kr],
      });
  }
  return Array.from(groups.values());
}

export function MilestoneKrLinkSection({ milestoneId, projectId, canEdit }: MilestoneKrLinkSectionProps) {
  // ⚠️ CRÍTICO — Rules of Hooks: TODOS os hooks (incluindo useMemo) DEVEM ser
  // chamados antes de qualquer early-return condicional. Mover hooks para depois
  // de `if (isLoading) return ...` quebra a contagem entre renders e dispara
  // React #310 ("Rendered more hooks than during the previous render").
  // Ver: mem://standards/frontend-rules-of-hooks
  const { data: linkedKrs, isLoading } = useMilestoneKrs(milestoneId);
  const { data: availableKrs = [], isLoading: loadingKrs } = useKrsForLinking();
  const addLink = useAddMilestoneKrLink();
  const removeLink = useRemoveMilestoneKrLink();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<KrForLinking | null>(null);
  const [selectedImpact, setSelectedImpact] = useState<ProjectImpact>('medium');

  // Derivações estáveis para a deps array dos useMemo (evitam o anti-padrão
  // de usar `length` como proxy de identidade do conteúdo).
  const krs = linkedKrs ?? [];
  const linkedIdsKey = krs
    .map((kr) => kr.key_result_id)
    .sort()
    .join(',');

  const filteredKrs = useMemo(() => {
    const q = search.toLowerCase().trim();
    const linkedSet = new Set(linkedIdsKey ? linkedIdsKey.split(',') : []);
    return availableKrs.filter(
      (kr) =>
        !linkedSet.has(kr.id) &&
        (q === '' ||
          kr.title.toLowerCase().includes(q) ||
          (kr.objective_title?.toLowerCase().includes(q) ?? false) ||
          (kr.team_name?.toLowerCase().includes(q) ?? false)),
    );
  }, [availableKrs, search, linkedIdsKey]);

  const grouped = useMemo(() => groupByObjective(filteredKrs), [filteredKrs]);

  // ✅ Early return APÓS todos os hooks (Rules of Hooks compliance).
  if (isLoading) {
    return <Skeleton className="h-8 w-full" />;
  }

  const handleAdd = () => {
    if (!selected) return;
    addLink.mutate(
      {
        milestone_id: milestoneId,
        kr_id: selected.id,
        kind: selected.kind,
        impact: selectedImpact,
        project_id: projectId,
      },
      {
        onSuccess: () => {
          setSelected(null);
          setSelectedImpact('medium');
          setPopoverOpen(false);
          setSearch('');
        },
      },
    );
  };

  const handleRemove = (kr: { key_result_id: string; kind: KrLinkKind }) => {
    removeLink.mutate({
      milestone_id: milestoneId,
      kr_id: kr.key_result_id,
      kind: kr.kind,
      project_id: projectId,
    });
  };

  return (
    <div className="pl-6 pb-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link2 className="h-3 w-3" />
          <span>KRs vinculadas ({krs.length})</span>
        </div>

        {canEdit && (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs px-2">
                <Plus className="h-3 w-3" />
                Vincular
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[480px] p-3" align="end">
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar KR ou objetivo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>

                <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                  {loadingKrs && <p className="text-xs text-muted-foreground p-2">Carregando...</p>}
                  {!loadingKrs && grouped.length === 0 && (
                    <p className="text-xs text-muted-foreground p-2">Nenhuma KR ativa no ciclo atual</p>
                  )}
                  {grouped.map((group, gIdx) => (
                    <div key={gIdx} className="space-y-1">
                      <div className="flex items-center gap-2 px-1">
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] px-1.5 py-0 h-4', KIND_CLASS[group.kind])}
                        >
                          {badgeLabel(group.kind, group.teamName)}
                        </Badge>
                        <span className="text-xs font-medium text-muted-foreground line-clamp-1 flex-1">
                          {group.objectiveTitle}
                        </span>
                        {group.cycleName && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {group.cycleName}
                          </span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {group.items.map((kr) => (
                          <button
                            key={kr.id}
                            type="button"
                            onClick={() => setSelected(kr)}
                            className={cn(
                              'w-full text-left rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent',
                              selected?.id === kr.id && 'bg-accent ring-1 ring-primary/30',
                            )}
                          >
                            <span className="line-clamp-2">{kr.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {selected && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Select
                      value={selectedImpact}
                      onValueChange={(v) => setSelectedImpact(v as ProjectImpact)}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">Alto</SelectItem>
                        <SelectItem value="medium">Médio</SelectItem>
                        <SelectItem value="low">Baixo</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      onClick={handleAdd}
                      disabled={addLink.isPending}
                    >
                      Vincular
                    </Button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {krs.length > 0 && (
        <ul className="space-y-1">
          {krs.map((kr) => (
            <li
              key={`${kr.kind}:${kr.key_result_id}`}
              className="flex items-center justify-between text-xs gap-2 py-1 px-2 rounded hover:bg-muted/50"
            >
              <div className="flex items-center gap-1.5 truncate flex-1">
                <Badge
                  variant="outline"
                  className={cn('text-[10px] px-1 py-0 h-3.5 shrink-0', KIND_CLASS[kr.kind])}
                >
                  {badgeLabel(kr.kind, kr.team_name)}
                </Badge>
                <span className="truncate">{kr.kr_title}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${IMPACT_COLORS[kr.impact]}`}>
                  {IMPACT_LABELS[kr.impact]}
                </span>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => handleRemove(kr)}
                    disabled={removeLink.isPending}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
