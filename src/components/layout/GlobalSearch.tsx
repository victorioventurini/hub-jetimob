import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusDot } from "@/components/ui/status-badge";
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
  ExternalLink,
} from "lucide-react";
import { useGlobalSearch, SearchGroup, SearchResult } from "@/hooks/useGlobalSearch";
import { cn } from "@/lib/utils";

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

// Map search statuses to shared StatusBadge statuses
const statusMapping: Record<string, string> = {
  green: "on_track",
  yellow: "at_risk",
  red: "off_track",
  not_started: "not_started",
  active: "active",
  draft: "draft",
  available: "available",
  loaned: "loaned",
  maintenance: "maintenance",
  written_off: "written_off",
  checked_out: "loaned",
  lost: "lost",
  disabled: "inactive",
  discontinued: "inactive",
};

interface GlobalSearchProps {
  className?: string;
}

export function GlobalSearch({ className }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { query, setQuery, results, isLoading, isEmpty } = useGlobalSearch();

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      setQuery("");
      navigate(result.url);
    },
    [navigate, setQuery]
  );

  const handleViewAll = useCallback(
    (type: string) => {
      setOpen(false);
      navigate(`/search?q=${encodeURIComponent(query)}&type=${type}`);
    },
    [navigate, query]
  );

  const renderResultItem = (result: SearchResult) => {
    const IconComponent = iconMap[result.icon] || Package;
    const rawStatus = result.meta?.status as string;
    const mappedStatus = rawStatus ? statusMapping[rawStatus] || rawStatus : undefined;

    // Special rendering for people with avatar
    if (result.type === "people") {
      const photoUrl = result.meta?.photo_url as string;
      const initials = result.title
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      return (
        <CommandItem
          key={result.id}
          value={`${result.type}-${result.id}`}
          onSelect={() => handleSelect(result)}
          className="flex items-center gap-3 py-2"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={photoUrl} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{result.title}</p>
            <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
          </div>
        </CommandItem>
      );
    }

    return (
      <CommandItem
        key={result.id}
        value={`${result.type}-${result.id}`}
        onSelect={() => handleSelect(result)}
        className="flex items-center gap-3 py-2"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
          <IconComponent className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{result.title}</p>
            {mappedStatus && <StatusDot status={mappedStatus} size="sm" />}
          </div>
          <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
        </div>
        {result.meta?.internal_code && (
          <Badge variant="outline" className="text-xs shrink-0">
            {result.meta.internal_code as string}
          </Badge>
        )}
      </CommandItem>
    );
  };

  const renderGroup = (group: SearchGroup) => {
    return (
      <CommandGroup key={group.type} heading={group.label}>
        {group.results.map(renderResultItem)}
        {group.hasMore && (
          <CommandItem
            value={`view-all-${group.type}`}
            onSelect={() => handleViewAll(group.type)}
            className="text-primary cursor-pointer"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver mais resultados
          </CommandItem>
        )}
      </CommandGroup>
    );
  };

  return (
    <>
      {/* Search trigger button */}
      <Button
        variant="ghost"
        className={cn(
          "relative h-9 w-full justify-start rounded-md bg-muted/50 text-sm text-muted-foreground hover:bg-muted sm:pr-12 md:w-64 lg:w-80",
          className
        )}
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Buscar no Hub...</span>
        <span className="inline-flex lg:hidden">Buscar...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Search dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar pessoas, times, OKRs, assets..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {isEmpty && (
            <CommandEmpty>
              Nenhum resultado encontrado para "{query}"
            </CommandEmpty>
          )}

          {!isLoading && !isEmpty && query.length < 2 && (
            <CommandEmpty>
              Digite ao menos 2 caracteres para buscar
            </CommandEmpty>
          )}

          {!isLoading && results.length > 0 && (
            <>
              {results.map((group, index) => (
                <div key={group.type}>
                  {index > 0 && <CommandSeparator />}
                  {renderGroup(group)}
                </div>
              ))}

              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  value="view-all-results"
                  onSelect={() => {
                    setOpen(false);
                    navigate(`/search?q=${encodeURIComponent(query)}`);
                  }}
                  className="justify-center text-primary"
                >
                  Ver todos os resultados
                  <ExternalLink className="h-4 w-4 ml-2" />
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
