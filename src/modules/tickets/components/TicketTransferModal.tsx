/**
 * TicketTransferModal - Modal para transferir ticket para outro responsável
 * 
 * - Ticket interno: lista apenas usuários internos
 * - Ticket externo: lista apenas contatos externos da mesma empresa parceira
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OptimizedAvatar } from "@/components/ui/optimized-avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Search, User, Building2, Check } from "lucide-react";
import { useBuUsersDirectory } from "@/hooks/useBuUsersDirectory";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";

interface TransferCandidate {
  id: string;
  type: "internal" | "external";
  name: string;
  subtitle?: string;
  avatarUrl?: string | null;
  authUserId?: string | null;
}

interface TicketTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketType: "internal" | "external";
  /** For external tickets, filter by partner company */
  partnerCompanyId?: string | null;
  /** Current responsible ID to exclude from list */
  currentResponsibleId?: string;
  onTransfer: (candidate: TransferCandidate) => void;
  isTransferring?: boolean;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  return name.slice(0, 2).toUpperCase();
}

export function TicketTransferModal({
  open,
  onOpenChange,
  ticketType,
  partnerCompanyId,
  currentResponsibleId,
  onTransfer,
  isTransferring = false,
}: TicketTransferModalProps) {
  const [search, setSearch] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<TransferCandidate | null>(null);

  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id;

  // Load internal users (for internal tickets)
  const { data: internalUsers = [], isLoading: loadingInternal } = useBuUsersDirectory({
    q: search,
    pageSize: 100,
    excludeExternal: true,
  });

  // Load external contacts from same company (for external tickets)
  const { data: externalContacts = [], isLoading: loadingExternal } = useQuery({
    queryKey: [...queryKeys.tickets.partnerContacts(buId ?? null, partnerCompanyId ?? undefined), "transfer", search],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!buId || !partnerCompanyId) return [];

      // Query contacts from same partner company via associations
      const { data: associations, error } = await supabase
        .from("partner_contact_bu_associations")
        .select(`
          id,
          partner_contact:partner_contacts!inner (
            id, name, email, partner_company_id, profile_user_id
          )
        `)
        .eq("bu_id", buId)
        .eq("is_active", true)
        .is("deleted_at", null);

      if (error) {
        console.error("[TicketTransferModal] Error loading contacts:", error);
        return [];
      }

      // Flatten, filter by company, and filter out deleted
      const contacts = (associations || [])
        .map((a) => a.partner_contact)
        .filter((c): c is NonNullable<typeof c> => 
          c !== null && c.partner_company_id === partnerCompanyId
        );

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
    enabled: !!buId && ticketType === "external" && !!partnerCompanyId,
  });

  // Build candidates list based on ticket type
  const candidates = useMemo((): TransferCandidate[] => {
    if (ticketType === "internal") {
      return internalUsers
        .filter((u) => u.id !== currentResponsibleId)
        .map((u) => ({
          id: u.id,
          type: "internal" as const,
          name: u.display_name || "Sem nome",
          subtitle: u.job_title_name || undefined,
          avatarUrl: u.photo_url,
          authUserId: u.user_id, // profiles.user_id = auth.users.id
        }));
    } else {
      return externalContacts
        .filter((c) => c.id !== currentResponsibleId)
        .map((c) => ({
          id: c.id,
          type: "external" as const,
          name: c.name || "Sem nome",
          subtitle: c.email || undefined,
          avatarUrl: null,
          authUserId: c.profile_user_id, // partner_contacts.profile_user_id
        }));
    }
  }, [ticketType, internalUsers, externalContacts, currentResponsibleId]);

  const isLoading = ticketType === "internal" ? loadingInternal : loadingExternal;

  const handleTransfer = () => {
    if (selectedCandidate) {
      onTransfer(selectedCandidate);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSearch("");
      setSelectedCandidate(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir Ticket</DialogTitle>
          <DialogDescription>
            {ticketType === "internal"
              ? "Selecione o novo responsável interno para este ticket."
              : "Selecione o novo contato externo da mesma empresa parceira."}
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={ticketType === "internal" ? "Buscar usuário..." : "Buscar contato..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Candidates list */}
        <ScrollArea className="h-[300px] border rounded-md">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
              {ticketType === "internal" ? (
                <User className="h-10 w-10 mb-3" />
              ) : (
                <Building2 className="h-10 w-10 mb-3" />
              )}
              <p className="text-sm">
                {search
                  ? "Nenhum resultado encontrado"
                  : ticketType === "internal"
                  ? "Nenhum usuário disponível"
                  : "Nenhum contato disponível nesta empresa"}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {candidates.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => setSelectedCandidate(candidate)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 rounded-md text-left transition-colors",
                    "hover:bg-accent",
                    selectedCandidate?.id === candidate.id && "bg-accent ring-1 ring-primary"
                  )}
                >
                  {candidate.type === "internal" ? (
                    <OptimizedAvatar
                      src={candidate.avatarUrl}
                      fallback={getInitials(candidate.name)}
                      size="md"
                      className="h-10 w-10 flex-shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{candidate.name}</p>
                    {candidate.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{candidate.subtitle}</p>
                    )}
                  </div>
                  {candidate.type === "external" && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 flex-shrink-0">
                      Externo
                    </Badge>
                  )}
                  {selectedCandidate?.id === candidate.id && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isTransferring}>
            Cancelar
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!selectedCandidate || isTransferring}
          >
            {isTransferring ? "Transferindo..." : "Transferir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
