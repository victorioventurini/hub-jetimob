import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { HubLayout } from "@/components/layout/HubLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OptimizedAvatar } from "@/components/ui/optimized-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PhoneLink } from "@/components/ui/phone-link";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  User,
  Building2,
  Mail,
  Phone,
  Zap,
  Ticket,
  FolderOpen,
  Tag,
  Briefcase,
  Clock,
  CheckCircle2,
  Loader2,
  Hourglass,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { queryKeys } from "@/lib/queryKeys";

const statusLabels: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
};

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  inactive: "bg-muted text-muted-foreground border-muted",
};

interface CapabilityWithCategory {
  id: string;
  category_id: string;
  category_name: string;
  subcategory_id: string | null;
  subcategory_name: string | null;
  is_active: boolean;
}

interface ServiceMapping {
  id: string;
  category_id: string;
  category_name: string;
  subcategory_id: string | null;
  subcategory_name: string | null;
}

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
    legal_name: string | null;
    status: string;
    allowed_domains: string[] | null;
  } | null;
  capabilities: CapabilityWithCategory[];
  company_services: ServiceMapping[];
  ticket_count: number;
  ticket_stats: {
    waiting: number;
    in_progress: number;
    done: number;
    avg_resolution_days: number | null;
  };
}

function usePartnerContactProfile(id: string | undefined) {
  const supabase = useOptionalBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.tickets.partnerContactProfile(id || ""),
    queryFn: async (): Promise<PartnerContactProfile | null> => {
      if (!id || !supabase) return null;

      // Fetch contact with company
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: contactData, error } = await (supabase as any)
        .from("partner_contacts")
        .select(`
          id,
          name,
          email,
          phone,
          status,
          created_at,
          partner_companies(id, name, legal_name, status, allowed_domains)
        `)
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();

      if (error || !contactData) return null;

      // Fetch contact capabilities with category/subcategory info
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: capabilitiesData } = await (supabase as any)
        .from("partner_contact_capabilities")
        .select(`
          id,
          category_id,
          subcategory_id,
          is_active,
          ticket_categories(id, name),
          ticket_subcategories(id, name)
        `)
        .eq("contact_id", id)
        .is("deleted_at", null);

      const capabilities: CapabilityWithCategory[] = (capabilitiesData || []).map((c: {
        id: string;
        category_id: string;
        subcategory_id: string | null;
        is_active: boolean;
        ticket_categories: { id: string; name: string } | null;
        ticket_subcategories: { id: string; name: string } | null;
      }) => ({
        id: c.id,
        category_id: c.category_id,
        category_name: c.ticket_categories?.name || "Categoria",
        subcategory_id: c.subcategory_id,
        subcategory_name: c.ticket_subcategories?.name || null,
        is_active: c.is_active,
      }));

      // Fetch company service mappings if company exists
      let companyServices: ServiceMapping[] = [];
      const companyId = contactData.partner_companies?.id;
      
      if (companyId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: servicesData } = await (supabase as any)
          .from("partner_service_mappings")
          .select(`
            id,
            category_id,
            subcategory_id,
            ticket_categories(id, name),
            ticket_subcategories(id, name)
          `)
          .eq("partner_company_id", companyId)
          .is("deleted_at", null);

        companyServices = (servicesData || []).map((s: {
          id: string;
          category_id: string;
          subcategory_id: string | null;
          ticket_categories: { id: string; name: string } | null;
          ticket_subcategories: { id: string; name: string } | null;
        }) => ({
          id: s.id,
          category_id: s.category_id,
          category_name: s.ticket_categories?.name || "Categoria",
          subcategory_id: s.subcategory_id,
          subcategory_name: s.ticket_subcategories?.name || null,
        }));
      }

      // Fetch ticket count for this contact
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (supabase as any)
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("reporter_partner_contact_id", id);

      // Fetch ticket stats by status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: ticketsData } = await (supabase as any)
        .from("tickets")
        .select("status, created_at, closed_at")
        .eq("reporter_partner_contact_id", id);

      const ticketStats = {
        waiting: 0,
        in_progress: 0,
        done: 0,
        avg_resolution_days: null as number | null,
      };

      const resolutionTimes: number[] = [];

      for (const ticket of ticketsData || []) {
        if (ticket.status === 'waiting') ticketStats.waiting++;
        if (ticket.status === 'in_progress') ticketStats.in_progress++;
        if (ticket.status === 'done') {
          ticketStats.done++;
          if (ticket.closed_at && ticket.created_at) {
            const created = new Date(ticket.created_at);
            const closed = new Date(ticket.closed_at);
            const diffDays = Math.ceil((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
            resolutionTimes.push(diffDays);
          }
        }
      }

      if (resolutionTimes.length > 0) {
        ticketStats.avg_resolution_days = Math.round(
          resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
        );
      }

      return {
        id: contactData.id,
        name: contactData.name,
        email: contactData.email,
        phone: contactData.phone,
        status: contactData.status,
        created_at: contactData.created_at,
        company: contactData.partner_companies || null,
        capabilities,
        company_services: companyServices,
        ticket_count: count || 0,
        ticket_stats: ticketStats,
      };
    },
    enabled: !!id && !!supabase,
  });
}

// Group capabilities by category
function groupByCategory<T extends { category_id: string; category_name: string }>(
  items: T[]
): Map<string, { category_name: string; items: T[] }> {
  const grouped = new Map<string, { category_name: string; items: T[] }>();
  
  for (const item of items) {
    const existing = grouped.get(item.category_id);
    if (existing) {
      existing.items.push(item);
    } else {
      grouped.set(item.category_id, {
        category_name: item.category_name,
        items: [item],
      });
    }
  }
  
  return grouped;
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
              <Skeleton className="h-64 w-full" />
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

  const groupedCapabilities = groupByCategory(profile.capabilities);
  const groupedServices = groupByCategory(profile.company_services);

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
            <OptimizedAvatar
              src={null}
              alt={profile.name}
              fallback={getInitials(profile.name)}
              size="lg"
              className="h-24 w-24 border-4 border-background shadow-lg"
              fallbackClassName="text-2xl bg-accent text-accent-foreground"
            />

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
                {/* Show unique categories from capabilities */}
                {Array.from(new Map(profile.capabilities.map(cap => [cap.category_id, cap])).values())
                  .slice(0, 4)
                  .map((cap) => (
                    <Badge key={cap.category_id} variant="outline" className="gap-1">
                      <Tag className="h-3 w-3" />
                      {cap.category_name}
                    </Badge>
                  ))}
                {new Set(profile.capabilities.map(cap => cap.category_id)).size > 4 && (
                  <Badge variant="outline">
                    +{new Set(profile.capabilities.map(cap => cap.category_id)).size - 4}
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

            {/* Contact Capabilities by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Especialidades de {profile.name.split(' ')[0]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.capabilities.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma capacidade atribuída</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Array.from(groupedCapabilities.entries()).map(([categoryId, group]) => (
                      <div key={categoryId} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">{group.category_name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {group.items.length}
                          </Badge>
                        </div>
                        <div className="ml-6 flex flex-wrap gap-2">
                          {group.items.map((cap) => (
                            <Badge
                              key={cap.id}
                              variant={cap.is_active ? "default" : "outline"}
                              className={!cap.is_active ? "opacity-60" : ""}
                            >
                              <Tag className="h-3 w-3 mr-1" />
                              {cap.subcategory_name || "Geral"}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
                <CardContent className="space-y-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{profile.company.name}</p>
                      <Badge
                        variant="outline"
                        className={statusColors[profile.company.status]}
                      >
                        {statusLabels[profile.company.status]}
                      </Badge>
                    </div>
                    {profile.company.legal_name && (
                      <p className="text-xs text-muted-foreground">
                        {profile.company.legal_name}
                      </p>
                    )}
                  </div>

                  {profile.company.allowed_domains && profile.company.allowed_domains.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Domínios permitidos</p>
                        <div className="flex flex-wrap gap-1">
                          {profile.company.allowed_domains.map((domain) => (
                            <Badge key={domain} variant="outline" className="text-xs">
                              @{domain}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Area de Atuação - moved from separate card */}
                  {profile.company_services.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                          <Briefcase className="h-3.5 w-3.5" />
                          Área de Atuação
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {/* Show unique categories only */}
                          {Array.from(new Map(profile.company_services.map(s => [s.category_id, s])).values()).map((service) => (
                            <Badge
                              key={service.category_id}
                              variant="secondary"
                              className="text-xs"
                            >
                              {service.category_name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tickets Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Ticket className="h-4 w-4" />
                  Tickets com {profile.name.split(' ')[0]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-warning-muted">
                    <Hourglass className="h-4 w-4 mx-auto mb-1 text-warning" />
                    <p className="text-lg font-semibold text-warning-muted-foreground">
                      {profile.ticket_stats.waiting}
                    </p>
                    <p className="text-xs text-warning">Aguardando</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-info-muted">
                    <Loader2 className="h-4 w-4 mx-auto mb-1 text-info" />
                    <p className="text-lg font-semibold text-info-muted-foreground">
                      {profile.ticket_stats.in_progress}
                    </p>
                    <p className="text-xs text-info">Em andamento</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-success-muted">
                    <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-success" />
                    <p className="text-lg font-semibold text-success-muted-foreground">
                      {profile.ticket_stats.done}
                    </p>
                    <p className="text-xs text-success">Concluídos</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Tempo médio de resolução:</span>
                  <span className="font-medium text-foreground">
                    {profile.ticket_stats.avg_resolution_days !== null
                      ? `${profile.ticket_stats.avg_resolution_days} dia${profile.ticket_stats.avg_resolution_days !== 1 ? 's' : ''}`
                      : 'N/A'}
                  </span>
                </div>

                <Button asChild variant="outline" className="w-full justify-start gap-2">
                  <Link to={`/tickets?reporter=${profile.id}`}>
                    <Ticket className="h-4 w-4" />
                    Ver todos os tickets
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
