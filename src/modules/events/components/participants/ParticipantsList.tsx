/**
 * ParticipantsList — List of participants with search
 */
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { PARTICIPANTS_MOCK } from "../../mocks/participants";

export function ParticipantsList() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return PARTICIPANTS_MOCK;
    const s = search.toLowerCase();
    return PARTICIPANTS_MOCK.filter(
      (p) =>
        p.fullName.toLowerCase().includes(s) ||
        p.companyName.toLowerCase().includes(s) ||
        p.city.toLowerCase().includes(s) ||
        p.email.toLowerCase().includes(s)
    );
  }, [search]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-sm font-semibold">Participantes ({filtered.length})</CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar participante..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 w-[250px] text-sm"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Nome</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Empresa</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Cargo</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Cidade/UF</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Atuação</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Código</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2.5 px-3">
                    <Link to={`/events/participants/${p.id}`} className="font-medium text-primary hover:underline">
                      {p.fullName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-muted-foreground">{p.companyName}</span>
                    {p.companyDomain && (
                      <p className="text-[11px] text-muted-foreground/60 font-mono">{p.companyDomain}</p>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground">{p.jobTitle}</td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground">{p.city}/{p.uf}</td>
                  <td className="py-2.5 px-3">
                    <Badge variant="secondary" className="text-[10px]">{p.operationArea}</Badge>
                  </td>
                  <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground">{p.code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
