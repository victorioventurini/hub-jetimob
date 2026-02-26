/**
 * OpportunitiesList — Table with filters
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { useEventsContext } from "../../context/EventsContext";
import { PARTICIPANTS_MOCK } from "../../mocks/participants";
import { EVENTS_MOCK } from "../../mocks/events";
import { OpportunityExportCsv } from "./OpportunityExportCsv";

const participantMap = new Map(PARTICIPANTS_MOCK.map((p) => [p.id, p]));
const eventMap = new Map(EVENTS_MOCK.map((e) => [e.id, e]));

function fitColor(score: number) {
  if (score >= 80) return "bg-emerald-100 text-emerald-800";
  if (score >= 60) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

export function OpportunitiesList() {
  const { opportunities } = useEventsContext();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return opportunities;
    const s = search.toLowerCase();
    return opportunities.filter((opp) => {
      const p = participantMap.get(opp.participantId);
      return (
        p?.fullName.toLowerCase().includes(s) ||
        p?.companyName.toLowerCase().includes(s) ||
        opp.areasOfInterest.some((a) => a.toLowerCase().includes(s))
      );
    });
  }, [opportunities, search]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-sm font-semibold">Oportunidades ({filtered.length})</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 w-[200px] text-sm"
              />
            </div>
            <OpportunityExportCsv opportunities={filtered} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Participante</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Empresa</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Evento</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Áreas</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Fit</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Data</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((opp) => {
                const p = participantMap.get(opp.participantId);
                const e = eventMap.get(opp.eventId);
                return (
                  <tr key={opp.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2.5 px-3">
                      <div>
                        <p className="font-medium text-foreground">{p?.fullName ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{p?.email}</p>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{p?.companyName ?? "—"}</td>
                    <td className="py-2.5 px-3 text-muted-foreground text-xs">{e?.name.replace("Jet Experience ", "") ?? "—"}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {opp.areasOfInterest.slice(0, 2).map((a) => (
                          <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>
                        ))}
                        {opp.areasOfInterest.length > 2 && (
                          <Badge variant="outline" className="text-[10px]">+{opp.areasOfInterest.length - 2}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge className={`text-[10px] ${fitColor(opp.fitScore)}`}>{opp.fitScore}%</Badge>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground">
                      {new Date(opp.capturedAt).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nenhuma oportunidade encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
