import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageTitle } from "@/hooks/usePageTitle";

const queryKeys = {
  overview: ["internal-directory", "overview"] as const,
  users: (search: string) => ["internal-directory", "users", search] as const,
  bus: ["internal-directory", "bus"] as const,
  areas: ["internal-directory", "areas"] as const,
  teams: ["internal-directory", "teams"] as const,
};

function OverviewTab() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.overview,
    queryFn: async () => {
      const [users, active, bus, areas, teams, multi] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("profiles").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("employment_status", "active"),
        supabase.from("bu_units").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("areas").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("teams").select("id", { count: "exact", head: true }).is("deleted_at", null),
        // Multi-BU: contagem feita client-side a partir de bu_user_memberships
        supabase
          .from("bu_user_memberships")
          .select("profile_id")
          .is("deleted_at", null)
          .then((r) => {
            const counts = new Map<string, number>();
            for (const m of r.data ?? []) {
              if (!m.profile_id) continue;
              counts.set(m.profile_id, (counts.get(m.profile_id) ?? 0) + 1);
            }
            let multi = 0;
            counts.forEach((c) => { if (c > 1) multi++; });
            return { count: multi };
          }),
      ]);
      return {
        users: users.count ?? 0,
        active: active.count ?? 0,
        bus: bus.count ?? 0,
        areas: areas.count ?? 0,
        teams: teams.count ?? 0,
        multi: multi.count,
      };
    },
  });

  const cards = [
    { label: "Usuários totais", value: data?.users },
    { label: "Usuários ativos", value: data?.active },
    { label: "Business Units ativas", value: data?.bus },
    { label: "Áreas", value: data?.areas },
    { label: "Times", value: data?.teams },
    { label: "Multi-BU", value: data?.multi },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">
              {c.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-semibold">{c.value ?? 0}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function UsersTab() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.users(search),
    queryFn: async () => {
      let q = supabase
        .from("profiles")
        .select(
          "id, display_name, email, work_email, employment_status, bu_id, photo_url, bu_units!profiles_bu_id_fkey(name)",
        )
        .is("deleted_at", null)
        .order("display_name")
        .limit(100);
      if (search) q = q.or(`display_name.ilike.%${search}%,email.ilike.%${search}%,work_email.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <Input
        placeholder="Buscar por nome ou e-mail…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>BU primária</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            ) : (
              (data ?? []).map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.display_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.email ?? u.work_email ?? "—"}
                  </TableCell>
                  <TableCell>{u.bu_units?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={u.employment_status === "active" ? "default" : "secondary"}>
                      {u.employment_status ?? "—"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function BusTab() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.bus,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bu_units")
        .select("id, name, slug, status, legal_entity, allowed_email_domains")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Razão social</TableHead>
            <TableHead>Domínios</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
          ) : (
            (data ?? []).map((b: any) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell><code className="text-xs">{b.slug}</code></TableCell>
                <TableCell>{b.legal_entity ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {(b.allowed_email_domains ?? []).join(", ") || "—"}
                </TableCell>
                <TableCell><Badge>{b.status}</Badge></TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

function AreasTeamsTab() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.areas,
    queryFn: async () => {
      const [areas, teams] = await Promise.all([
        supabase.from("areas").select("id, name, slug, bu_id, bu_units(name)").is("deleted_at", null).order("name"),
        supabase.from("teams").select("id, name, slug, bu_id, area_id, areas(name), bu_units(name)").is("deleted_at", null).order("name"),
      ]);
      if (areas.error) throw areas.error;
      if (teams.error) throw teams.error;
      return { areas: areas.data ?? [], teams: teams.data ?? [] };
    },
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Áreas</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data?.areas.map((a: any) => (
            <div key={a.id} className="flex items-center justify-between text-sm">
              <span className="font-medium">{a.name}</span>
              <span className="text-xs text-muted-foreground">
                {a.bu_units?.name} · <code>{a.slug}</code>
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Times</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data?.teams.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between text-sm">
              <span className="font-medium">{t.name}</span>
              <span className="text-xs text-muted-foreground">
                {t.bu_units?.name} · {t.areas?.name ?? "sem área"} · <code>{t.slug}</code>
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ApiDocsTab() {
  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/internal-api`;
  const endpoints = useMemo(
    () => [
      { m: "GET", p: "/health", d: "Health check (sem autenticação)" },
      { m: "GET", p: "/users", d: "Lista usuários. Filtros: business_unit_slug, area_slug, team_slug, status, search, include_inactive, page, limit" },
      { m: "GET", p: "/users/:id", d: "Detalhe do usuário" },
      { m: "GET", p: "/users/by-email?email=…", d: "Lookup por e-mail" },
      { m: "GET", p: "/business-units", d: "Lista BUs" },
      { m: "GET", p: "/areas?business_unit_slug=…", d: "Lista áreas" },
      { m: "GET", p: "/teams?business_unit_slug=…&area_slug=…", d: "Lista times" },
    ],
    [],
  );
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Autenticação</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>
            Toda chamada (exceto <code>/health</code>) exige o header
            {" "}<code>Authorization: Bearer &lt;INTERNAL_API_TOKEN&gt;</code>.
            O token é gerenciado em Lovable Cloud → Secrets.
          </p>
          <p>Base URL: <code className="text-xs">{baseUrl}</code></p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Endpoints</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Método</TableHead>
                <TableHead>Caminho</TableHead>
                <TableHead>Descrição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {endpoints.map((e) => (
                <TableRow key={e.p}>
                  <TableCell><Badge variant="outline">{e.m}</Badge></TableCell>
                  <TableCell><code className="text-xs">{e.p}</code></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{e.d}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Exemplo</CardTitle></CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`curl -H "Authorization: Bearer $INTERNAL_API_TOKEN" \\
  "${baseUrl}/users?business_unit_slug=jetimob&limit=20"`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

export default function InternalDirectoryPage() {
  usePageTitle("Internal Directory");
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <header>
        <h1 className="text-2xl font-semibold">Internal Directory</h1>
        <p className="text-sm text-muted-foreground">
          Diretório interno de usuários, BUs, áreas e times. Fonte oficial para sistemas internos (ex.: Flow).
        </p>
      </header>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="bus">Business Units</TabsTrigger>
          <TabsTrigger value="areas">Áreas e Times</TabsTrigger>
          <TabsTrigger value="api">API interna</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6"><OverviewTab /></TabsContent>
        <TabsContent value="users" className="mt-6"><UsersTab /></TabsContent>
        <TabsContent value="bus" className="mt-6"><BusTab /></TabsContent>
        <TabsContent value="areas" className="mt-6"><AreasTeamsTab /></TabsContent>
        <TabsContent value="api" className="mt-6"><ApiDocsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
