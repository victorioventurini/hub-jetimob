import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useUrlTab } from "@/shared/url";
import { HubLayout } from "@/components/layout/HubLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OptimizedAvatar } from "@/components/ui/optimized-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  FolderKanban,
  Target,
  Rocket,
  LayoutGrid,
} from "lucide-react";
import { PhoneLink } from "@/components/ui/phone-link";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  usePublicProfile,
  useUserKpis,
  useUserSquads,
  useUserBuMemberships,
  useUserOkrs,
  useUserContributedKpis,
} from "@/hooks/usePublicProfile";
import { TeamLink } from "@/components/links";
import { useBu } from "@/contexts/BuContext";
import { useExternalProfileRedirect } from "@/hooks/useExternalProfileRedirect";
import { useProjects } from "@/modules/projects/hooks";
import { ProjectCard } from "@/modules/projects/components/ProjectCard";
import { ProjectStatusSummary } from "@/modules/projects/components/ProjectStatusSummary";
import { useUserInitiatives } from "@/modules/okrs/hooks/useInitiatives";
import { InitiativeCard } from "@/modules/okrs/components/initiatives";
import { OkrProgressBar } from "@/modules/okrs/components/OkrProgressBar";
import { useActiveCycle } from "@/modules/okrs/hooks/useActiveCycle";
import { cn } from "@/lib/utils";


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

type EngagementTab = "overview" | "projects" | "okrs" | "initiatives" | "kpis";

interface KpiRowProps {
  to: string;
  name: string;
  teamName?: string;
  rightContent?: React.ReactNode;
  badge?: React.ReactNode;
}

function KpiRow({ to, name, teamName, rightContent, badge }: KpiRowProps) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{name}</p>
          {badge}
        </div>
        {teamName && (
          <p className="text-xs text-muted-foreground truncate">{teamName}</p>
        )}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {rightContent}
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent" />
      </div>
    </Link>
  );
}

function EmptyState({ icon: Icon, message }: { icon: typeof FolderKanban; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Icon className="h-10 w-10 text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  useExternalProfileRedirect(id);
  const { data: profile, isLoading } = usePublicProfile(id);
  const { data: squads } = useUserSquads(profile?.id);
  const { data: buMemberships } = useUserBuMemberships(profile?.id);
  const { currentBu } = useBu();
  const { activeCycle } = useActiveCycle();
  const activeCycleId = activeCycle?.id ?? null;

  const [activeTab, setActiveTab] = useUrlTab<EngagementTab>("overview");
  const profileId = profile?.id;




  // Lazy-fetch per tab — overview also needs all of them for counts
  const fetchProjects = !!profileId && (activeTab === "overview" || activeTab === "projects");
  const fetchOkrs = !!profileId && (activeTab === "overview" || activeTab === "okrs");
  const fetchInitiatives = !!profileId && (activeTab === "overview" || activeTab === "initiatives");
  const fetchKpis = !!profileId && (activeTab === "overview" || activeTab === "kpis");

  const { data: projects, isLoading: loadingProjects } = useProjects(
    fetchProjects ? { owner_id: profileId } : {}
  );
  // OKRs/KRs e Iniciativas filtrados pelo ciclo ativo da BU (fallback: todos os ciclos quando não houver ciclo ativo)
  const { data: okrsData, isLoading: loadingOkrs } = useUserOkrs(
    fetchOkrs ? profileId : undefined,
    activeCycleId
  );
  const { data: initiatives, isLoading: loadingInitiatives } = useUserInitiatives(
    fetchInitiatives ? profileId : undefined,
    activeCycleId
  );
  const { data: kpis, isLoading: loadingKpis } = useUserKpis(
    fetchKpis ? profileId : undefined
  );
  const { data: contributedKpis, isLoading: loadingContributedKpis } = useUserContributedKpis(
    fetchKpis ? profileId : undefined
  );

  // Filter initiatives to current BU only (useUserInitiatives is global to user)
  const buInitiatives = useMemo(() => {
    if (!initiatives || !currentBu?.id) return [];
    return initiatives.filter((i: any) => i.bu_id === currentBu.id);
  }, [initiatives, currentBu?.id]);

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

  const projectsCount = projects?.length ?? 0;
  const objectivesCount = okrsData?.objectives?.length ?? 0;
  const krsCount = okrsData?.keyResults?.length ?? 0;
  const initiativesCount = buInitiatives.length;
  const ownedKpisCount = kpis?.length ?? 0;
  const contributedKpisCount = contributedKpis?.length ?? 0;
  const totalKpisCount = ownedKpisCount + contributedKpisCount;

  return (
    <HubLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          title={profile.display_name}
          description={profile.job_title || "Sem cargo"}
          breadcrumbs={[
            { label: "Jetimobers", href: "/users" },
            { label: profile.display_name }
          ]}
          actions={
            <Badge variant="outline" className={statusColors[profile.employment_status]}>
              {statusLabels[profile.employment_status]}
            </Badge>
          }
        />

        {/* Profile header */}
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
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Professional info */}
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

            {/* Atuação na BU */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Atuação em {currentBu?.name || "esta BU"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EngagementTab)}>
                  <TabsList className="grid grid-cols-5 w-full h-auto">
                    <TabsTrigger value="overview" className="text-xs">Visão geral</TabsTrigger>
                    <TabsTrigger value="projects" className="text-xs">
                      Projetos {projectsCount > 0 && <span className="ml-1 text-muted-foreground">({projectsCount})</span>}
                    </TabsTrigger>
                    <TabsTrigger value="okrs" className="text-xs">
                      KRs {krsCount > 0 && <span className="ml-1 text-muted-foreground">({krsCount})</span>}
                    </TabsTrigger>
                    <TabsTrigger value="initiatives" className="text-xs">
                      Iniciativas {initiativesCount > 0 && <span className="ml-1 text-muted-foreground">({initiativesCount})</span>}
                    </TabsTrigger>
                    <TabsTrigger value="kpis" className="text-xs">
                      KPIs {totalKpisCount > 0 && <span className="ml-1 text-muted-foreground">({totalKpisCount})</span>}
                    </TabsTrigger>
                  </TabsList>

                  {/* Overview */}
                  <TabsContent value="overview" className="mt-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveTab("projects")}
                        className="text-left p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <FolderKanban className="h-4 w-4" />
                          <span className="text-xs">Projetos</span>
                        </div>
                        <p className="text-2xl font-bold mt-2">{projectsCount}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("okrs")}
                        className="text-left p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Target className="h-4 w-4" />
                          <span className="text-xs">OKRs / KRs</span>
                        </div>
                        <p className="text-2xl font-bold mt-2">
                          {objectivesCount}<span className="text-base text-muted-foreground"> / {krsCount}</span>
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("initiatives")}
                        className="text-left p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Rocket className="h-4 w-4" />
                          <span className="text-xs">Iniciativas</span>
                        </div>
                        <p className="text-2xl font-bold mt-2">{initiativesCount}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("kpis")}
                        className="text-left p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <BarChart3 className="h-4 w-4" />
                          <span className="text-xs">KPIs</span>
                        </div>
                        <p className="text-2xl font-bold mt-2">
                          {ownedKpisCount}
                          {contributedKpisCount > 0 && (
                            <span className="text-base text-muted-foreground"> +{contributedKpisCount}</span>
                          )}
                        </p>
                      </button>
                    </div>
                  </TabsContent>

                  {/* Projects */}
                  <TabsContent value="projects" className="mt-6 space-y-4">
                    {loadingProjects ? (
                      <div className="space-y-3">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-32 w-full" />
                      </div>
                    ) : projectsCount === 0 ? (
                      <EmptyState icon={FolderKanban} message="Nenhum projeto sob responsabilidade nesta BU." />
                    ) : (
                      <>
                        <ProjectStatusSummary projects={projects || []} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(projects || []).map((p) => (
                            <Link key={p.id} to={`/projects/${p.id}`} className="block">
                              <ProjectCard project={p} />
                            </Link>
                          ))}
                        </div>
                      </>
                    )}
                  </TabsContent>

                  {/* OKRs & KRs */}
                  <TabsContent value="okrs" className="mt-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {activeCycle
                          ? "Exibindo registros do ciclo ativo desta BU."
                          : "BU sem ciclo ativo — exibindo todos os registros."}
                      </p>
                      {activeCycle && (
                        <Badge variant="outline" className="text-xs">
                          Ciclo: {activeCycle.name}
                        </Badge>
                      )}
                    </div>
                    {loadingOkrs ? (
                      <div className="space-y-3">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ) : objectivesCount === 0 && krsCount === 0 ? (
                      <EmptyState
                        icon={Target}
                        message={
                          activeCycle
                            ? `Nenhum OKR ou KR neste ciclo (${activeCycle.name}).`
                            : "Nenhum OKR ou KR sob responsabilidade nesta BU."
                        }
                      />
                    ) : (
                      <>
                        {objectivesCount > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">
                              Objetivos ({objectivesCount})
                            </h4>
                            <div className="space-y-2">
                              {(okrsData?.objectives || []).map((obj: any) => (
                                <Link
                                  key={obj.id}
                                  to={`/okrs?objective=${obj.id}`}
                                  className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <p className="font-medium text-sm">{obj.title}</p>
                                      {obj.team && (
                                        <p className="text-xs text-muted-foreground mt-0.5">{obj.team.name}</p>
                                      )}
                                    </div>
                                    <Badge variant="outline" className="text-xs flex-shrink-0">
                                      {obj.key_results?.length ?? 0} KRs
                                    </Badge>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                        {krsCount > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">
                              Resultados-Chave ({krsCount})
                            </h4>
                            <div className="space-y-3">
                              {(okrsData?.keyResults || []).map((kr: any) => (
                                <Link
                                  key={kr.id}
                                  to={`/okrs?kr=${kr.id}`}
                                  className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors space-y-2"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <p className="font-medium text-sm">{kr.title}</p>
                                      {kr.objective?.title && (
                                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                          {kr.objective.title}
                                        </p>
                                      )}
                                    </div>
                                    {kr.team && (
                                      <Badge variant="outline" className="text-xs flex-shrink-0">
                                        {kr.team.name}
                                      </Badge>
                                    )}
                                  </div>
                                  <OkrProgressBar
                                    baseline={kr.baseline ?? 0}
                                    current={kr.current_value ?? 0}
                                    target={kr.target ?? 0}
                                    direction={kr.direction}
                                    status={kr.status}
                                    size="sm"
                                  />
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </TabsContent>

                  {/* Initiatives */}
                  <TabsContent value="initiatives" className="mt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {activeCycle
                          ? "Exibindo iniciativas vinculadas a KRs do ciclo ativo."
                          : "BU sem ciclo ativo — exibindo todas as iniciativas."}
                      </p>
                      {activeCycle && (
                        <Badge variant="outline" className="text-xs">
                          Ciclo: {activeCycle.name}
                        </Badge>
                      )}
                    </div>
                    {loadingInitiatives ? (
                      <div className="space-y-3">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ) : initiativesCount === 0 ? (
                      <EmptyState
                        icon={Rocket}
                        message={
                          activeCycle
                            ? `Nenhuma iniciativa neste ciclo (${activeCycle.name}).`
                            : "Nenhuma iniciativa sob responsabilidade nesta BU."
                        }
                      />
                    ) : (
                      <div className="space-y-3">
                        {buInitiatives.map((initiative: any) => (
                          <InitiativeCard
                            key={initiative.id}
                            initiative={initiative}
                            showKrInfo
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* KPIs */}
                  <TabsContent value="kpis" className="mt-6 space-y-6">
                    {(loadingKpis || loadingContributedKpis) ? (
                      <div className="space-y-3">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    ) : totalKpisCount === 0 ? (
                      <EmptyState icon={BarChart3} message="Nenhum KPI sob responsabilidade nesta BU." />
                    ) : (
                      <>
                        {ownedKpisCount > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">
                              KPIs próprios ({ownedKpisCount})
                            </h4>
                            <div className="space-y-2">
                              {(kpis || []).map((kpi: any) => {
                                const latestValue = kpi.values?.sort((a: any, b: any) =>
                                  new Date(b.reference_date).getTime() - new Date(a.reference_date).getTime()
                                )[0];
                                return (
                                  <KpiRow
                                    key={kpi.id}
                                    to={`/kpis/${kpi.id}`}
                                    name={kpi.name}
                                    teamName={kpi.team?.name}
                                    rightContent={
                                      latestValue && (
                                        <span className="text-sm font-medium">
                                          {latestValue.value} {kpi.unit}
                                        </span>
                                      )
                                    }
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {contributedKpisCount > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">
                              KPIs onde contribui ({contributedKpisCount})
                            </h4>
                            <div className="space-y-2">
                              {(contributedKpis || []).map((kpi: any) => (
                                <KpiRow
                                  key={kpi.id}
                                  to={`/kpis/${kpi.id}`}
                                  name={kpi.name}
                                  teamName={kpi.team?.name}
                                  badge={
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                      Contribuidor
                                    </Badge>
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
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

            {/* Contato */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a
                    href={`mailto:${profile.work_email}`}
                    className="text-primary hover:underline truncate"
                  >
                    {profile.work_email}
                  </a>
                </div>

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

                {profile.whatsapp_personal && (
                  <PhoneLink phone={profile.whatsapp_personal} />
                )}

                {cpfDisplay && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>CPF: <span className="font-mono">{cpfDisplay}</span></span>
                  </div>
                )}

                {profile.birth_day && profile.birth_month && (
                  <div className="flex items-center gap-2">
                    <Cake className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>{profile.birth_day} de {monthNames[profile.birth_month - 1]}</span>
                  </div>
                )}

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
