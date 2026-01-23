// ============================================================
// CONTACT HOVER CARD COMPONENT - Hub da Jet
// ============================================================
// HoverCard for external contacts (partner_contacts).
// Mirrors UserHoverCard behavior for consistent UX across participant types.
// ============================================================

import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { participantKeys } from "@/lib/queryKeys/participantKeys";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Building2, Mail, Phone } from "lucide-react";

export interface ContactHoverCardProps {
  contactId: string;
  children: ReactNode;
  asChild?: boolean;
}

interface ContactData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  company_name: string | null;
}

/**
 * Hover card for external contacts (partner_contacts).
 * 
 * Provides the same UX as UserHoverCard:
 * - Shows avatar, name, company, email, phone on hover
 * - Clicking navigates to /contacts/:id
 * 
 * @example
 * ```tsx
 * <ContactHoverCard contactId={contact.id}>
 *   <span>@{contact.name}</span>
 * </ContactHoverCard>
 * ```
 */
export function ContactHoverCard({ 
  contactId, 
  children, 
  asChild = true 
}: ContactHoverCardProps) {
  const supabase = useBuScopedSupabase();

  const { data: contact, isLoading } = useQuery({
    queryKey: participantKeys.contactHoverCard(contactId),
    queryFn: async (): Promise<ContactData | null> => {
      if (!contactId) return null;

      // Fetch contact with company
      const { data: contactData, error } = await supabase
        .from("partner_contacts")
        .select(`
          id,
          name,
          email,
          phone,
          status,
          partner_companies(name)
        `)
        .eq("id", contactId)
        .maybeSingle();

      if (error || !contactData) return null;

      return {
        id: contactData.id,
        name: contactData.name,
        email: contactData.email,
        phone: contactData.phone,
        status: contactData.status,
        company_name: contactData.partner_companies?.name || null,
      };
    },
    enabled: !!contactId,
    staleTime: 5 * 60 * 1000,
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <HoverCard openDelay={800} closeDelay={100}>
      <HoverCardTrigger asChild={asChild}>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-72 p-0" side="top" align="start">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        ) : contact ? (
          <Link 
            to={`/contacts/${contact.id}`}
            className="block p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                <AvatarFallback className="bg-accent text-accent-foreground font-semibold">
                  {getInitials(contact.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-foreground truncate">
                    {contact.name}
                  </h4>
                  <Badge 
                    variant="outline"
                    className="text-xs border-status-yellow text-status-yellow"
                  >
                    Externo
                  </Badge>
                </div>
                
                {contact.company_name && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{contact.company_name}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{contact.email}</span>
              </div>
              
              {contact.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{contact.phone}</span>
                </div>
              )}
            </div>
          </Link>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Contato não encontrado
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
