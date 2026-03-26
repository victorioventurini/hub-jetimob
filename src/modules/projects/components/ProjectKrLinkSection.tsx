import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Plus, X, Search, Link2 } from 'lucide-react';
import { useKrsForLinking } from '../hooks/useKrsForLinking';
import { useAddProjectKrLink, useRemoveProjectKrLink } from '../hooks/useProjectKrLinks';
import type { ProjectImpact } from '../types';

interface LinkedKr {
  key_result_id: string;
  kr_title: string;
  impact: ProjectImpact;
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

export function ProjectKrLinkSection({ projectId, linkedKrs, canEdit }: ProjectKrLinkSectionProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedKrId, setSelectedKrId] = useState<string | null>(null);
  const [selectedImpact, setSelectedImpact] = useState<ProjectImpact>('medium');

  const { data: availableKrs = [], isLoading: loadingKrs } = useKrsForLinking();
  const addLink = useAddProjectKrLink();
  const removeLink = useRemoveProjectKrLink();

  const linkedIds = new Set(linkedKrs.map((kr) => kr.key_result_id));
  const filteredKrs = availableKrs.filter(
    (kr) => !linkedIds.has(kr.id) && kr.title.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAdd = () => {
    if (!selectedKrId) return;
    addLink.mutate(
      { project_id: projectId, key_result_id: selectedKrId, impact: selectedImpact },
      {
        onSuccess: () => {
          setSelectedKrId(null);
          setSelectedImpact('medium');
          setPopoverOpen(false);
          setSearch('');
        },
      },
    );
  };

  const handleRemove = (krId: string) => {
    removeLink.mutate({ project_id: projectId, key_result_id: krId });
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
              <PopoverContent className="w-80 p-3" align="end">
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar KR..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {loadingKrs && <p className="text-xs text-muted-foreground p-2">Carregando...</p>}
                    {!loadingKrs && filteredKrs.length === 0 && (
                      <p className="text-xs text-muted-foreground p-2">Nenhuma KR disponível</p>
                    )}
                    {filteredKrs.map((kr) => (
                      <button
                        key={kr.id}
                        type="button"
                        onClick={() => setSelectedKrId(kr.id)}
                        className={`w-full text-left rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent ${
                          selectedKrId === kr.id ? 'bg-accent' : ''
                        }`}
                      >
                        <span className="line-clamp-1">{kr.title}</span>
                        {kr.objective_title && (
                          <span className="text-xs text-muted-foreground line-clamp-1 mt-0.5 block">
                            {kr.objective_title}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {selectedKrId && (
                    <div className="flex items-center gap-2 pt-1 border-t">
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
              <li key={kr.key_result_id} className="flex items-center justify-between text-sm gap-2">
                <span className="truncate flex-1">{kr.kr_title}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${IMPACT_COLORS[kr.impact]}`}>
                    {IMPACT_LABELS[kr.impact]}
                  </span>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemove(kr.key_result_id)}
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
