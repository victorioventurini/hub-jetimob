/**
 * WizardsPage - Central hub for all OKR wizards
 * 
 * Lists all available wizards organized by module and user role.
 * Visibility is controlled by user permissions and role context.
 * 
 * URL State: ?wizard=<id>&team=<teamId>&step=<stepIndex>
 * Shareable links allow reopening a wizard directly.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { HubLayout } from '@/components/layout/HubLayout';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Target, 
  Users, 
  ClipboardCheck, 
  Briefcase, 
  Crown,
  User,
  ArrowRight,
  Sparkles,
  BarChart3,
  Settings2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useLeaderTeams } from '@/modules/home/hooks/useLeaderTeams';
import { useHierarchicalTeamList } from '@/modules/teams/hooks/useTeams';
import { useIdentity } from '@/hooks/useIdentity';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUrlState, parsers } from '@/shared/url';

// Wizard imports
import { CollaboratorWizard } from '@/modules/okrs/components/wizards/collaborator/CollaboratorWizard';
import { LeaderPrepWizard } from '@/modules/okrs/components/wizards/leader-prep/LeaderPrepWizard';
import { TeamCheckinWizard } from '@/modules/okrs/components/wizards/team-checkin/TeamCheckinWizard';
import { ManagersCheckinWizard } from '@/modules/okrs/components/wizards/managers-checkin/ManagersCheckinWizard';
import { CLevelCheckinWizard } from '@/modules/okrs/components/wizards/clevel-checkin/CLevelCheckinWizard';
import { TeamOkrCreationWizard } from '@/modules/okrs/components/wizards/team-okr-creation/TeamOkrCreationWizard';

// ============================================================
// TYPES
// ============================================================

interface WizardDefinition {
  id: string;
  name: string;
  description: string;
  icon: typeof Target;
  module: 'okrs';
  requiredRole: 'collaborator' | 'leader' | 'manager' | 'executive' | 'admin';
  permissionKey?: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'outline';
  requiresTeam?: boolean;
}

interface WizardSection {
  title: string;
  description: string;
  icon: typeof Target;
  wizards: WizardDefinition[];
}

// ============================================================
// WIZARD DEFINITIONS
// ============================================================

const WIZARD_SECTIONS: WizardSection[] = [
  {
    title: 'OKRs - Colaboradores',
    description: 'Wizards para check-in e atualização individual',
    icon: User,
    wizards: [
      {
        id: 'collaborator-checkin',
        name: 'Check-in Semanal',
        description: 'Atualize seus KRs e reflita sobre o progresso da semana',
        icon: ClipboardCheck,
        module: 'okrs',
        requiredRole: 'collaborator',
        badge: 'Sexta-feira',
        badgeVariant: 'outline',
        requiresTeam: false,
      },
    ],
  },
  {
    title: 'OKRs - Líderes de Time',
    description: 'Wizards para gestão de OKRs do time',
    icon: Users,
    wizards: [
      {
        id: 'team-okr-creation',
        name: 'Criar OKRs do Time',
        description: 'Defina objetivos e resultados-chave com alinhamento estratégico',
        icon: Target,
        module: 'okrs',
        requiredRole: 'leader',
        permissionKey: 'okrs.team_objective.create:team',
        badge: 'Início de Ciclo',
        badgeVariant: 'default',
        requiresTeam: true,
      },
      {
        id: 'leader-prep',
        name: 'Preparação do Check-in',
        description: 'Prepare-se para conduzir um bom check-in com seu time',
        icon: Settings2,
        module: 'okrs',
        requiredRole: 'leader',
        badge: 'Segunda-feira',
        badgeVariant: 'outline',
        requiresTeam: true,
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
      },
    ],
  },
  {
    title: 'OKRs - Gestores e Executivos',
    description: 'Wizards para alinhamento estratégico e cross-functional',
    icon: Crown,
    wizards: [
      {
        id: 'managers-checkin',
        name: 'Check-in de Gestores',
        description: 'Alinhamento entre áreas e resolução de dependências',
        icon: Briefcase,
        module: 'okrs',
        requiredRole: 'manager',
        badge: 'Cross-team',
        badgeVariant: 'secondary',
        requiresTeam: false,
      },
      {
        id: 'clevel-checkin',
        name: 'Check-in Estratégico',
        description: 'Visão estratégica e direcionamentos para a empresa',
        icon: BarChart3,
        module: 'okrs',
        requiredRole: 'executive',
        badge: 'C-Level',
        badgeVariant: 'secondary',
        requiresTeam: false,
      },
    ],
  },
];

// ============================================================
// COMPONENT
// ============================================================

export default function WizardsPage() {
  const navigate = useNavigate();
  // SEO
  usePageTitle('Wizards', {
    customDescription: 'Fluxos guiados para gestão de OKRs, check-ins e criação de metas no Hub.',
  });

  const { profile, isAdmin, role } = useAuth();
  const { has } = usePermissions();
  const { isLeader, teams: leaderTeams, isLoading: isLoadingLeaderTeams } = useLeaderTeams();
  const { teams: allTeams, isLoading: isLoadingAllTeams } = useHierarchicalTeamList();
  const { profileId } = useIdentity();
  
  // Check if user is super_admin
  const isSuperAdmin = role === 'super_admin';
  
  // URL State - only tracks which wizard is open
  const wizardState = useUrlState<string | null>({ key: 'wizard', defaultValue: null }, { navigationMode: 'replace' });

  // Selected team for leader wizards (local state only, not in URL)
  const [selectedTeam, setSelectedTeam] = useState<{ id: string; name: string } | null>(null);

  // Selected user for admin impersonation in collaborator wizard (local state only, not in URL)
  const [collaboratorUserId, setCollaboratorUserId] = useState<string | null>(null);

  // Auto-select first team when wizard opens if none selected
  // For admins: use allTeams if not a leader
  useEffect(() => {
    if (wizardState.value && !selectedTeam) {
      // First try leader teams
      if (leaderTeams?.length) {
        const firstTeam = leaderTeams[0];
        setSelectedTeam({ id: firstTeam.team_id, name: firstTeam.team_name });
      } 
      // For admins, fallback to all teams
      else if ((isSuperAdmin || isAdmin) && allTeams?.length) {
        const firstTeam = allTeams[0];
        setSelectedTeam({ id: firstTeam.id, name: firstTeam.name });
      }
    }
  }, [wizardState.value, selectedTeam, leaderTeams, allTeams, isSuperAdmin, isAdmin]);

  // Determine user role hierarchy
  const userRoles = useMemo(() => {
    const roles: Set<string> = new Set(['collaborator']); // Everyone is at least a collaborator
    
    if (isLeader) roles.add('leader');
    if (isAdmin) {
      roles.add('manager');
      roles.add('leader');
    }
    if (isSuperAdmin) {
      roles.add('executive');
      roles.add('manager');
      roles.add('leader');
      roles.add('admin');
    }
    
    return roles;
  }, [isLeader, isAdmin, isSuperAdmin]);

  // Check if user can access a wizard
  const canAccessWizard = useCallback((wizard: WizardDefinition): boolean => {
    // Check role requirement
    if (!userRoles.has(wizard.requiredRole)) {
      // Super admin and admin can access all wizards
      if (!isSuperAdmin && !isAdmin) return false;
    }
    
    // Check specific permission if required
    if (wizard.permissionKey && !has(wizard.permissionKey)) {
      // Admin bypass
      if (!isSuperAdmin && !isAdmin) return false;
    }
    
    return true;
  }, [userRoles, has, isSuperAdmin, isAdmin]);

  // Filter sections based on user access
  const visibleSections = useMemo(() => {
    return WIZARD_SECTIONS.map(section => ({
      ...section,
      wizards: section.wizards.filter(canAccessWizard),
    })).filter(section => section.wizards.length > 0);
  }, [canAccessWizard]);

  // Handle wizard open
  const handleWizardOpen = useCallback((wizardId: string, wizard?: WizardDefinition) => {
    // For team-okr-creation, navigate to full-page wizard
    if (wizardId === 'team-okr-creation') {
      const firstLeaderTeam = leaderTeams?.[0];
      const firstAnyTeam = allTeams?.[0];
      const teamToUse = firstLeaderTeam 
        ? firstLeaderTeam.team_id 
        : ((isSuperAdmin || isAdmin) && firstAnyTeam) 
          ? firstAnyTeam.id 
          : null;
      
      if (teamToUse) {
        navigate(`/okrs/create?team=${teamToUse}`);
      } else {
        toast.error('Selecione um time para criar OKRs');
      }
      return;
    }

    // Reset collaborator impersonation when (re)opening collaborator wizard
    if (wizardId === 'collaborator-checkin') {
      setCollaboratorUserId(null);
    }

    // For leader wizards, use first team if available and none selected
    if (wizard?.requiresTeam && !selectedTeam) {
      const firstLeaderTeam = leaderTeams?.[0];
      const firstAnyTeam = allTeams?.[0];
      
      if (firstLeaderTeam) {
        setSelectedTeam({ id: firstLeaderTeam.team_id, name: firstLeaderTeam.team_name });
      } else if ((isSuperAdmin || isAdmin) && firstAnyTeam) {
        setSelectedTeam({ id: firstAnyTeam.id, name: firstAnyTeam.name });
      }
    }

    // Update URL state (only wizard ID)
    wizardState.set(wizardId);
  }, [selectedTeam, leaderTeams, allTeams, wizardState, isSuperAdmin, isAdmin, navigate]);


  // Handle wizard close
  const handleWizardClose = useCallback(() => {
    wizardState.set(null);
    setSelectedTeam(null);
    setCollaboratorUserId(null);
  }, [wizardState]);


  // Derived wizard open states from URL
  const collaboratorWizardOpen = wizardState.value === 'collaborator-checkin';
  const leaderPrepWizardOpen = wizardState.value === 'leader-prep';
  const teamCheckinWizardOpen = wizardState.value === 'team-checkin';
  const managersWizardOpen = wizardState.value === 'managers-checkin';
  const clevelWizardOpen = wizardState.value === 'clevel-checkin';
  const teamOkrCreationWizardOpen = wizardState.value === 'team-okr-creation';

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Wizards"
          description="Fluxos guiados para gestão de OKRs"
        />

        {visibleSections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum wizard disponível</h3>
              <p className="text-muted-foreground">
                Você não tem permissão para acessar nenhum wizard no momento.
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
                      onClick={() => handleWizardOpen(wizard.id, wizard)}
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
                          Iniciar wizard
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

        {/* Wizard Modals */}
        {collaboratorWizardOpen && (
          <CollaboratorWizard
            open={collaboratorWizardOpen}
            userId={collaboratorUserId ?? undefined}
            onUserChange={(newUserId) => setCollaboratorUserId(newUserId)}
            onOpenChange={(open) => {
              if (!open) handleWizardClose();
            }}
          />
        )}


        {leaderPrepWizardOpen && selectedTeam && (
          <LeaderPrepWizard
            open={leaderPrepWizardOpen}
            onOpenChange={(open) => !open && handleWizardClose()}
            teamId={selectedTeam.id}
            teamName={selectedTeam.name}
            onTeamChange={(teamId, teamName) => {
              setSelectedTeam({ id: teamId, name: teamName });
            }}
          />
        )}

        {teamCheckinWizardOpen && selectedTeam && (
          <TeamCheckinWizard
            open={teamCheckinWizardOpen}
            onOpenChange={(open) => !open && handleWizardClose()}
            teamId={selectedTeam.id}
            teamName={selectedTeam.name}
            onTeamChange={(teamId, teamName) => {
              setSelectedTeam({ id: teamId, name: teamName });
            }}
          />
        )}

        {managersWizardOpen && (
          <ManagersCheckinWizard
            open={managersWizardOpen}
            onOpenChange={(open) => !open && handleWizardClose()}
          />
        )}

        {clevelWizardOpen && (
          <CLevelCheckinWizard
            open={clevelWizardOpen}
            onOpenChange={(open) => !open && handleWizardClose()}
          />
        )}

        {/* TeamOkrCreationWizard now uses full-page at /okrs/create */}
      </div>
    </HubLayout>
  );
}
