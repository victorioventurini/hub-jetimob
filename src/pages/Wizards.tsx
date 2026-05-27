/**
 * WizardsPage - Central next for all OKR rituals (wizards)
 * 
 * Lists all available rituals organized by module and user role.
 * Visibility is controlled by user permissions and role context.
 * QBR wizards appear dynamically based on the active cycle's qbr_status.
 */

import { useMemo, useCallback } from 'react';
import { HubLayout as NextLayout } from '@/components/layout/HubLayout';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Target, 
  Users, 
  ClipboardCheck, 
  Briefcase, 
  Crown,
  User,
  ArrowRight,
  Rocket,
  BarChart3,
  Settings2,
  Presentation,
  History,
  Inbox,
  Sparkles,
  Megaphone,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useLeaderTeams } from '@/modules/home/hooks/useLeaderTeams';
import { useHierarchicalTeamList } from '@/modules/teams/hooks';
import { useIsAreaLeader } from '@/modules/okrs/hooks/useIsAreaLeader';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useActiveCycle, useTeamOkrCreationWindow } from '@/modules/okrs/hooks';
import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { qbrKeys } from '@/lib/queryKeys/okrs';

// ============================================================
// TYPES
// ============================================================

type QbrStatus = 'closed' | 'open' | 'collecting' | 'reviewing' | 'ready' | 'done';

interface WizardDefinition {
  id: string;
  name: string;
  description: string;
  icon: typeof Target;
  module: 'okrs';
  requiredRole: 'collaborator' | 'leader' | 'area-leader' | 'manager' | 'executive' | 'admin';
  permissionKey?: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'outline';
  requiresTeam?: boolean;
  route: string;
}

interface WizardSection {
  title: string;
  description: string;
  icon: typeof Target;
  wizards: WizardDefinition[];
}

// ============================================================
// STATIC WIZARD DEFINITIONS
// ============================================================

const WIZARD_SECTIONS: WizardSection[] = [
  {
    title: 'OKRs – Colaboradores',
    description: 'Rituais para check-in e atualização individual',
    icon: User,
    wizards: [
      {
        id: 'collaborator-checkin',
        name: 'Check-in Individual',
        description: 'Atualize seus KRs e reflita sobre o progresso da semana',
        icon: ClipboardCheck,
        module: 'okrs',
        requiredRole: 'collaborator',
        badge: 'Sexta-feira',
        badgeVariant: 'outline',
        requiresTeam: false,
        route: '/rituals/collaborator-checkin',
      },
    ],
  },
  {
    title: 'OKRs – Líderes de Time',
    description: 'Rituais para gestão de OKRs do time',
    icon: Users,
    wizards: [
      {
        id: 'team-okr-creation',
        name: 'Criação de OKRs do Time',
        description: 'Defina objetivos e resultados-chave com alinhamento estratégico',
        icon: Target,
        module: 'okrs',
        requiredRole: 'leader',
        permissionKey: 'okrs.team_objective.create:team',
        badge: 'Início de Ciclo',
        badgeVariant: 'default',
        requiresTeam: true,
        route: '/okrs/create',
      },
      {
        id: 'leader-prep',
        name: 'Pré-Check-in do Time',
        description: 'Prepare-se para conduzir um bom check-in com seu time',
        icon: Settings2,
        module: 'okrs',
        requiredRole: 'leader',
        badge: 'Segunda-feira',
        badgeVariant: 'outline',
        requiresTeam: true,
        route: '/rituals/team-checkin-pre',
      },
      {
        id: 'team-checkin',
        name: 'Check-in do Time',
        description: 'Conduza o check-in coletivo com seu time',
        icon: Users,
        module: 'okrs',
        requiredRole: 'leader',
        badge: 'Durante reunião',
        badgeVariant: 'outline',
        requiresTeam: true,
        route: '/rituals/team-checkin',
      },
      {
        id: 'pre-weekly',
        name: 'Pré-Weekly',
        description: 'Destile sua semana antes da Weekly da BU',
        icon: Inbox,
        module: 'okrs',
        requiredRole: 'leader',
        badge: 'Semanal',
        badgeVariant: 'outline',
        requiresTeam: false,
        route: '/rituals/pre-weekly',
      },
      {
        id: 'weekly',
        name: 'Weekly',
        description: 'Rito executivo semanal da BU com curadoria orquestrada',
        icon: Sparkles,
        module: 'okrs',
        requiredRole: 'area-leader',
        badge: 'Terça-feira',
        badgeVariant: 'outline',
        requiresTeam: false,
        route: '/rituals/weekly',
      },
      {
        id: 'mbr-pre',
        name: 'Pré-MBR',
        description: 'Prepare o contexto do seu time para o MBR',
        icon: Briefcase,
        module: 'okrs',
        requiredRole: 'leader',
        badge: 'Mensal',
        badgeVariant: 'secondary',
        requiresTeam: true,
        route: '/rituals/mbr-pre',
      },
    ],
  },
  {
    title: 'OKRs – Gestores e Executivos',
    description: 'Rituais para alinhamento estratégico e cross-functional',
    icon: Crown,
    wizards: [
      // 'clevel-checkin' removido — rito descontinuado.
      {
        id: 'mbr',
        name: 'MBR',
        description: 'Revisão mensal de KPIs e OKRs com decisões estratégicas',
        icon: Briefcase,
        module: 'okrs',
        requiredRole: 'executive',
        badge: 'Mensal',
        badgeVariant: 'secondary',
        requiresTeam: false,
        route: '/rituals/mbr',
      },
    ],
  },
  {
    title: 'Comunicação da BU',
    description: 'Rituais abertos da BU',
    icon: Megaphone,
    wizards: [
      {
        id: 'all-hands',
        name: 'All Hands',
        description: 'Apresentação mensal aberta da BU com KPIs e OKRs organizacionais',
        icon: Megaphone,
        module: 'okrs',
        requiredRole: 'admin',
        badge: 'Mensal',
        badgeVariant: 'secondary',
        requiresTeam: false,
        route: '/rituals/all-hands',
      },
    ],
  },
];

// ============================================================
// QBR WIZARD BUILDERS (dynamic based on qbr_status)
// ============================================================

function getQbrLeaderWizards(qbrStatus: QbrStatus): WizardDefinition[] {
  if (qbrStatus !== 'open' && qbrStatus !== 'collecting') return [];
  return [
    {
      id: 'qbr-pre',
      name: 'Pré-QBR',
      description: 'Balanço do ciclo, KPIs e proposta de novos OKRs',
      icon: Presentation,
      module: 'okrs',
      requiredRole: 'leader',
      badge: 'Trimestral',
      badgeVariant: 'secondary',
      requiresTeam: true,
      route: '/rituals/qbr-pre',
    },
  ];
}

function getQbrExecutiveWizards(qbrStatus: QbrStatus): WizardDefinition[] {
  const wizards: WizardDefinition[] = [];

  if (qbrStatus === 'open' || qbrStatus === 'collecting' || qbrStatus === 'reviewing') {
    wizards.push({
      id: 'qbr-pre-clevel',
      name: 'Pré-QBR Executivo',
      description: 'Análise estratégica consolidada e direcionamentos',
      icon: Presentation,
      module: 'okrs',
      requiredRole: 'executive',
      badge: 'Trimestral',
      badgeVariant: 'secondary',
      requiresTeam: false,
      route: '/rituals/qbr-clevel',
    });
  }

  if (qbrStatus === 'reviewing') {
    wizards.push({
      id: 'qbr-meeting',
      name: 'QBR',
      description: 'Apresentação, aprovação de OKRs e decisões estratégicas',
      icon: Presentation,
      module: 'okrs',
      requiredRole: 'executive',
      badge: 'Trimestral',
      badgeVariant: 'secondary',
      requiresTeam: false,
      route: '/rituals/qbr',
    });
  }

  if (qbrStatus === 'ready') {
    wizards.push({
      id: 'qbr-post',
      name: 'Pós-QBR',
      description: 'Promoção de OKRs aprovados, ata e follow-up',
      icon: Presentation,
      module: 'okrs',
      requiredRole: 'executive',
      badge: 'Trimestral',
      badgeVariant: 'secondary',
      requiresTeam: false,
      route: '/rituals/qbr-post',
    });
  }

  return wizards;
}

// ============================================================
// HOOK: useQbrStatus
// ============================================================

function useQbrStatus() {
  const supabase = useBuScopedSupabase();
  // Use status-based active cycle (not date-based) to correctly detect
  // cycles that are still formally active even after their end_date (e.g., during QBR period)
  const { activeQuarterlyCycle: quarterlyCycle } = useActiveCycle();

  const { data, isLoading } = useQuery({
    queryKey: qbrKeys.cycleStatusWizards(quarterlyCycle?.id),
    enabled: !!supabase && !!quarterlyCycle?.id,
    queryFn: async () => {
      const { data: row, error } = await supabase
        .from('cycles')
        .select('qbr_status')
        .eq('id', quarterlyCycle!.id)
        .single();
      if (error) throw error;
      return (row?.qbr_status as QbrStatus) || 'closed';
    },
    staleTime: 2 * 60 * 1000,
  });

  return { qbrStatus: (data as QbrStatus) || 'closed', isLoading };
}

// ============================================================
// COMPONENT
// ============================================================

export default function WizardsPage() {
  const navigate = useNavigate();
  
  usePageTitle('Rituais', {
    customDescription: 'Fluxos guiados para gestão de OKRs, check-ins e criação de metas no Next.',
  });

  const { has, isWildcard, isLoading: permissionsLoading } = usePermissions();
  const { isLeader, teams: leaderTeams } = useLeaderTeams();
  const { teams: allTeams } = useHierarchicalTeamList();
  const { qbrStatus, isLoading: qbrLoading } = useQbrStatus();
  const { isAreaLeader } = useIsAreaLeader();
  const { isOpen: isTeamOkrCreationOpen, isLoading: creationWindowLoading } = useTeamOkrCreationWindow();

  // Determine user role hierarchy
  const userRoles = useMemo(() => {
    const roles: Set<string> = new Set(['collaborator']);
    if (isLeader) roles.add('leader');
    if (isAreaLeader) roles.add('area-leader');
    if (isWildcard) {
      roles.add('manager');
      roles.add('leader');
      roles.add('area-leader');
      roles.add('executive');
      roles.add('admin');
    }
    return roles;
  }, [isLeader, isAreaLeader, isWildcard]);

  // Build sections with dynamic QBR wizards injected
  const sectionsWithQbr = useMemo(() => {
    return WIZARD_SECTIONS.map(section => {
      if (section.title === 'OKRs – Líderes de Time') {
        return {
          ...section,
          wizards: [...section.wizards, ...getQbrLeaderWizards(qbrStatus)],
        };
      }
      if (section.title === 'OKRs – Gestores e Executivos') {
        return {
          ...section,
          wizards: [...section.wizards, ...getQbrExecutiveWizards(qbrStatus)],
        };
      }
      return section;
    });
  }, [qbrStatus]);

  // Check if user can access a wizard
  const canAccessWizard = useCallback((wizard: WizardDefinition): boolean => {
    if (!userRoles.has(wizard.requiredRole)) {
      if (!isWildcard) return false;
    }
    if (wizard.permissionKey && !has(wizard.permissionKey)) {
      if (!isWildcard) return false;
    }
    // Janela do rito "Criação de OKRs do Time": exige quarter em planning,
    // exceto para admins (isWildcard ignora a janela).
    if (wizard.id === 'team-okr-creation' && !isWildcard && !isTeamOkrCreationOpen) {
      return false;
    }
    return true;
  }, [userRoles, has, isWildcard, isTeamOkrCreationOpen]);

  // Filter sections based on user access
  const visibleSections = useMemo(() => {
    return sectionsWithQbr
      .filter(section => {
        if (section.title === 'OKRs – Líderes de Time' && !userRoles.has('leader') && !isWildcard) {
          return false;
        }
        if (section.title === 'OKRs – Gestores e Executivos' && !userRoles.has('manager') && !isWildcard) {
          return false;
        }
        if (section.title === 'Comunicação da BU' && !isWildcard) {
          return false;
        }
        return true;
      })
      .map(section => ({
        ...section,
        wizards: section.wizards.filter(canAccessWizard),
      })).filter(section => section.wizards.length > 0);
  }, [canAccessWizard, userRoles, isWildcard, sectionsWithQbr]);

  // Handle wizard open
  const handleWizardOpen = useCallback((wizard: WizardDefinition) => {
    if (wizard.requiresTeam) {
      const firstLeaderTeam = leaderTeams?.[0];
      const firstAnyTeam = allTeams?.[0];
      const teamToUse = firstLeaderTeam 
        ? firstLeaderTeam.team_id 
        : (isWildcard && firstAnyTeam) 
          ? firstAnyTeam.id 
          : null;
      
      if (teamToUse) {
        navigate(`${wizard.route}?team=${teamToUse}`);
      } else {
        toast.error('Selecione um time para iniciar este ritual');
      }
      return;
    }
    navigate(wizard.route);
  }, [leaderTeams, allTeams, isWildcard, navigate]);

  const isLoading = permissionsLoading || qbrLoading || creationWindowLoading;

  return (
    <NextLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Rituais"
            description="Fluxos guiados para gestão de OKRs"
          />
          <Button variant="outline" size="sm" asChild>
            <Link to="/rituals/history" className="gap-2">
              <History className="h-4 w-4" />
              Histórico de Rituais
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-6 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Skeleton className="h-40" />
                  <Skeleton className="h-40" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleSections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Rocket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum ritual disponível</h3>
              <p className="text-muted-foreground">
                Você não tem permissão para acessar nenhum ritual no momento.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {visibleSections.map((section) => (
              <div key={section.title} className="space-y-4">
                {/* Section Header */}
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <section.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{section.title}</h2>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>

                {/* Wizard Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.wizards.map((wizard) => (
                    <Card 
                      key={wizard.id}
                      className="group hover:shadow-md transition-all cursor-pointer border-muted hover:border-primary/30"
                      onClick={() => handleWizardOpen(wizard)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <wizard.icon className="h-5 w-5 text-primary" />
                          </div>
                          {wizard.badge && (
                            <Badge variant={wizard.badgeVariant || 'outline'} className="text-xs">
                              {wizard.badge}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-base mt-3">{wizard.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {wizard.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-between group-hover:bg-primary/5"
                        >
                          Iniciar ritual
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Separator className="mt-6" />
              </div>
            ))}
          </div>
        )}
      </div>
    </NextLayout>
  );
}
