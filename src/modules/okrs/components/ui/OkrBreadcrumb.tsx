import { GlobalBreadcrumb, type BreadcrumbItemConfig } from '@/components/ui/global-breadcrumb';

interface OkrBreadcrumbProps {
  items: BreadcrumbItemConfig[];
  className?: string;
}

/**
 * OKR-specific breadcrumb with consistent styling
 * Uses GlobalBreadcrumb to ensure Hub is always included at root
 */
export function OkrBreadcrumb({ items, className }: OkrBreadcrumbProps) {
  const allItems: BreadcrumbItemConfig[] = [
    { label: 'OKRs', href: '/okrs' },
    ...items,
  ];

  return <GlobalBreadcrumb items={allItems} className={className} />;
}

/**
 * Preset breadcrumbs for common OKR pages
 */

// Dashboard principal
export function OkrDashboardBreadcrumb() {
  return <OkrBreadcrumb items={[]} />;
}

// Visão Organizacional - Lista
export function OkrOrgViewListBreadcrumb() {
  return <OkrBreadcrumb items={[{ label: 'Visão Organizacional' }]} />;
}

// Visão Organizacional - Detalhe de Objetivo
export function OkrOrgObjectiveDetailBreadcrumb({ 
  objectiveTitle 
}: { 
  objectiveTitle: string 
}) {
  return (
    <OkrBreadcrumb
      items={[
        { label: 'Visão Organizacional', href: '/okrs/org-view' },
        { label: objectiveTitle },
      ]}
    />
  );
}

// Dashboard Executivo
export function OkrExecutiveDashboardBreadcrumb() {
  return <OkrBreadcrumb items={[{ label: 'Dashboard Executivo' }]} />;
}

// Check-ins do Ciclo
export function OkrCycleCheckinsBreadcrumb() {
  return <OkrBreadcrumb items={[{ label: 'Check-ins do Ciclo' }]} />;
}

// Configurações
export function OkrSettingsBreadcrumb() {
  return <OkrBreadcrumb items={[{ label: 'Configurações' }]} />;
}

// Contribuição do Time
export function OkrTeamContributionBreadcrumb({ 
  teamName 
}: { 
  teamName: string 
}) {
  return (
    <OkrBreadcrumb
      items={[
        { label: 'Visão Organizacional', href: '/okrs/org-view' },
        { label: teamName },
      ]}
    />
  );
}

// Criar OKRs do Time
export function OkrCreationBreadcrumb({ 
  teamName 
}: { 
  teamName?: string 
}) {
  return (
    <OkrBreadcrumb
      items={[
        { label: 'Criar OKRs', ...(teamName ? {} : {}) },
        ...(teamName ? [{ label: teamName }] : []),
      ].filter(Boolean) as BreadcrumbItemConfig[]}
    />
  );
}

// Criar KRs para Objetivo
export function OkrKrCreationBreadcrumb({ 
  objectiveTitle 
}: { 
  objectiveTitle: string 
}) {
  return (
    <OkrBreadcrumb
      items={[
        { label: 'Criar Key Results' },
        { label: objectiveTitle },
      ]}
    />
  );
}

// ===============================================
// LEGACY EXPORTS - Mantidos para compatibilidade
// ===============================================

/** @deprecated Use OkrOrgViewListBreadcrumb */
export function OkrOrgViewBreadcrumb() {
  return <OkrBreadcrumb items={[{ label: 'Visão Organizacional' }]} />;
}

/** @deprecated Use OkrTeamContributionBreadcrumb or specific team breadcrumb */
export function OkrTeamViewBreadcrumb({ teamName }: { teamName: string }) {
  return (
    <OkrBreadcrumb
      items={[
        { label: 'Times', href: '/okrs?view=team' },
        { label: teamName },
      ]}
    />
  );
}

/** @deprecated Use OkrOrgObjectiveDetailBreadcrumb */
export function OkrObjectiveDetailBreadcrumb({
  teamName,
  objectiveTitle,
  type,
}: {
  teamName?: string;
  objectiveTitle: string;
  type: 'org' | 'team';
}) {
  if (type === 'org') {
    return (
      <OkrBreadcrumb
        items={[
          { label: 'Visão Organizacional', href: '/okrs/org-view' },
          { label: objectiveTitle },
        ]}
      />
    );
  }

  return (
    <OkrBreadcrumb
      items={[
        { label: 'Times', href: '/okrs?view=team' },
        ...(teamName ? [{ label: teamName, href: `/okrs?view=team&team_id=${encodeURIComponent(teamName)}` }] : []),
        { label: objectiveTitle },
      ]}
    />
  );
}
