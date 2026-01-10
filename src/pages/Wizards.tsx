/**
 * WizardsPage - Central hub for all OKR wizards
 * 
 * Lists all available wizards organized by module and user role.
 * Visibility is controlled by user permissions and role context.
 */

import { useState, useMemo } from 'react';
import { HubLayout } from '@/components/layout/HubLayout';
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
  Calendar,
  BarChart3,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useLeaderTeams } from '@/modules/home/hooks/useLeaderTeams';
import { useIdentity } from '@/hooks/useIdentity';

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
      },
    ],
  },
];

// ============================================================
// COMPONENT
// ============================================================

export default function WizardsPage() {
  const { profile, isAdmin, role } = useAuth();
  const { has } = usePermissions();
  const { isLeader, teams: leaderTeams } = useLeaderTeams();
  const { profileId } = useIdentity();
  
  // Check if user is super_admin
  const isSuperAdmin = role === 'super_admin';
  
  // Wizard open states
  const [collaboratorWizardOpen, setCollaboratorWizardOpen] = useState(false);
  const [leaderPrepWizardOpen, setLeaderPrepWizardOpen] = useState(false);
  const [teamCheckinWizardOpen, setTeamCheckinWizardOpen] = useState(false);
  const [managersWizardOpen, setManagersWizardOpen] = useState(false);
  const [clevelWizardOpen, setClevelWizardOpen] = useState(false);
  const [teamOkrCreationWizardOpen, setTeamOkrCreationWizardOpen] = useState(false);
  
  // Selected team for leader wizards
  const [selectedTeam, setSelectedTeam] = useState<{ id: string; name: string } | null>(null);

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
  const canAccessWizard = (wizard: WizardDefinition): boolean => {
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
  };

  // Filter sections based on user access
  const visibleSections = useMemo(() => {
    return WIZARD_SECTIONS.map(section => ({
      ...section,
      wizards: section.wizards.filter(canAccessWizard),
    })).filter(section => section.wizards.length > 0);
  }, [userRoles, has, isSuperAdmin, isAdmin]);

  // Handle wizard open
  const handleWizardOpen = (wizardId: string) => {
    // For leader wizards, use first team if available
    const firstTeam = leaderTeams?.[0];
    if (firstTeam) {
      setSelectedTeam({ id: firstTeam.team_id, name: firstTeam.team_name });
    }

    switch (wizardId) {
      case 'collaborator-checkin':
        setCollaboratorWizardOpen(true);
        break;
      case 'leader-prep':
        setLeaderPrepWizardOpen(true);
        break;
      case 'team-checkin':
        setTeamCheckinWizardOpen(true);
        break;
      case 'managers-checkin':
        setManagersWizardOpen(true);
        break;
      case 'clevel-checkin':
        setClevelWizardOpen(true);
        break;
      case 'team-okr-creation':
        setTeamOkrCreationWizardOpen(true);
        break;
    }
  };

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
                      onClick={() => handleWizardOpen(wizard.id)}
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
            onOpenChange={setCollaboratorWizardOpen}
          />
        )}

        {leaderPrepWizardOpen && selectedTeam && (
          <LeaderPrepWizard
            open={leaderPrepWizardOpen}
            onOpenChange={setLeaderPrepWizardOpen}
            teamId={selectedTeam.id}
            teamName={selectedTeam.name}
          />
        )}

        {teamCheckinWizardOpen && selectedTeam && (
          <TeamCheckinWizard
            open={teamCheckinWizardOpen}
            onOpenChange={setTeamCheckinWizardOpen}
            teamId={selectedTeam.id}
            teamName={selectedTeam.name}
          />
        )}

        {managersWizardOpen && (
          <ManagersCheckinWizard
            open={managersWizardOpen}
            onOpenChange={setManagersWizardOpen}
          />
        )}

        {clevelWizardOpen && (
          <CLevelCheckinWizard
            open={clevelWizardOpen}
            onOpenChange={setClevelWizardOpen}
          />
        )}

        {teamOkrCreationWizardOpen && selectedTeam && (
          <TeamOkrCreationWizard
            open={teamOkrCreationWizardOpen}
            onOpenChange={setTeamOkrCreationWizardOpen}
            teamId={selectedTeam.id}
            teamName={selectedTeam.name}
          />
        )}
      </div>
    </HubLayout>
  );
}
