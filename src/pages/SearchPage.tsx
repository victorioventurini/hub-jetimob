import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBu } from "@/contexts/BuContext";
import { HubLayout } from "@/components/layout/HubLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  User,
  Users,
  Component,
  Target,
  TrendingUp,
  Rocket,
  BarChart3,
  Building2,
  Package,
  KeyRound,
  Key,
  Gift,
  PackageOpen,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchGroup, SearchResult } from "@/hooks/useGlobalSearch";

const iconMap: Record<string, React.ElementType> = {
  user: User,
  users: Users,
  component: Component,
  target: Target,
  "trending-up": TrendingUp,
  rocket: Rocket,
  "bar-chart-3": BarChart3,
  "building-2": Building2,
  package: Package,
  "key-round": KeyRound,
  key: Key,
  gift: Gift,
  "package-open": PackageOpen,
};

const typeLabels: Record<string, string> = {
  all: "Todos",
  people: "Pessoas",
  teams: "Times",
  squads: "Squads",
  okrs: "OKRs Org",
  team_okrs: "OKRs Time",
  krs: "KRs Org",
  team_krs: "KRs Time",
  initiatives: "Iniciativas",
  kpis: "KPIs",
  locations: "Sedes",
  assets_inventory: "Inventário",
  assets_keyrings: "Chaveiros",
  assets_keys: "Chaves",
  assets_gifts_items: "Brindes",
  assets_gifts_batches: "Lotes",
};

const statusColors: Record<string, string> = {
  green: "bg-emerald-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
  not_started: "bg-muted",
  active: "bg-emerald-500",
  draft: "bg-muted",
  available: "bg-emerald-500",
  loaned: "bg-yellow-500",
  maintenance: "bg-orange-500",
  written_off: "bg-red-500",
  checked_out: "bg-yellow-500",
  lost: "bg-red-500",
  disabled: "bg-muted",
  discontinued: "bg-muted",
};

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentBu } = useBu();

  const initialQuery = searchParams.get("q") || "";
  const initialType = searchParams.get("type") || "all";

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [selectedType, setSelectedType] = useState(initialType);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Sync URL with state
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (selectedType !== "all") params.set("type", selectedType);
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, selectedType, setSearchParams]);

  const { data, isLoading, error } = useQuery<{ query: string; groups: SearchGroup[] }>({
    queryKey: ["search-page", currentBu?.id, debouncedQuery],
    queryFn: async () => {
      if (!currentBu?.id || debouncedQuery.length < 2) {
        return { query: debouncedQuery, groups: [] };
      }

      const { data, error } = await supabase.functions.invoke("global-search", {
        body: {
          bu_id: currentBu.id,
          q: debouncedQuery,
          limit_per_type: 50, // More results for full page
        },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!currentBu?.id && debouncedQuery.length >= 2,
    staleTime: 30000,
  });

  const filteredResults = useMemo(() => {
    if (!data?.groups) return [];
    if (selectedType === "all") return data.groups;
    return data.groups.filter((g) => g.type === selectedType);
  }, [data?.groups, selectedType]);

  const totalResults = useMemo(() => {
    if (!data?.groups) return 0;
    return data.groups.reduce((acc, g) => acc + g.results.length, 0);
  }, [data?.groups]);

  const availableTypes = useMemo(() => {
    if (!data?.groups) return ["all"];
    return ["all", ...data.groups.map((g) => g.type)];
  }, [data?.groups]);

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
  };

  const renderResultCard = (result: SearchResult) => {
    const IconComponent = iconMap[result.icon] || Package;
    const status = result.meta?.status as string;
    const statusColor = status ? statusColors[status] : undefined;

    if (result.type === "people") {
      const photoUrl = result.meta?.photo_url as string;
      const email = result.meta?.email as string;
      const initials = result.title
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      return (
        <Card
          key={result.id}
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => handleResultClick(result)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={photoUrl} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{result.title}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {result.subtitle}
                </p>
                {email && (
                  <p className="text-xs text-muted-foreground truncate">{email}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card
        key={result.id}
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => handleResultClick(result)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
              <IconComponent className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{result.title}</p>
                {statusColor && (
                  <span className={cn("h-2 w-2 rounded-full shrink-0", statusColor)} />
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {result.subtitle}
              </p>
              {/* Meta info */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {result.meta?.internal_code && (
                  <Badge variant="outline" className="text-xs">
                    {result.meta.internal_code as string}
                  </Badge>
                )}
                {result.meta?.statusLabel && (
                  <Badge variant="secondary" className="text-xs">
                    {result.meta.statusLabel as string}
                  </Badge>
                )}
                {result.meta?.tag_number && (
                  <Badge variant="outline" className="text-xs">
                    Tag: {result.meta.tag_number as string}
                  </Badge>
                )}
                {result.meta?.quantity_available !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    Qtd: {result.meta.quantity_available as number}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <HubLayout>
      <div className="container max-w-4xl py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-4">Busca</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar pessoas, times, OKRs, assets..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10 h-12 text-lg"
              autoFocus
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Type filters */}
        {data?.groups && data.groups.length > 0 && (
          <div className="mb-6 overflow-x-auto">
            <Tabs value={selectedType} onValueChange={setSelectedType}>
              <TabsList className="h-auto flex-wrap">
                {availableTypes.map((type) => (
                  <TabsTrigger key={type} value={type} className="text-sm">
                    {typeLabels[type] || type}
                    {type !== "all" && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {data.groups.find((g) => g.type === type)?.results.length || 0}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Results */}
        <div className="space-y-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && debouncedQuery.length < 2 && (
            <div className="text-center py-12 text-muted-foreground">
              Digite ao menos 2 caracteres para buscar
            </div>
          )}

          {!isLoading && debouncedQuery.length >= 2 && totalResults === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum resultado encontrado para "{debouncedQuery}"
            </div>
          )}

          {error && (
            <div className="text-center py-12 text-destructive">
              Erro ao buscar: {(error as Error).message}
            </div>
          )}

          {!isLoading &&
            filteredResults.map((group) => (
              <div key={group.type}>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  {group.label}
                  <Badge variant="secondary">{group.results.length}</Badge>
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {group.results.map(renderResultCard)}
                </div>
              </div>
            ))}
        </div>
      </div>
    </HubLayout>
  );
}
