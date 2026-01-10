import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { HubLayout } from "@/components/layout/HubLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PhoneLink } from "@/components/ui/phone-link";
import {
  ArrowLeft,
  User,
  Building2,
  Mail,
  Phone,
  Zap,
  Ticket,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusLabels: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
};

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  inactive: "bg-muted text-muted-foreground border-muted",
};

interface PartnerContactProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  created_at: string;
  company: {
    id: string;
    name: string;
    status: string;
  } | null;
  capabilities: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
  ticket_count: number;
}

function usePartnerContactProfile(id: string | undefined) {
  const supabase = useOptionalBuScopedSupabase();

  return useQuery({
    queryKey: ["partner-contact-profile", id],
    queryFn: async (): Promise<PartnerContactProfile | null> => {
      if (!id || !supabase) return null;

      // Fetch contact with company
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: contactData, error } = await (supabase as any)
        .from("ticket_partner_contacts")
        .select(`
          id,
          name,
          email,
          phone,
          status,
          created_at,
          ticket_partner_companies(id, name, status)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error || !contactData) return null;

      // Fetch capabilities
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: capabilitiesData } = await (supabase as any)
        .from("ticket_contact_capability_assignments")
        .select(`
          ticket_contact_capabilities(id, name, description)
        `)
        .eq("contact_id", id);

      const capabilities = (capabilitiesData || [])
        .map((c: { ticket_contact_capabilities: { id: string; name: string; description: string | null } | null }) =>
          c.ticket_contact_capabilities
        )
        .filter(Boolean);

      // Fetch ticket count for this contact
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (supabase as any)
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("reporter_partner_contact_id", id);

      return {
        id: contactData.id,
        name: contactData.name,
        email: contactData.email,
        phone: contactData.phone,
        status: contactData.status,
        created_at: contactData.created_at,
        company: contactData.ticket_partner_companies || null,
        capabilities,
        ticket_count: count || 0,
      };
    },
    enabled: !!id && !!supabase,
  });
}

export default function PartnerContactProfilePage() {
  const { contactId } = useParams<{ contactId: string }>();
  const { data: profile, isLoading } = usePartnerContactProfile(contactId);

  usePageTitle(profile?.name ? `${profile.name}` : "Contato Parceiro");

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (isLoading) {
    return (
      <HubLayout>
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-48 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </HubLayout>
    );
  }

  if (!profile) {
    return (
      <HubLayout>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Contato não encontrado</h2>
            <p className="text-muted-foreground mb-4">
              O contato que você está procurando não existe ou você não tem acesso.
            </p>
            <Button asChild>
              <Link to="/tickets/settings?tab=contacts">Voltar para Contatos</Link>
            </Button>
          </div>
        </div>
      </HubLayout>
    );
  }

  return (
    <HubLayout>
      <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="mt-1"
        >
          <Link to="/tickets/settings?tab=contacts">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>

        <div className="flex flex-col sm:flex-row gap-6 flex-1">
          <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
            <AvatarFallback className="text-2xl bg-primary/10 text-primary font-semibold">
              {getInitials(profile.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{profile.name}</h1>
              <Badge variant="outline" className={statusColors[profile.status]}>
                {statusLabels[profile.status]}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <User className="h-3 w-3" />
                Contato Externo
              </Badge>
            </div>

            {profile.company && (
              <p className="text-lg text-muted-foreground mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {profile.company.name}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {profile.capabilities.slice(0, 4).map((cap) => (
                <Badge key={cap.id} variant="outline" className="gap-1">
                  <Zap className="h-3 w-3" />
                  {cap.name}
                </Badge>
              ))}
              {profile.capabilities.length > 4 && (
                <Badge variant="outline">
                  +{profile.capabilities.length - 4}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Informações de Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">E-mail</p>
                  <a
                    href={`mailto:${profile.email}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {profile.email}
                  </a>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  {profile.phone ? (
                    <PhoneLink phone={profile.phone} />
                  ) : (
                    <p className="font-medium text-muted-foreground">Não informado</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cadastrado em</p>
                  <p className="font-medium">
                    {format(new Date(profile.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tickets abertos</p>
                  <p className="font-medium flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                    {profile.ticket_count}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Capabilities */}
          {profile.capabilities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Capacidades ({profile.capabilities.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {profile.capabilities.map((cap) => (
                    <div
                      key={cap.id}
                      className="p-3 rounded-lg bg-muted/50"
                    >
                      <p className="font-medium text-sm">{cap.name}</p>
                      {cap.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {cap.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Company */}
          {profile.company && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Empresa Parceira
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{profile.company.name}</p>
                    <Badge
                      variant="outline"
                      className={statusColors[profile.company.status]}
                    >
                      {statusLabels[profile.company.status]}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start gap-2">
                <a href={`mailto:${profile.email}`}>
                  <Mail className="h-4 w-4" />
                  Enviar e-mail
                </a>
              </Button>
              {profile.phone && (
                <Button asChild variant="outline" className="w-full justify-start gap-2">
                  <a href={`tel:${profile.phone.replace(/\D/g, "")}`}>
                    <Phone className="h-4 w-4" />
                    Ligar
                  </a>
                </Button>
              )}
              <Button asChild variant="outline" className="w-full justify-start gap-2">
                <Link to={`/tickets?reporter=${profile.id}`}>
                  <Ticket className="h-4 w-4" />
                  Ver tickets
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </HubLayout>
  );
}
