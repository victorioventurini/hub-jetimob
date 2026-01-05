import { useParams, useNavigate, Link } from "react-router-dom";
import { HubLayout } from "@/components/layout/HubLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  User,
  Building2,
  MapPin,
  Calendar,
  Briefcase,
  Target,
  BarChart3,
  Users,
  ChevronRight,
  Clock,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  usePublicProfile,
  useUserOkrs,
  useUserKpis,
  useUserSquads,
  useUserBuMemberships,
} from "@/hooks/usePublicProfile";
import { TeamLink } from "@/components/links";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { calculateProgress } from "@/modules/okrs/types";

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

const ragStatusColors: Record<string, string> = {
  green: "bg-success",
  yellow: "bg-warning",
  red: "bg-destructive",
};

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: profile, isLoading } = usePublicProfile(id);
  const { data: okrData } = useUserOkrs(profile?.id);
  const { data: kpis } = useUserKpis(profile?.id);
  const { data: squads } = useUserSquads(profile?.id);
  const { data: buMemberships } = useUserBuMemberships(profile?.id);

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
      return format(new Date(dateStr), "MMMM 'de' yyyy", { locale: ptBR });
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
            <Button onClick={() => navigate("/users")}>Voltar para Jetimobers</Button>
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
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="mt-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex flex-col sm:flex-row gap-6 flex-1">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarImage src={profile.photo_url || undefined} alt={profile.display_name} />
              <AvatarFallback className="text-2xl bg-accent text-accent-foreground">
                {getInitials(profile.display_name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{profile.display_name}</h1>
                <Badge variant="outline" className={statusColors[profile.employment_status]}>
                  {statusLabels[profile.employment_status]}
                </Badge>
              </div>

              <p className="text-lg text-muted-foreground mb-3">{profile.job_title}</p>

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
                    <p className="font-medium">{profile.job_title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Modelo de trabalho</p>
                    <p className="font-medium">{workModeLabels[profile.work_mode]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Na Jet desde</p>
                    <p className="font-medium capitalize">{formatStartDate(profile.start_date)}</p>
                  </div>
                  {profile.team && (
                    <div>
                      <p className="text-sm text-muted-foreground">Time</p>
                      <TeamLink teamId={profile.team.id} teamName={profile.team.name} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* OKRs */}
            {okrData && (okrData.objectives.length > 0 || okrData.keyResults.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    OKRs ({okrData.objectives.length} objetivos, {okrData.keyResults.length} KRs)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Objectives */}
                  {okrData.objectives.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">Objetivos</h4>
                      {okrData.objectives.map((obj: any) => {
                        const krs = obj.key_results || [];
                        const avgProgress = krs.length > 0
                          ? krs.reduce((acc: number, kr: any) => acc + calculateProgress(kr.baseline, kr.current_value, kr.target, kr.direction), 0) / krs.length
                          : 0;

                        return (
                          <Link
                            key={obj.id}
                            to={`/okrs?objective=${obj.id}`}
                            className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{obj.title}</span>
                                {obj.is_shared && (
                                  <Badge variant="outline" className="text-xs">Compartilhado</Badge>
                                )}
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent" />
                            </div>
                            <div className="flex items-center gap-3">
                              <Progress value={avgProgress} className="flex-1 h-2" />
                              <span className="text-sm text-muted-foreground w-12 text-right">
                                {Math.round(avgProgress)}%
                              </span>
                            </div>
                            {obj.team && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {obj.team.name}
                              </p>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {okrData.objectives.length > 0 && okrData.keyResults.length > 0 && (
                    <Separator />
                  )}

                  {/* Key Results */}
                  {okrData.keyResults.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">Key Results</h4>
                      {okrData.keyResults.slice(0, 5).map((kr: any) => {
                        const progress = calculateProgress(kr.baseline, kr.current_value, kr.target, kr.direction);

                        return (
                          <div
                            key={kr.id}
                            className="p-3 rounded-lg bg-muted/50"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{kr.title}</span>
                              <Badge variant="outline" className={ragStatusColors[kr.status] ? `${ragStatusColors[kr.status]} text-white border-0` : ""}>
                                {kr.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3">
                              <Progress value={progress} className="flex-1 h-2" />
                              <span className="text-sm text-muted-foreground w-12 text-right">
                                {Math.round(progress)}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs text-muted-foreground">
                                {kr.objective?.title} • {kr.team?.name}
                              </p>
                              {kr.last_checkin_at && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(kr.last_checkin_at), "dd/MM")}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {okrData.keyResults.length > 5 && (
                        <p className="text-sm text-muted-foreground text-center">
                          +{okrData.keyResults.length - 5} KRs
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile.manager.photo_url || undefined} />
                      <AvatarFallback className="bg-accent/10 text-accent">
                        {getInitials(profile.manager.display_name)}
                      </AvatarFallback>
                    </Avatar>
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
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Desde:</span>
                  <span className="capitalize">{formatStartDate(profile.start_date)}</span>
                </div>
                {(profile.work_mode === "remote" || profile.work_mode === "hybrid") && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.city}, {profile.state}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </HubLayout>
  );
}
