/**
 * ScopeFilter — Ano + Evento/Jornada selector
 */
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { YearSelect } from "@/components/selects";
import { useEventsContext } from "../../context/EventsContext";
import { EVENTS_MOCK, JOURNEYS_MOCK } from "../../mocks/events";
import type { EventScope } from "../../types";

const AVAILABLE_YEARS = [2026];

export function ScopeFilter() {
  const { filters, setFilters } = useEventsContext();

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <YearSelect
        value={filters.year}
        onValueChange={(y) => setFilters({ ...filters, year: y })}
        years={AVAILABLE_YEARS}
        triggerClassName="h-9 text-xs"
      />

      <Tabs
        value={filters.scope}
        onValueChange={(v) => setFilters({ ...filters, scope: v as EventScope, selectedEventId: undefined, selectedJourneyId: undefined })}
      >
        <TabsList className="h-9">
          <TabsTrigger value="event" className="text-xs">Evento</TabsTrigger>
          <TabsTrigger value="journey" className="text-xs">Jornada</TabsTrigger>
        </TabsList>
      </Tabs>

      {filters.scope === "event" && (
        <Select
          value={filters.selectedEventId ?? ""}
          onValueChange={(v) => setFilters({ ...filters, selectedEventId: v })}
        >
          <SelectTrigger className="w-[320px] h-9 text-xs">
            <SelectValue placeholder="Selecione o evento" />
          </SelectTrigger>
          <SelectContent>
            {EVENTS_MOCK.map((e) => (
              <SelectItem key={e.id} value={e.id} className="text-xs">{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {filters.scope === "journey" && (
        <Select
          value={filters.selectedJourneyId ?? ""}
          onValueChange={(v) => setFilters({ ...filters, selectedJourneyId: v })}
        >
          <SelectTrigger className="w-[300px] h-9 text-xs">
            <SelectValue placeholder="Selecione a jornada" />
          </SelectTrigger>
          <SelectContent>
            {JOURNEYS_MOCK.map((j) => (
              <SelectItem key={j.id} value={j.id} className="text-xs">{j.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
