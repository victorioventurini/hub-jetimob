/**
 * ParticipantsFullList — Full participants list with segment tabs, fit column, search
 */
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ListPageFilters } from "@/components/ui/list-page-filters";
import { ArrowDownWideNarrow, Flame, TrendingUp, Minus } from "lucide-react";
import {
  PARTICIPANTS_FULL_MOCK,
  FIT_HIGH_THRESHOLD,
  type ParticipantFull,
} from "../../mocks/participantsFull";
import { useEventsContext } from "../../context/EventsContext";
import { JOURNEYS_MOCK } from "../../mocks/events";

type SegmentTab = "inscritos" | "participantes" | "oportunidades" | "fit_alto";

const SEGMENT_TABS: { value: SegmentTab; label: string }[] = [
  { value: "inscritos", label: "Inscritos" },
  { value: "participantes", label: "Participantes" },
  { value: "oportunidades", label: "Oportunidades" },
  { value: "fit_alto", label: "Fit alto" },
];

function FitBadge({ score, label }: { score: number; label: string }) {
  const config = {
    alto: { variant: "default" as const, icon: Flame, className: "bg-emerald-600 hover:bg-emerald-700 text-white" },
    medio: { variant: "secondary" as const, icon: TrendingUp, className: "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200" },
    baixo: { variant: "outline" as const, icon: Minus, className: "text-muted-foreground" },
  }[label] ?? { variant: "outline" as const, icon: Minus, className: "" };

  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs font-semibold tabular-nums w-7 text-right">{score}</span>
      <Badge variant={config.variant} className={`text-[10px] gap-1 ${config.className}`}>
        <Icon className="h-3 w-3" />
        {label.charAt(0).toUpperCase() + label.slice(1)}
      </Badge>
    </div>
  );
}

export function ParticipantsFullList() {
  const { filters } = useEventsContext();
  const [segment, setSegment] = useState<SegmentTab>("inscritos");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let data: ParticipantFull[] = PARTICIPANTS_FULL_MOCK;

    // Year filter
    data = data.filter((p) => p.year === filters.year);

    // Scope filter: event or journey
    if (filters.scope === "event" && filters.selectedEventId) {
      data = data.filter((p) => p.eventIds.includes(filters.selectedEventId!));
    }
    if (filters.scope === "journey" && filters.selectedJourneyId) {
      const journey = JOURNEYS_MOCK.find((j) => j.id === filters.selectedJourneyId);
      if (journey) {
        data = data.filter((p) => p.eventIds.some((eid) => journey.eventIds.includes(eid)));
      }
    }

    // Segment tabs
    switch (segment) {
      case "participantes":
        data = data.filter((p) => p.statusInscricao === "participante");
        break;
      case "oportunidades":
        data = data.filter((p) => p.oportunidadesCount > 0);
        break;
      case "fit_alto":
        data = data.filter((p) => p.fitScore >= FIT_HIGH_THRESHOLD);
        break;
      // "inscritos" = all
    }

    // Search
    if (search) {
      const s = search.toLowerCase();
      data = data.filter(
        (p) =>
          p.fullName.toLowerCase().includes(s) ||
          p.email.toLowerCase().includes(s) ||
          p.companyName.toLowerCase().includes(s)
      );
    }

    // Sort by fit desc
    return [...data].sort((a, b) => b.fitScore - a.fitScore);
  }, [filters, segment, search]);

  const counts = useMemo(() => {
    let base = PARTICIPANTS_FULL_MOCK.filter((p) => p.year === filters.year);
    if (filters.scope === "event" && filters.selectedEventId) {
      base = base.filter((p) => p.eventIds.includes(filters.selectedEventId!));
    }
    if (filters.scope === "journey" && filters.selectedJourneyId) {
      const journey = JOURNEYS_MOCK.find((j) => j.id === filters.selectedJourneyId);
      if (journey) {
        base = base.filter((p) => p.eventIds.some((eid) => journey.eventIds.includes(eid)));
      }
    }
    return {
      inscritos: base.length,
      participantes: base.filter((p) => p.statusInscricao === "participante").length,
      oportunidades: base.filter((p) => p.oportunidadesCount > 0).length,
      fit_alto: base.filter((p) => p.fitScore >= FIT_HIGH_THRESHOLD).length,
    };
  }, [filters]);

  return (
    <div className="space-y-4">
      {/* Segment tabs */}
      <Tabs value={segment} onValueChange={(v) => setSegment(v as SegmentTab)}>
        <TabsList className="h-9">
          {SEGMENT_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs gap-1.5">
              {tab.label}
              <span className="text-[10px] text-muted-foreground font-normal">
                ({counts[tab.value]})
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search */}
      <ListPageFilters
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome, email ou empresa..."
      />

      {/* Results count */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ArrowDownWideNarrow className="h-3.5 w-3.5" />
        <span>{filtered.length} resultado{filtered.length !== 1 ? "s" : ""} · ordenado por Fit ↓</span>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Nome</TableHead>
              <TableHead className="text-xs">Cidade/UF</TableHead>
              <TableHead className="text-xs">Cargo</TableHead>
              <TableHead className="text-xs">Tipo empresa</TableHead>
              <TableHead className="text-xs">Atua com</TableHead>
              <TableHead className="text-xs">Fit</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs text-right">Oport.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhum participante encontrado.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div>
                    <span className="font-medium text-sm">{p.fullName}</span>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.city}/{p.uf}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.jobTitle}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.companyType}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-[10px]">{p.operationArea}</Badge>
                </TableCell>
                <TableCell>
                  <FitBadge score={p.fitScore} label={p.fitLabel} />
                </TableCell>
                <TableCell>
                  <Badge
                    variant={p.statusInscricao === "participante" ? "default" : "outline"}
                    className="text-[10px]"
                  >
                    {p.statusInscricao === "participante" ? "Participante" : "Inscrito"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {p.oportunidadesCount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
