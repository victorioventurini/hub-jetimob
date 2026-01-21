/**
 * TicketTransferModal - Modal para transferir ticket para outro responsável
 * 
 * - Ticket interno: lista usuários internos via useBuUsersDirectory
 * - Ticket externo: lista contatos externos da mesma empresa via usePartnerCompanyContacts
 * 
 * Refatorado para usar hooks canônicos e eliminar duplicação de código.
 */

import { useState, useMemo } from "react";
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
import { usePartnerCompanyContacts } from "../hooks/usePartnerCompanyContacts";
import { getInitials } from "@/lib/mentions";

// ===========================================
// TYPES
// ===========================================

export interface TransferCandidate {
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

// ===========================================
// COMPONENT
// ===========================================

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

  // ========================================
  // DATA FETCHING - HOOKS CANÔNICOS
  // ========================================

  // Internal users via canonical hook
  const { data: internalUsers = [], isLoading: loadingInternal } = useBuUsersDirectory({
    q: search,
    pageSize: 100,
    excludeExternal: true,
    enabled: ticketType === "internal",
  });

  // External contacts via canonical hook
  const { data: externalContacts = [], isLoading: loadingExternal } = usePartnerCompanyContacts({
    partnerCompanyId,
    q: search,
    enabled: ticketType === "external" && !!partnerCompanyId,
  });

  // ========================================
  // CANDIDATES LIST
  // ========================================

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
          authUserId: u.user_id,
        }));
    } else {
      return externalContacts
        .filter((c) => c.id !== currentResponsibleId)
        .map((c) => ({
          id: c.id,
          type: "external" as const,
          name: c.name,
          subtitle: c.email || undefined,
          avatarUrl: null,
          authUserId: c.authUserId,
        }));
    }
  }, [ticketType, internalUsers, externalContacts, currentResponsibleId]);

  const isLoading = ticketType === "internal" ? loadingInternal : loadingExternal;

  // ========================================
  // HANDLERS
  // ========================================

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

  // ========================================
  // RENDER
  // ========================================

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
