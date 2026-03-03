/**
 * WizardsPage - Central hub for all OKR rituals (wizards)
 * 
 * Lists all available rituals organized by module and user role.
 * Visibility is controlled by user permissions and role context.
 * All wizards now navigate to full-page routes with draft support.
 */

import { useMemo, useCallback } from 'react';
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
  Rocket,
  BarChart3,
  Settings2,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useLeaderTeams } from '@/modules/home/hooks/useLeaderTeams';
import { useHierarchicalTeamList } from '@/modules/teams/hooks';
import { usePageTitle } from '@/hooks/usePageTitle';

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
  route: string;
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
    description: 'Rituais para check-in e atualização individual',
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
        route: '/okrs/collaborator-checkin',
      },
    ],
  },
  {
    title: 'OKRs - Líderes de Time',
    description: 'Rituais para gestão de OKRs do time',
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
        route: '/okrs/create',
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
        route: '/okrs/leader-prep',
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
        route: '/okrs/team-checkin',
      },
    ],
  },
  {
    title: 'OKRs - Gestores e Executivos',
    description: 'Rituais para alinhamento estratégico e cross-functional',
    icon: Crown,
    wizards: [
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
        route: '/okrs/clevel-checkin',
      },
      {
        id: 'mbr',
        name: 'Monthly Business Review',
        description: 'Revisão mensal de KPIs e OKRs com decisões estratégicas',
        icon: Briefcase,
        module: 'okrs',
        requiredRole: 'executive',
        badge: 'Mensal',
        badgeVariant: 'secondary',
        requiresTeam: false,
        route: '/okrs/mbr',
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
  usePageTitle('Rituais', {
    customDescription: 'Fluxos guiados para gestão de OKRs, check-ins e criação de metas no Hub.',
  });

  const { has, isWildcard } = usePermissions();
  const { isLeader, teams: leaderTeams } = useLeaderTeams();
  const { teams: allTeams } = useHierarchicalTeamList();

  // Determine user role hierarchy
  // Use isWildcard (impersonation-aware) instead of isAdmin
  const userRoles = useMemo(() => {
    const roles: Set<string> = new Set(['collaborator']); // Everyone is at least a collaborator
    
    if (isLeader) roles.add('leader');
    if (isWildcard) {
      roles.add('manager');
      roles.add('leader');
      // isWildcard = admin/super_admin NOT impersonating
      roles.add('executive');
      roles.add('admin');
    }
    
    return roles;
  }, [isLeader, isWildcard]);

  // Check if user can access a wizard
  const canAccessWizard = useCallback((wizard: WizardDefinition): boolean => {
    // Check role requirement
    if (!userRoles.has(wizard.requiredRole)) {
      // Wildcard (admin NOT impersonating) can access all wizards
      if (!isWildcard) return false;
    }
    
    // Check specific permission if required
    if (wizard.permissionKey && !has(wizard.permissionKey)) {
      // Wildcard bypass
      if (!isWildcard) return false;
    }
    
    return true;
  }, [userRoles, has, isWildcard]);

  // Filter sections based on user access
  const visibleSections = useMemo(() => {
    return WIZARD_SECTIONS
      .filter(section => {
        // Hide "Líderes de Time" section for non-leaders (unless wildcard)
        if (section.title === 'OKRs - Líderes de Time' && !userRoles.has('leader') && !isWildcard) {
          return false;
        }
        // Hide "Gestores e Executivos" section for non-managers (unless wildcard)
        if (section.title === 'OKRs - Gestores e Executivos' && !userRoles.has('manager') && !isWildcard) {
          return false;
        }
        return true;
      })
      .map(section => ({
        ...section,
        wizards: section.wizards.filter(canAccessWizard),
      })).filter(section => section.wizards.length > 0);
  }, [canAccessWizard, userRoles, isWildcard]);

  // Handle wizard open - navigate to full-page route
  const handleWizardOpen = useCallback((wizard: WizardDefinition) => {
    // For wizards that require team, add team param
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

    // Navigate to the wizard's full-page route
    navigate(wizard.route);
  }, [leaderTeams, allTeams, isWildcard, navigate]);

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Rituais"
          description="Fluxos guiados para gestão de OKRs"
        />

        {visibleSections.length === 0 ? (
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
    </HubLayout>
  );
}
