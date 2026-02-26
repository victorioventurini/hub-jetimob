/**
 * ParticipantsFullList — Full participants list with segment tabs, fit column, search + filters
 * Follows Hub canonical pattern: ListPageFilters + ViewOptionsBar + Table
 */
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListPageFilters } from "@/components/ui/list-page-filters";
import { ViewOptionsBar } from "@/components/ui/view-options-bar";
import { Flame, TrendingUp, Minus } from "lucide-react";
import {
  PARTICIPANTS_FULL_MOCK,
  FIT_HIGH_THRESHOLD,
  type ParticipantFull,
} from "../../mocks/participantsFull";
import { useEventsContext } from "../../context/EventsContext";
import { JOURNEYS_MOCK } from "../../mocks/events";

type SegmentTab = "inscritos" | "participantes" | "oportunidades" | "fit_alto";
type FitRange = "all" | "0-25" | "26-50" | "51-75" | "76-100";

const SEGMENT_TABS: { value: SegmentTab; label: string }[] = [
  { value: "inscritos", label: "Inscritos" },
  { value: "participantes", label: "Participantes" },
  { value: "oportunidades", label: "Oportunidades" },
  { value: "fit_alto", label: "Fit alto" },
];

const FIT_RANGES: { value: FitRange; label: string }[] = [
  { value: "all", label: "Todos os fits" },
  { value: "0-25", label: "0 – 25" },
  { value: "26-50", label: "26 – 50" },
  { value: "51-75", label: "51 – 75" },
  { value: "76-100", label: "76 – 100" },
];

const OPERATION_AREAS: { value: string; label: string }[] = [
  { value: "all", label: "Todas as atuações" },
  { value: "vendas", label: "Vendas" },
  { value: "aluguéis", label: "Aluguéis" },
  { value: "vendas e aluguéis", label: "Vendas e aluguéis" },
];

const COMPANY_TYPES: { value: string; label: string }[] = [
  { value: "all", label: "Todos os tipos" },
  { value: "Imobiliária", label: "Imobiliária" },
  { value: "Incorporadora", label: "Incorporadora" },
  { value: "Loteadora", label: "Loteadora" },
  { value: "Agência de marketing", label: "Agência de marketing" },
  { value: "Empresa de tecnologia", label: "Empresa de tecnologia" },
  { value: "Outros", label: "Outros" },
];

const JOB_TITLES: { value: string; label: string }[] = [
  { value: "all", label: "Todos os cargos" },
  { value: "Corretor autônomo", label: "Corretor autônomo" },
  { value: "Gerente de vendas", label: "Gerente de vendas" },
  { value: "Gerente de aluguéis", label: "Gerente de aluguéis" },
  { value: "Diretor geral", label: "Diretor geral" },
  { value: "Assistente de locações", label: "Assistente de locações" },
  { value: "Analista de marketing", label: "Analista de marketing" },
  { value: "Gerente de marketing", label: "Gerente de marketing" },
  { value: "Outros", label: "Outros" },
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

/** Extract unique sorted values from participants */
function uniqueValues(data: ParticipantFull[], key: "city" | "uf"): string[] {
  return [...new Set(data.map((p) => p[key]))].sort();
}

export function ParticipantsFullList() {
  const { filters } = useEventsContext();
  const [segment, setSegment] = useState<SegmentTab>("inscritos");
  const [search, setSearch] = useState("");

  // Filter state
  const [fitRange, setFitRange] = useState<FitRange>("all");
  const [operationArea, setOperationArea] = useState("all");
  const [companyType, setCompanyType] = useState("all");
  const [jobTitle, setJobTitle] = useState("all");
  const [city, setCity] = useState("all");
  const [uf, setUf] = useState("all");
  const [status, setStatus] = useState("all");

  // Derive city/uf options from data
  const allCities = useMemo(() => uniqueValues(PARTICIPANTS_FULL_MOCK, "city"), []);
  const allUfs = useMemo(() => uniqueValues(PARTICIPANTS_FULL_MOCK, "uf"), []);

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
    }

    // Inline filters
    if (operationArea !== "all") data = data.filter((p) => p.operationArea === operationArea);
    if (companyType !== "all") data = data.filter((p) => p.companyType === companyType);
    if (jobTitle !== "all") data = data.filter((p) => p.jobTitle === jobTitle);
    if (city !== "all") data = data.filter((p) => p.city === city);
    if (uf !== "all") data = data.filter((p) => p.uf === uf);
    if (status !== "all") data = data.filter((p) => p.statusInscricao === status);

    if (fitRange !== "all") {
      const [min, max] = fitRange.split("-").map(Number);
      data = data.filter((p) => p.fitScore >= min && p.fitScore <= max);
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
  }, [filters, segment, search, fitRange, operationArea, companyType, jobTitle, city, uf, status]);

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
    <div className="space-y-6">
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

      {/* Search + Filters (canonical ListPageFilters) */}
      <ListPageFilters
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome, email ou empresa..."
      >
        <Select value={operationArea} onValueChange={setOperationArea}>
          <SelectTrigger className="h-9 w-[160px] text-xs">
            <SelectValue placeholder="Atua com" />
          </SelectTrigger>
          <SelectContent>
            {OPERATION_AREAS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={fitRange} onValueChange={(v) => setFitRange(v as FitRange)}>
          <SelectTrigger className="h-9 w-[130px] text-xs">
            <SelectValue placeholder="Fit" />
          </SelectTrigger>
          <SelectContent>
            {FIT_RANGES.map((f) => (
              <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={companyType} onValueChange={setCompanyType}>
          <SelectTrigger className="h-9 w-[180px] text-xs">
            <SelectValue placeholder="Tipo empresa" />
          </SelectTrigger>
          <SelectContent>
            {COMPANY_TYPES.map((c) => (
              <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={jobTitle} onValueChange={setJobTitle}>
          <SelectTrigger className="h-9 w-[180px] text-xs">
            <SelectValue placeholder="Cargo" />
          </SelectTrigger>
          <SelectContent>
            {JOB_TITLES.map((j) => (
              <SelectItem key={j.value} value={j.value} className="text-xs">{j.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="h-9 w-[160px] text-xs">
            <SelectValue placeholder="Cidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Todas as cidades</SelectItem>
            {allCities.map((c) => (
              <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={uf} onValueChange={setUf}>
          <SelectTrigger className="h-9 w-[100px] text-xs">
            <SelectValue placeholder="UF" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Todos os UFs</SelectItem>
            {allUfs.map((u) => (
              <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[140px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Todos os status</SelectItem>
            <SelectItem value="inscrito" className="text-xs">Inscrito</SelectItem>
            <SelectItem value="participante" className="text-xs">Participante</SelectItem>
          </SelectContent>
        </Select>
      </ListPageFilters>

      {/* Canonical ViewOptionsBar with result count */}
      <ViewOptionsBar
        resultCount={filtered.length}
        resultCountLabel="participantes encontrados"
        resultCountLabelSingular="participante encontrado"
      />

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Nome</TableHead>
              <TableHead className="text-xs">Cidade/UF</TableHead>
              <TableHead className="text-xs">Cargo</TableHead>
              <TableHead className="text-xs">Tipo empresa</TableHead>
              <TableHead className="text-xs">Nome empresa</TableHead>
              <TableHead className="text-xs">Atua com</TableHead>
              <TableHead className="text-xs">Fit</TableHead>
              <TableHead className="text-xs">Status</TableHead>
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
                    <p className="text-xs text-muted-foreground">{p.phone}</p>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.city}/{p.uf}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.jobTitle}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.jobTitle === "Corretor autônomo" ? "" : p.companyType}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {p.jobTitle === "Corretor autônomo" ? "" : p.companyName}
                </TableCell>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
