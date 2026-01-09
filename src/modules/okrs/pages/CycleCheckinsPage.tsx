/**
 * CycleCheckinsPage - Página consolidada de check-ins do ciclo
 * 
 * Visão gerencial de todos os check-ins de um ciclo de OKRs
 * com tabs: Feed, Pendências, Resumo
 */

import { useMemo } from 'react';
import { HubLayout } from '@/components/layout/HubLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ListChecks,
  Users,
  Activity,
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUrlState, useUrlStates, useUrlTab, parsers } from '@/shared/url';
import { idConfig, searchConfig, paginationSchema } from '@/shared/url/schemas';
import { useCycles, useActiveCycles } from '../hooks/useCycleData';
import { useCycleCheckins, CycleCheckinsFilters } from '../hooks/useCycleCheckins';
import { CycleCheckinsFeed } from '../components/cycle-checkins/CycleCheckinsFeed';
import { CycleCheckinsOverdue } from '../components/cycle-checkins/CycleCheckinsOverdue';
import { CycleCheckinsSummary } from '../components/cycle-checkins/CycleCheckinsSummary';
import { CycleCheckinsFilters as FiltersBar } from '../components/cycle-checkins/CycleCheckinsFilters';
import { cn } from '@/lib/utils';

type CheckinsTab = 'feed' | 'pending' | 'summary';

export default function CycleCheckinsPage() {
  usePageTitle("Check-ins do Ciclo");
  
  // Cycles data
  const { data: allCycles, isLoading: cyclesLoading } = useCycles();
  const { data: activeCycles } = useActiveCycles();
  
  // Default to first active cycle
  const defaultCycleId = activeCycles?.[0]?.id || '';
  
  // URL State - Cycle ID
  const cycleIdState = useUrlState<string>({
    key: 'cycle_id',
    defaultValue: defaultCycleId,
    parse: parsers.string,
  });
  
  // Use the URL value or fall back to default
  const selectedCycleId = cycleIdState.value || defaultCycleId;
  
  // URL State - Tab
  const [activeTab, setActiveTab] = useUrlTab<CheckinsTab>('feed', 'tab');
  
  // URL State - Filters
  const filtersResult = useUrlStates({
    teamId: { key: 'team_id', defaultValue: '', parse: parsers.string },
    ownerId: { key: 'owner_id', defaultValue: '', parse: parsers.string },
    confidence: { key: 'confidence', defaultValue: 'all', parse: parsers.string },
    ragStatus: { key: 'status', defaultValue: 'all', parse: parsers.string },
    dateFrom: { key: 'date_from', defaultValue: '', parse: parsers.string },
    dateTo: { key: 'date_to', defaultValue: '', parse: parsers.string },
    onlyOverdue: { key: 'only_overdue', defaultValue: false, parse: parsers.boolean },
    search: { key: 'q', defaultValue: '', parse: parsers.string },
    page: { key: 'page', defaultValue: 1, parse: parsers.number },
    pageSize: { key: 'page_size', defaultValue: 20, parse: parsers.number },
  });
  
  const filters = filtersResult.values;
  
  // Build filters for hook
  const hookFilters: CycleCheckinsFilters = useMemo(() => ({
    teamId: filters.teamId || undefined,
    ownerId: filters.ownerId || undefined,
    confidence: filters.confidence as CycleCheckinsFilters['confidence'],
    ragStatus: filters.ragStatus as CycleCheckinsFilters['ragStatus'],
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    onlyOverdue: filters.onlyOverdue,
    search: filters.search || undefined,
    page: filters.page,
    pageSize: filters.pageSize,
  }), [filters]);
  
  // Fetch check-ins data
  const { 
    data: checkinsData, 
    isLoading: checkinsLoading,
    error: checkinsError,
  } = useCycleCheckins(selectedCycleId, hookFilters);
  
  const aggregates = checkinsData?.aggregates;
  const checkins = checkinsData?.checkins || [];
  const overdueKrs = checkinsData?.overdue_krs || [];
  const pagination = checkinsData?.pagination;
  
  // Selected cycle info
  const selectedCycle = useMemo(() => 
    allCycles?.find(c => c.id === selectedCycleId),
    [allCycles, selectedCycleId]
  );
  
  // Handle cycle change
  const handleCycleChange = (cycleId: string) => {
    cycleIdState.set(cycleId);
    // Reset page when changing cycle
    filtersResult.set({ ...filters, page: 1 });
  };
  
  // Handle filter changes
  const handleFiltersChange = (newFilters: Partial<typeof filters>) => {
    filtersResult.set({ ...filters, ...newFilters, page: 1 });
  };
  
  // Handle page change
  const handlePageChange = (page: number) => {
    filtersResult.set({ ...filters, page });
  };
  
  // Handle team filter from summary click
  const handleTeamFilter = (teamId: string) => {
    filtersResult.set({ ...filters, teamId, page: 1 });
    setActiveTab('feed');
  };
  
  // Clear all filters
  const handleClearFilters = () => {
    filtersResult.resetAll();
  };

  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Check-ins do Ciclo</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Visão consolidada de todos os check-ins do ciclo
            </p>
          </div>
          
          {/* Cycle Selector */}
          <div className="w-full sm:w-64">
            {cyclesLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select 
                value={selectedCycleId} 
                onValueChange={handleCycleChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um ciclo" />
                </SelectTrigger>
                <SelectContent>
                  {allCycles?.map((cycle) => (
                    <SelectItem key={cycle.id} value={cycle.id}>
                      <div className="flex items-center gap-2">
                        {cycle.name}
                        {activeCycles?.some(ac => ac.id === cycle.id) && (
                          <Badge variant="secondary" className="text-xs">
                            Ativo
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            title="KRs em Dia"
            value={aggregates?.krs_on_track_percent ?? 0}
            suffix="%"
            description={`${aggregates?.krs_with_recent_checkin ?? 0} de ${aggregates?.total_krs ?? 0} KRs`}
            icon={CheckCircle2}
            loading={checkinsLoading}
            variant={
              (aggregates?.krs_on_track_percent ?? 0) >= 80 ? 'success' : 
              (aggregates?.krs_on_track_percent ?? 0) >= 50 ? 'warning' : 'danger'
            }
          />
          <SummaryCard
            title="Total de Check-ins"
            value={aggregates?.total_checkins ?? 0}
            description="no período do ciclo"
            icon={Activity}
            loading={checkinsLoading}
          />
          <SummaryCard
            title="KRs em Atraso"
            value={aggregates?.krs_overdue_count ?? 0}
            description="sem check-in há mais de 7 dias"
            icon={AlertTriangle}
            loading={checkinsLoading}
            variant={(aggregates?.krs_overdue_count ?? 0) > 0 ? 'danger' : 'success'}
          />
        </div>
        
        {/* Filters */}
        <FiltersBar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
          hasActiveFilters={filtersResult.hasActiveFilters}
        />
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CheckinsTab)}>
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="feed" className="gap-2">
              <ListChecks className="h-4 w-4" />
              <span className="hidden sm:inline">Feed</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Pendências</span>
              {(aggregates?.krs_overdue_count ?? 0) > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                  {aggregates?.krs_overdue_count}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Resumo</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="feed" className="mt-6">
            <CycleCheckinsFeed
              checkins={checkins}
              isLoading={checkinsLoading}
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          </TabsContent>
          
          <TabsContent value="pending" className="mt-6">
            <CycleCheckinsOverdue
              overdueKrs={overdueKrs}
              isLoading={checkinsLoading}
            />
          </TabsContent>
          
          <TabsContent value="summary" className="mt-6">
            <CycleCheckinsSummary
              cycleId={selectedCycleId}
              onTeamClick={handleTeamFilter}
            />
          </TabsContent>
        </Tabs>
      </div>
    </HubLayout>
  );
}

// ============================================================
// Summary Card Component
// ============================================================

interface SummaryCardProps {
  title: string;
  value: number;
  suffix?: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

function SummaryCard({ 
  title, 
  value, 
  suffix = '', 
  description, 
  icon: Icon, 
  loading,
  variant = 'default',
}: SummaryCardProps) {
  const variantStyles = {
    default: 'text-foreground',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    danger: 'text-red-600 dark:text-red-400',
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <>
            <Skeleton className="h-8 w-20 mb-1" />
            <Skeleton className="h-4 w-32" />
          </>
        ) : (
          <>
            <div className={cn("text-2xl font-bold", variantStyles[variant])}>
              {value}{suffix}
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
