/**
 * KpiSelect - Componente canônico para seleção de KPI/Métrica
 * 
 * Busca indicadores ativos da BU atual via kpi_metrics.
 * Segue o padrão de BuUserSelect.
 * 
 * Referência: Plano UI Vinculação KPI ↔ KR
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { Search, Activity, TrendingUp, TrendingDown, Equal } from "lucide-react";

// Explicit fields - never use select('*')
const KPI_SELECT_FIELDS = `
  id, 
  name, 
  unit, 
  target_value, 
  direction,
  lifecycle_status,
  indicator_type,
  area_id
` as const;

interface KpiOption {
  id: string;
  name: string;
  unit: string | null;
  target_value: number | null;
  direction: 'up' | 'down' | 'maintain' | null;
  lifecycle_status: string;
  indicator_type: string;
  area_id: string | null;
}

export interface KpiSelectProps {
  value?: string;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  /** IDs de KPIs a excluir da lista (já vinculados) */
  excludeIds?: string[];
  disabled?: boolean;
  className?: string;
  /** Filtrar por time (via área do time) */
  teamId?: string;
  /** Filtrar por área específica */
  areaId?: string;
  /** Permitir opção "Nenhum" */
  allowNone?: boolean;
  /** Label da opção "Nenhum" */
  noneLabel?: string;
  /** Mostrar campo de busca (default: true) */
  showSearch?: boolean;
}

const NONE_VALUE = "__none__";

function DirectionIcon({ direction }: { direction: string | null }) {
  switch (direction) {
    case 'up':
      return <TrendingUp className="h-3 w-3 text-success" />;
    case 'down':
      return <TrendingDown className="h-3 w-3 text-info" />;
    case 'maintain':
      return <Equal className="h-3 w-3 text-status-purple" />;
    default:
      return null;
  }
}

export function KpiSelect({
  value,
  onValueChange,
  placeholder = "Selecione um indicador",
  excludeIds = [],
  disabled = false,
  className,
  teamId,
  areaId,
  allowNone = false,
  noneLabel = "Nenhum",
  showSearch = true,
}: KpiSelectProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  
  const { client: supabase, isReady } = useOptionalBuClient();
  const { currentBuId } = useBu();

  // Query KPIs ativos da BU
  const { data: kpis = [], isLoading } = useQuery({
    queryKey: [...queryKeys.kpis.list(currentBuId ?? ''), 'select', { teamId, areaId, search }],
    queryFn: async () => {
      if (!supabase || !currentBuId) return [];
      
      let query = supabase
        .from('kpi_metrics')
        .select(KPI_SELECT_FIELDS)
        .eq('bu_id', currentBuId)
        .eq('lifecycle_status', 'active')
        .is('deleted_at', null)
        .order('name')
        .limit(100);

      // Filtro por área se especificado
      if (areaId) {
        query = query.eq('area_id', areaId);
      }

      // Filtro de busca
      if (search.trim()) {
        query = query.ilike('name', `%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[KpiSelect] Error fetching KPIs:', error);
        return [];
      }
      
      return (data || []) as KpiOption[];
    },
    enabled: isReady && !!supabase && !!currentBuId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  // Query para buscar o KPI selecionado caso não esteja na lista
  const { data: selectedKpi } = useQuery({
    queryKey: [...queryKeys.kpis.detail(value ?? ''), 'selected'],
    queryFn: async () => {
      if (!supabase || !value || value === NONE_VALUE) return null;
      
      const { data, error } = await supabase
        .from('kpi_metrics')
        .select(KPI_SELECT_FIELDS)
        .eq('id', value)
        .maybeSingle();
        
      if (error) {
        console.error('[KpiSelect] Error fetching selected KPI:', error);
        return null;
      }
      
      return data as KpiOption | null;
    },
    enabled: isReady && !!supabase && !!value && value !== NONE_VALUE,
    staleTime: 5 * 60 * 1000,
  });

  const filteredKpis = useMemo(() => {
    return kpis.filter((k) => !excludeIds.includes(k.id));
  }, [kpis, excludeIds]);

  // Use KPI da lista se disponível, senão da query separada
  const displayedKpi = useMemo(() => {
    return kpis.find((k) => k.id === value) ?? selectedKpi ?? null;
  }, [kpis, value, selectedKpi]);
  
  const selectValue = allowNone && !value ? NONE_VALUE : value;
  
  const handleValueChange = (val: string) => {
    if (val === NONE_VALUE) {
      onValueChange(null);
    } else {
      onValueChange(val);
    }
    setOpen(false);
  };

  return (
    <Select
      value={selectValue}
      onValueChange={handleValueChange}
      disabled={disabled || isLoading}
      open={open}
      onOpenChange={setOpen}
    >
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder}>
          {selectValue === NONE_VALUE ? (
            <span className="text-muted-foreground">{noneLabel}</span>
          ) : displayedKpi ? (
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{displayedKpi.name}</span>
              {displayedKpi.unit && (
                <span className="text-xs text-muted-foreground">({displayedKpi.unit})</span>
              )}
            </div>
          ) : value ? (
            // Loading state: KPI ID exists but data not loaded yet
            <div className="flex items-center gap-2 text-muted-foreground">
              <Activity className="h-4 w-4 animate-pulse flex-shrink-0" />
              <span className="truncate">Carregando...</span>
            </div>
          ) : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent onCloseAutoFocus={(e) => e.preventDefault()}>
        {showSearch && (
          <div className="p-2 border-b sticky top-0 bg-popover z-10">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar indicador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="pl-8 h-9"
              />
            </div>
          </div>
        )}
        <ScrollArea className="h-[250px]">
          {/* Opção "Nenhum" */}
          {allowNone && (
            <SelectItem
              value={NONE_VALUE}
              className={cn(
                "cursor-pointer py-2",
                "focus:bg-primary/10 focus:text-foreground",
                "data-[highlighted]:bg-primary/10 data-[highlighted]:text-foreground",
                "data-[state=checked]:bg-primary/10 data-[state=checked]:text-foreground"
              )}
            >
              <span className="text-muted-foreground">{noneLabel}</span>
            </SelectItem>
          )}
          
          {filteredKpis.length === 0 && !allowNone ? (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <Activity className="h-8 w-8 mb-2" />
              <span className="text-sm">
                {search ? "Nenhum indicador encontrado" : "Nenhum indicador disponível"}
              </span>
            </div>
          ) : (
            filteredKpis.map((kpi) => (
              <SelectItem
                key={kpi.id}
                value={kpi.id}
                className={cn(
                  "cursor-pointer py-2",
                  "focus:bg-primary/10 focus:text-foreground",
                  "data-[highlighted]:bg-primary/10 data-[highlighted]:text-foreground",
                  "data-[state=checked]:bg-primary/10 data-[state=checked]:text-foreground"
                )}
              >
                <div className="flex items-center gap-2 w-full">
                  <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm">{kpi.name}</span>
                      <DirectionIcon direction={kpi.direction} />
                      {kpi.indicator_type === 'kpi' && (
                        <Badge variant="outline" className="h-4 px-1 text-[10px]">
                          KPI
                        </Badge>
                      )}
                    </div>
                    {kpi.unit && (
                      <span className="text-xs text-muted-foreground truncate">
                        Unidade: {kpi.unit}
                        {kpi.target_value !== null && ` • Meta: ${kpi.target_value}`}
                      </span>
                    )}
                  </div>
                </div>
              </SelectItem>
            ))
          )}
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}
