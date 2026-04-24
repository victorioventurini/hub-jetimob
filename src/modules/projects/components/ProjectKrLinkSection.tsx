import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Search, Link2 } from 'lucide-react';
import { useKrsForLinking, type KrForLinking } from '../hooks/useKrsForLinking';
import { useAddProjectKrLink, useRemoveProjectKrLink } from '../hooks/useProjectKrLinks';
import { cn } from '@/lib/utils';
import type { ProjectImpact, KrLinkKind } from '../types';

interface LinkedKr {
  key_result_id: string;
  kr_title: string;
  impact: ProjectImpact;
  kind: KrLinkKind;
}

interface ProjectKrLinkSectionProps {
  projectId: string;
  linkedKrs: LinkedKr[];
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

const KIND_LABEL: Record<KrLinkKind, string> = { team: 'Time', org: 'Org' };
const KIND_CLASS: Record<KrLinkKind, string> = {
  org: 'bg-primary/10 text-primary border-primary/20',
  team: 'bg-muted text-muted-foreground border-border',
};

function groupByObjective(krs: KrForLinking[]) {
  const groups = new Map<string, { objectiveTitle: string; cycleName: string | null; kind: KrLinkKind; items: KrForLinking[] }>();
  for (const kr of krs) {
    const key = `${kr.kind}:${kr.objective_id ?? 'none'}`;
    const existing = groups.get(key);
    if (existing) existing.items.push(kr);
    else
      groups.set(key, {
        objectiveTitle: kr.objective_title ?? 'Sem objetivo',
        cycleName: kr.cycle_name,
        kind: kr.kind,
        items: [kr],
      });
  }
  return Array.from(groups.values());
}

export function ProjectKrLinkSection({ projectId, linkedKrs, canEdit }: ProjectKrLinkSectionProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<KrForLinking | null>(null);
  const [selectedImpact, setSelectedImpact] = useState<ProjectImpact>('medium');

  const { data: availableKrs = [], isLoading: loadingKrs } = useKrsForLinking();
  const addLink = useAddProjectKrLink();
  const removeLink = useRemoveProjectKrLink();

  const linkedIds = new Set(linkedKrs.map((kr) => kr.key_result_id));
  const filteredKrs = useMemo(() => {
    const q = search.toLowerCase().trim();
    return availableKrs.filter(
      (kr) =>
        !linkedIds.has(kr.id) &&
        (q === '' ||
          kr.title.toLowerCase().includes(q) ||
          (kr.objective_title?.toLowerCase().includes(q) ?? false)),
    );
  }, [availableKrs, search, linkedIds]);

  const grouped = useMemo(() => groupByObjective(filteredKrs), [filteredKrs]);

  const handleAdd = () => {
    if (!selected) return;
    addLink.mutate(
      { project_id: projectId, kr_id: selected.id, kind: selected.kind, impact: selectedImpact },
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

  const handleRemove = (kr: LinkedKr) => {
    removeLink.mutate({ project_id: projectId, kr_id: kr.key_result_id, kind: kr.kind });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            KRs vinculadas
          </CardTitle>
          {canEdit && (
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  Vincular KR
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
                            {KIND_LABEL[group.kind]}
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
      </CardHeader>
      <CardContent>
        {linkedKrs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma KR vinculada</p>
        ) : (
          <ul className="space-y-2">
            {linkedKrs.map((kr) => (
              <li key={`${kr.kind}:${kr.key_result_id}`} className="flex items-center justify-between text-sm gap-2">
                <div className="flex items-center gap-2 truncate flex-1">
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] px-1.5 py-0 h-4 shrink-0', KIND_CLASS[kr.kind])}
                  >
                    {KIND_LABEL[kr.kind]}
                  </Badge>
                  <span className="truncate">{kr.kr_title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${IMPACT_COLORS[kr.impact]}`}>
                    {IMPACT_LABELS[kr.impact]}
                  </span>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemove(kr)}
                      disabled={removeLink.isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
