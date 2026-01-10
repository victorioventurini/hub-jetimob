import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Building2, Mail, Phone, Zap } from "lucide-react";

interface PartnerContactHoverCardProps {
  contactId: string;
  children: ReactNode;
  asChild?: boolean;
}

interface PartnerContactData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  company_name: string | null;
  capabilities: string[];
}

export function PartnerContactHoverCard({ 
  contactId, 
  children, 
  asChild = true 
}: PartnerContactHoverCardProps) {
  const supabase = useBuScopedSupabase();

  const { data: contact, isLoading } = useQuery({
    queryKey: ["partner-contact-hover", contactId],
    queryFn: async (): Promise<PartnerContactData | null> => {
      if (!contactId) return null;

      // Fetch contact with company - use explicit typing to avoid TS issues
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: contactData, error } = await (supabase as any)
        .from("ticket_partner_contacts")
        .select(`
          id,
          name,
          email,
          phone,
          status,
          ticket_partner_companies(name)
        `)
        .eq("id", contactId)
        .maybeSingle();

      if (error || !contactData) return null;

      // Fetch capabilities
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: capabilitiesData } = await (supabase as any)
        .from("ticket_contact_capability_assignments")
        .select(`
          ticket_contact_capabilities(name)
        `)
        .eq("contact_id", contactId);

      const capabilities = (capabilitiesData || [])
        .map((c: { ticket_contact_capabilities: { name: string } | null }) => 
          c.ticket_contact_capabilities?.name
        )
        .filter(Boolean) as string[];

      return {
        id: contactData.id,
        name: contactData.name,
        email: contactData.email,
        phone: contactData.phone,
        status: contactData.status,
        company_name: contactData.ticket_partner_companies?.name || null,
        capabilities,
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
            to={`/tickets/contacts/${contact.id}`}
            className="block p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {getInitials(contact.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-foreground truncate">
                    {contact.name}
                  </h4>
                  <Badge 
                    variant={contact.status === "active" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {contact.status === "active" ? "Ativo" : "Inativo"}
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
              
              {contact.capabilities.length > 0 && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Zap className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {contact.capabilities.slice(0, 3).map((cap) => (
                      <Badge key={cap} variant="outline" className="text-xs">
                        {cap}
                      </Badge>
                    ))}
                    {contact.capabilities.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{contact.capabilities.length - 3}
                      </Badge>
                    )}
                  </div>
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
