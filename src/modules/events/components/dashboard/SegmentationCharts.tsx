/**
 * SegmentationCharts — Donut charts for location, job title, company type
 * Clicking any chart slice navigates to /events/participants
 * Uses PARTICIPANTS_FULL_MOCK (925 registrations) for consistency with dashboard KPIs.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { PARTICIPANTS_FULL_MOCK } from "../../mocks/participantsFull";
import { useEventsContext } from "../../context/EventsContext";
import { JOURNEYS_MOCK } from "../../mocks/events";

const COLORS = [
  "hsl(210, 80%, 45%)", "hsl(210, 80%, 65%)", "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)", "hsl(0, 72%, 55%)", "hsl(280, 60%, 55%)",
  "hsl(180, 50%, 45%)", "hsl(330, 60%, 55%)", "hsl(60, 70%, 45%)",
  "hsl(120, 40%, 50%)",
];

function countBy<T>(arr: T[], key: (item: T) => string): { name: string; value: number }[] {
  const map = new Map<string, number>();
  arr.forEach((item) => {
    const k = key(item);
    map.set(k, (map.get(k) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function DonutChart({ data, title, tooltip, actions, onSliceClick }: { data: { name: string; value: number }[]; title: string; tooltip?: string; actions?: React.ReactNode; onSliceClick?: () => void }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
           <CardTitle className="text-sm font-semibold">
              {title}
              {tooltip && <HelpTooltip content={tooltip} size="sm" />}
            </CardTitle>
          {actions}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              dataKey="value"
              paddingAngle={2}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
              style={{ fontSize: 9, cursor: onSliceClick ? "pointer" : undefined }}
              onClick={onSliceClick}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} className={onSliceClick ? "cursor-pointer" : ""} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function SegmentationCharts() {
  const navigate = useNavigate();
  const { filters } = useEventsContext();
  const [selectedUf, setSelectedUf] = useState<string>("all");

  // Filter participants by scope (same logic as participants page)
  const scopeFiltered = useMemo(() => {
    let data = PARTICIPANTS_FULL_MOCK.filter((p) => p.year === filters.year);
    if (filters.scope === "event" && filters.selectedEventId) {
      data = data.filter((p) => p.eventIds.includes(filters.selectedEventId!));
    }
    if (filters.scope === "journey" && filters.selectedJourneyId) {
      const journey = JOURNEYS_MOCK.find((j) => j.id === filters.selectedJourneyId);
      if (journey) {
        data = data.filter((p) => p.eventIds.some((eid) => journey.eventIds.includes(eid)));
      }
    }
    return data;
  }, [filters]);

  /** Unique UFs from filtered data */
  const ALL_UFS = useMemo(() => Array.from(new Set(scopeFiltered.map((p) => p.uf))).sort(), [scopeFiltered]);

  const filtered = selectedUf === "all"
    ? scopeFiltered
    : scopeFiltered.filter((p) => p.uf === selectedUf);

  const locationData = selectedUf === "all"
    ? countBy(filtered, (p) => p.uf)
    : countBy(filtered, (p) => p.city);

  const byJob = countBy(filtered, (p) => p.jobTitle);
  const byCompany = countBy(filtered, (p) => p.companyType);

  const ufFilter = (
    <Select value={selectedUf} onValueChange={setSelectedUf}>
      <SelectTrigger className="h-7 w-[110px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas UFs</SelectItem>
        {ALL_UFS.map((uf) => (
          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const goToParticipants = () => navigate("/events/participants");

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <DonutChart data={locationData} title="Distribuição por localidade" tooltip="Distribuição geográfica dos participantes por UF ou cidade. Use o filtro para detalhar por estado." actions={ufFilter} onSliceClick={goToParticipants} />
      <DonutChart data={byJob} title="Distribuição por Cargo" tooltip="Perfil dos participantes por cargo/função, indicando o nível hierárquico e poder de decisão do público." onSliceClick={goToParticipants} />
      <DonutChart data={byCompany} title="Distribuição por Tipo de Empresa" tooltip="Segmentação dos participantes por tipo de empresa (imobiliária, incorporadora, etc.), útil para entender o perfil do mercado." onSliceClick={goToParticipants} />
    </div>
  );
}
