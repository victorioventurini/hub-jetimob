/**
 * TicketResponsibleSelect - Componente de filtro para responsável de ticket
 * 
 * Suporta tanto usuários internos (profiles) quanto contatos externos (partner_contacts).
 * Usa prefixo no value para distinguir o tipo: "internal:{id}" ou "external:{id}"
 * 
 * @see TCR - Ticket Responsible Filter
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { OptimizedAvatar } from "@/components/ui/optimized-avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBuUsersDirectory } from "@/hooks/useBuUsersDirectory";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { Search, User, Building2, Users } from "lucide-react";

export interface ResponsibleOption {
  id: string;
  type: "internal" | "external";
  name: string;
  subtitle?: string;
  avatarUrl?: string | null;
}

export interface TicketResponsibleSelectProps {
  value: string | undefined;
  onValueChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  /** Include "all" option */
  includeAll?: boolean;
  allLabel?: string;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  return name.slice(0, 2).toUpperCase();
}

/**
 * Parses a combined value like "internal:uuid" or "external:uuid"
 */
export function parseResponsibleValue(value: string | undefined): { type: "internal" | "external" | null; id: string | null } {
  if (!value || value === "all") return { type: null, id: null };
  const [type, id] = value.split(":");
  if (type === "internal" || type === "external") {
    return { type, id: id || null };
  }
  return { type: null, id: null };
}

/**
 * Creates a combined value from type and id
 */
export function createResponsibleValue(type: "internal" | "external", id: string): string {
  return `${type}:${id}`;
}

export function TicketResponsibleSelect({
  value,
  onValueChange,
  placeholder = "Responsável",
  disabled = false,
  className,
  triggerClassName,
  includeAll = false,
  allLabel = "Todos",
}: TicketResponsibleSelectProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  
  // Load internal users
  const { data: internalUsers = [], isLoading: loadingInternal } = useBuUsersDirectory({
    q: search,
    pageSize: 100,
    excludeExternal: true,
  });

  // Load external contacts from associations
  const { data: externalContacts = [], isLoading: loadingExternal } = useQuery({
    queryKey: [...queryKeys.tickets.partnerContacts(buId ?? null), "filter", search],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!buId) return [];
      
      const { data: associations, error } = await supabase
        .from("partner_contact_bu_associations")
        .select(`
          id,
          partner_contact:partner_contacts!inner (
            id, name, email,
            partner_company:partner_companies(id, name)
          )
        `)
        .eq("bu_id", buId)
        .eq("is_active", true)
        .is("deleted_at", null);

      if (error) {
        console.error("[TicketResponsibleSelect] Error loading contacts:", error);
        return [];
      }

      // Flatten and dedupe
      const contacts = (associations || [])
        .map((a) => a.partner_contact)
        .filter((c): c is NonNullable<typeof c> => c !== null);

      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase();
        return contacts.filter((c) => 
          c.name?.toLowerCase().includes(searchLower) ||
          c.email?.toLowerCase().includes(searchLower)
        );
      }

      return contacts;
    },
    enabled: !!buId,
  });

  // Combine options
  const options = useMemo((): ResponsibleOption[] => {
    const internal: ResponsibleOption[] = internalUsers.map((u) => ({
      id: createResponsibleValue("internal", u.id),
      type: "internal" as const,
      name: u.display_name || "Sem nome",
      subtitle: u.job_title_name || undefined,
      avatarUrl: u.photo_url,
    }));

    const external: ResponsibleOption[] = externalContacts.map((c) => ({
      id: createResponsibleValue("external", c.id),
      type: "external" as const,
      name: c.name || "Sem nome",
      subtitle: (c.partner_company as any)?.name || c.email || undefined,
      avatarUrl: null,
    }));

    return [...internal, ...external];
  }, [internalUsers, externalContacts]);

  // Find selected option for display
  const selectedOption = useMemo(() => {
    if (!value || value === "all") return null;
    return options.find((o) => o.id === value) || null;
  }, [options, value]);

  const internalOptions = options.filter((o) => o.type === "internal");
  const externalOptions = options.filter((o) => o.type === "external");

  const isLoading = loadingInternal || loadingExternal;

  const handleValueChange = (val: string) => {
    onValueChange(val === "all" ? undefined : val);
    setOpen(false);
  };

  return (
    <Select
      value={value || (includeAll ? "all" : undefined)}
      onValueChange={handleValueChange}
      disabled={disabled || isLoading}
      open={open}
      onOpenChange={setOpen}
    >
      <SelectTrigger className={cn("w-[180px]", triggerClassName, className)}>
        <SelectValue placeholder={placeholder}>
          {value === "all" || !value ? (
            <span className="text-muted-foreground">{allLabel}</span>
          ) : selectedOption ? (
            <div className="flex items-center gap-2">
              {selectedOption.type === "internal" ? (
                <OptimizedAvatar
                  src={selectedOption.avatarUrl}
                  fallback={getInitials(selectedOption.name)}
                  size="sm"
                  className="h-5 w-5"
                  fallbackClassName="text-[10px]"
                />
              ) : (
                <Building2 className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="truncate">{selectedOption.name}</span>
            </div>
          ) : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent onCloseAutoFocus={(e) => e.preventDefault()}>
        {/* Search */}
        <div className="p-2 border-b sticky top-0 bg-popover z-10">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar responsável..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="pl-8 h-9"
            />
          </div>
        </div>

        <ScrollArea className="h-[300px]">
          {/* All option */}
          {includeAll && (
            <SelectItem value="all" className="cursor-pointer">
              <span className="text-muted-foreground">{allLabel}</span>
            </SelectItem>
          )}

          {/* Internal users group */}
          {internalOptions.length > 0 && (
            <SelectGroup>
              <SelectLabel className="flex items-center gap-2 text-xs">
                <Users className="h-3 w-3" />
                Usuários Internos
              </SelectLabel>
              {internalOptions.map((option) => (
                <SelectItem
                  key={option.id}
                  value={option.id}
                  className="cursor-pointer py-2"
                >
                  <div className="flex items-center gap-2">
                    <OptimizedAvatar
                      src={option.avatarUrl}
                      fallback={getInitials(option.name)}
                      size="sm"
                      className="h-6 w-6 flex-shrink-0"
                      fallbackClassName="text-[10px]"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-sm">{option.name}</span>
                      {option.subtitle && (
                        <span className="text-xs text-muted-foreground truncate">
                          {option.subtitle}
                        </span>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {/* External contacts group */}
          {externalOptions.length > 0 && (
            <SelectGroup>
              <SelectLabel className="flex items-center gap-2 text-xs">
                <Building2 className="h-3 w-3" />
                Contatos Externos
              </SelectLabel>
              {externalOptions.map((option) => (
                <SelectItem
                  key={option.id}
                  value={option.id}
                  className="cursor-pointer py-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-sm">{option.name}</span>
                      {option.subtitle && (
                        <span className="text-xs text-muted-foreground truncate">
                          {option.subtitle}
                        </span>
                      )}
                    </div>
                    <Badge variant="outline" className="ml-auto text-[10px] h-4 px-1">
                      Externo
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {/* Empty state */}
          {options.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <User className="h-8 w-8 mb-2" />
              <span className="text-sm">
                {search ? "Nenhum responsável encontrado" : "Nenhum responsável disponível"}
              </span>
            </div>
          )}
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}
