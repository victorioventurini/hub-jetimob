import { useParams, Link } from "react-router-dom";
import { HubLayout } from "@/components/layout/HubLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OptimizedAvatar } from "@/components/ui/optimized-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { UsersBreadcrumb } from "@/components/ui/global-breadcrumb";
import {
  User,
  Building2,
  MapPin,
  Briefcase,
  BarChart3,
  Users,
  ChevronRight,
  Mail,
  Cake,
  Instagram,
  MessageCircle,
  MessageSquare,
} from "lucide-react";
import { PhoneLink } from "@/components/ui/phone-link";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  usePublicProfile,
  useUserKpis,
  useUserSquads,
  useUserBuMemberships,
} from "@/hooks/usePublicProfile";
import { TeamLink } from "@/components/links";
import { useBu } from "@/contexts/BuContext";


const workModeLabels: Record<string, string> = {
  onsite: "Presencial",
  remote: "Remoto",
  hybrid: "Híbrido",
};

const statusLabels: Record<string, string> = {
  active: "Ativo",
  vacation: "Férias",
  terminated: "Desligado",
};

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  vacation: "bg-warning/10 text-warning border-warning/20",
  terminated: "bg-muted text-muted-foreground border-muted",
};

const monthNames = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const { data: profile, isLoading } = usePublicProfile(id);
  const { data: kpis } = useUserKpis(profile?.id);
  const { data: squads } = useUserSquads(profile?.id);
  const { data: buMemberships } = useUserBuMemberships(profile?.id);
  const { currentBu } = useBu();

  usePageTitle(profile?.display_name ? `${profile.display_name}` : "Perfil");

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const formatStartDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      return `${month} de ${year}`;
    } catch {
      return dateStr;
    }
  };


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
            <h2 className="text-xl font-semibold mb-2">Perfil não encontrado</h2>
            <p className="text-muted-foreground mb-4">
              O usuário que você está procurando não existe ou você não tem acesso.
            </p>
            <Button asChild>
              <Link to="/users">Voltar para Jetimobers</Link>
            </Button>
          </div>
        </div>
      </HubLayout>
    );
  }

  return (
    <HubLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <UsersBreadcrumb userName={profile.display_name} />
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-6">
            <OptimizedAvatar 
              src={profile.photo_url} 
              alt={profile.display_name}
              fallback={getInitials(profile.display_name)}
              size="lg"
              className="h-24 w-24 border-4 border-background shadow-lg"
              fallbackClassName="text-2xl bg-accent text-accent-foreground"
            />

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{profile.display_name}</h1>
                <Badge variant="outline" className={statusColors[profile.employment_status]}>
                  {statusLabels[profile.employment_status]}
                </Badge>
              </div>

              <p className="text-lg text-muted-foreground mb-3">{profile.job_title || "Sem cargo"}</p>

              <div className="flex flex-wrap gap-2">
                {profile.team && (
                  <Badge variant="secondary" className="gap-1">
                    <Building2 className="h-3 w-3" />
                    <TeamLink teamId={profile.team.id} teamName={profile.team.name} className="text-inherit hover:text-inherit hover:underline" />
                  </Badge>
                )}
                {(profile.work_mode === "remote" || profile.work_mode === "hybrid") && (
                  <Badge variant="outline" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    {profile.city}, {profile.state}
                  </Badge>
                )}
                <Badge variant="outline">{workModeLabels[profile.work_mode]}</Badge>
                {buMemberships && buMemberships.length > 0 && (
                  buMemberships.map((m: any) => (
                    <Badge key={m.id} variant="outline" className="gap-1">
                      {m.bu?.name}
                    </Badge>
                  ))
                )}
              </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Professional Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Informações Profissionais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cargo</p>
                    <p className="font-medium">{profile.job_title || "Sem cargo"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Modelo de trabalho</p>
                    <p className="font-medium">{workModeLabels[profile.work_mode]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Na Jet desde</p>
                    <p className="font-medium">{formatStartDate(profile.start_date)}</p>
                  </div>
                  {profile.team && (
                    <div>
                      <p className="text-sm text-muted-foreground">Time</p>
                      <div className="flex items-center gap-2">
                        <TeamLink teamId={profile.team.id} teamName={profile.team.name} />
                        {squads && squads.length > 0 && (
                          <span className="text-muted-foreground">
                            • {squads.map((s: any) => s.squad?.name).filter(Boolean).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>


            {/* KPIs */}
            {kpis && kpis.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    KPIs ({kpis.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {kpis.slice(0, 5).map((kpi: any) => {
                      const latestValue = kpi.values?.sort((a: any, b: any) => 
                        new Date(b.reference_date).getTime() - new Date(a.reference_date).getTime()
                      )[0];

                      return (
                        <Link
                          key={kpi.id}
                          to={`/kpis?kpi=${kpi.id}`}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                        >
                          <div>
                            <p className="font-medium">{kpi.name}</p>
                            {kpi.team && (
                              <p className="text-xs text-muted-foreground">{kpi.team.name}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {latestValue && (
                              <span className="text-sm font-medium">
                                {latestValue.value} {kpi.unit}
                              </span>
                            )}
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent" />
                          </div>
                        </Link>
                      );
                    })}
                    {kpis.length > 5 && (
                      <p className="text-sm text-muted-foreground text-center">
                        +{kpis.length - 5} KPIs
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Manager */}
            {profile.manager && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Gestor</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link
                    to={`/users/${profile.manager.id}`}
                    className="flex items-center gap-3 p-2 -m-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <OptimizedAvatar 
                      src={profile.manager.photo_url} 
                      fallback={getInitials(profile.manager.display_name)}
                      size="sm"
                      className="h-10 w-10"
                    />
                    <span className="font-medium">{profile.manager.display_name}</span>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Squads */}
            {squads && squads.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Squads ({squads.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {squads.map((membership: any) => (
                      <div
                        key={membership.id}
                        className="p-2 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{membership.squad?.name}</span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {membership.role}
                          </Badge>
                        </div>
                        {membership.squad?.team && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {membership.squad.team.name}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {/* Email */}
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a 
                    href={`mailto:${profile.work_email}`}
                    className="text-primary hover:underline truncate"
                  >
                    {profile.work_email}
                  </a>
                </div>

                {/* Google Chat */}
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a 
                    href={`https://chat.google.com/dm/${profile.work_email}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Abrir no Google Chat
                  </a>
                </div>

                {/* WhatsApp */}
                {profile.whatsapp_personal && (
                  <PhoneLink phone={profile.whatsapp_personal} />
                )}

                {/* Birthday */}
                {profile.birth_day && profile.birth_month && (
                  <div className="flex items-center gap-2">
                    <Cake className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>{profile.birth_day} de {monthNames[profile.birth_month - 1]}</span>
                  </div>
                )}

                {/* Location */}
                {(profile.work_mode === "remote" || profile.work_mode === "hybrid") && profile.city && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>{profile.city}, {profile.state}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Social Media */}
            {(profile.instagram_id || profile.discord_id) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Redes Sociais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {profile.instagram_id && (
                    <div className="flex items-center gap-2">
                      <Instagram className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <a 
                        href={`https://instagram.com/${profile.instagram_id.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        @{profile.instagram_id.replace('@', '')}
                      </a>
                    </div>
                  )}
                  {profile.discord_id && (
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>{profile.discord_id}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </HubLayout>
  );
}