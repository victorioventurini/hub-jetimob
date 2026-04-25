import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Rocket, KeyRound, ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useBu } from '@/contexts/BuContext';
import { teamsKeys } from '@/lib/queryKeys/teams';
import { useUrlState } from '@/shared/url';
import { InitiativeCard } from '@/modules/okrs/components/initiatives/InitiativeCard';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  type Initiative,
  type InitiativeStatus,
  getInitiativeStatusLabel,
} from '@/modules/okrs/types/initiative';
import { getShareableUrl } from '@/lib/shareableLinks';

interface TeamInitiativesBlockProps {
  teamId: string;
  krIds: string[];
  cycleId: string | null;
  isLoadingKrs: boolean;
}

const INITIATIVE_FIELDS = `
  id, bu_id, kr_id, name, description, status, priority, progress,
  owner_user_id, contributors, start_date, expected_end_date,
  notes, created_at, updated_at, deleted_at
` as const;

type FilterValue = 'all' | InitiativeStatus | 'overdue';

const FILTERS: Array<{ value: FilterValue; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'in_progress', label: 'Em progresso' },
  { value: 'planned', label: 'Planejadas' },
  { value: 'blocked', label: 'Bloqueadas' },
  { value: 'overdue', label: 'Atrasadas' },
  { value: 'completed', label: 'Concluídas' },
];

interface KrInfo {
  id: string;
  title: string;
  team_objective_id: string;
}

/**
 * Lista de iniciativas dos KRs do time, agrupadas por KR.
 * Reuso obrigatório de InitiativeCard. BU-scoped via useOptionalBuClient.
 */
export const TeamInitiativesBlock = React.memo(function TeamInitiativesBlock({
  teamId,
  krIds,
  cycleId,
  isLoadingKrs,
}: TeamInitiativesBlockProps) {
  const { client: supabase, isReady } = useOptionalBuClient();
  const { currentBu } = useBu();

  const { value: filter, set: setFilter } = useUrlState<FilterValue>({
    key: 'init_status',
    defaultValue: 'all',
  });

  const { data, isLoading } = useQuery({
    queryKey: teamsKeys.contributionInitiatives(
      teamId,
      currentBu?.id ?? null,
      cycleId,
      false,
    ),
    queryFn: async (): Promise<{
      initiatives: Initiative[];
      krsById: Map<string, KrInfo>;
    }> => {
      if (!supabase || !currentBu?.id || krIds.length === 0) {
        return { initiatives: [], krsById: new Map() };
      }

      // 1) Iniciativas
      const { data: initRows, error: initErr } = await supabase
        .from('okr_initiatives')
        .select(INITIATIVE_FIELDS)
        .eq('bu_id', currentBu.id)
        .in('kr_id', krIds)
        .is('deleted_at', null)
        .order('expected_end_date', { ascending: true, nullsFirst: false });
      if (initErr) throw initErr;

      // 2) Owners (profiles)
      const ownerIds = [
        ...new Set((initRows || []).map((i) => i.owner_user_id).filter(Boolean)),
      ] as string[];
      const ownerMap = new Map<string, Initiative['owner']>();
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase
          .from('profiles')
          .select('id, display_name, first_name, last_name, photo_url')
          .in('id', ownerIds);
        for (const o of owners || []) {
          ownerMap.set(o.id, {
            id: o.id,
            display_name: o.display_name,
            first_name: o.first_name,
            last_name: o.last_name,
            photo_url: o.photo_url,
          });
        }
      }

      // 3) KRs (para cabeçalhos)
      const { data: krRows } = await supabase
        .from('okr_team_key_results')
        .select('id, title, team_objective_id')
        .in('id', krIds);
      const krsById = new Map<string, KrInfo>(
        (krRows || []).map((k) => [k.id, k as KrInfo]),
      );

      const initiatives = (initRows || []).map((i) => ({
        ...i,
        owner: ownerMap.get(i.owner_user_id),
      })) as Initiative[];

      return { initiatives, krsById };
    },
    enabled: isReady && !!supabase && !!currentBu?.id && krIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const filtered = useMemo(() => {
    const list = data?.initiatives ?? [];
    if (filter === 'all') return list;
    if (filter === 'overdue') {
      return list.filter(
        (i) =>
          i.status !== 'completed' &&
          !!i.expected_end_date &&
          i.expected_end_date < today,
      );
    }
    return list.filter((i) => i.status === filter);
  }, [data?.initiatives, filter, today]);

  // Contagens para os chips
  const counts = useMemo(() => {
    const list = data?.initiatives ?? [];
    const c: Record<FilterValue, number> = {
      all: list.length,
      planned: 0,
      in_progress: 0,
      blocked: 0,
      completed: 0,
      overdue: 0,
    };
    for (const i of list) {
      c[i.status as InitiativeStatus] = (c[i.status as InitiativeStatus] ?? 0) + 1;
      if (
        i.status !== 'completed' &&
        !!i.expected_end_date &&
        i.expected_end_date < today
      ) {
        c.overdue += 1;
      }
    }
    return c;
  }, [data?.initiatives, today]);

  // Agrupamento por KR
  const grouped = useMemo(() => {
    const map = new Map<string, Initiative[]>();
    for (const i of filtered) {
      const arr = map.get(i.kr_id) || [];
      arr.push(i);
      map.set(i.kr_id, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (isLoadingKrs || isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (krIds.length === 0) {
    return (
      <EmptyState
        icon={Rocket}
        title="Sem KRs no ciclo aplicado"
        description="Não há KRs do time neste ciclo, então não há iniciativas para listar."
      />
    );
  }

  if ((data?.initiatives.length ?? 0) === 0) {
    return (
      <EmptyState
        icon={Rocket}
        title="Sem iniciativas"
        description="Os KRs do time neste ciclo ainda não possuem iniciativas vinculadas."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
            <Badge
              variant="secondary"
              className="ml-2 h-4 px-1.5 text-[10px] tabular-nums"
            >
              {counts[f.value]}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Grupos por KR */}
      {grouped.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="Nenhuma iniciativa nesse filtro"
          description="Ajuste o filtro acima para ver outras iniciativas."
        />
      ) : (
        <div className="space-y-3">
          {grouped.map(([krId, items]) => {
            const kr = data?.krsById.get(krId);
            return (
              <KrInitiativesGroup
                key={krId}
                krId={krId}
                krTitle={kr?.title ?? 'KR'}
                initiatives={items}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});

interface KrInitiativesGroupProps {
  krId: string;
  krTitle: string;
  initiatives: Initiative[];
}

const KrInitiativesGroup = React.memo(function KrInitiativesGroup({
  krId,
  krTitle,
  initiatives,
}: KrInitiativesGroupProps) {
  const [open, setOpen] = useState(true);
  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {open ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
                <CardTitle className="text-sm font-medium truncate">
                  <Link
                    to={getShareableUrl('okr_team_key_result', krId)}
                    className="hover:text-accent"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {krTitle}
                  </Link>
                </CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">
                {initiatives.length} iniciativa{initiatives.length === 1 ? '' : 's'}
              </Badge>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-3 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {initiatives.map((i) => (
                <InitiativeCard key={i.id} initiative={i} />
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
});

// Re-export para satisfazer ESLint quando importado nominalmente
export { getInitiativeStatusLabel };
