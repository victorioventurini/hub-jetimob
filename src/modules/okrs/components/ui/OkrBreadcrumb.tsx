import { GlobalBreadcrumb, type BreadcrumbItemConfig } from '@/components/ui/global-breadcrumb';
import { cn } from '@/lib/utils';

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
export function OkrDashboardBreadcrumb() {
  return <OkrBreadcrumb items={[]} />;
}

export function OkrOrgViewBreadcrumb() {
  return <OkrBreadcrumb items={[{ label: 'Visão Organizacional' }]} />;
}

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
