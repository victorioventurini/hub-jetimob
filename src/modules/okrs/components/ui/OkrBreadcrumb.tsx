import { Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface OkrBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * OKR-specific breadcrumb with consistent styling
 * Always includes OKRs as the root
 */
export function OkrBreadcrumb({ items, className }: OkrBreadcrumbProps) {
  const allItems: BreadcrumbItem[] = [
    { label: 'OKRs', href: '/okrs' },
    ...items,
  ];

  return (
    <Breadcrumb className={cn('mb-4', className)}>
      <BreadcrumbList>
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;

          return (
            <BreadcrumbItem key={index}>
              {index > 0 && <BreadcrumbSeparator />}
              {isLast ? (
                <BreadcrumbPage className="flex items-center gap-1.5">
                  {index === 0 && <Crosshair className="w-3.5 h-3.5" />}
                  {item.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={item.href || '#'} className="flex items-center gap-1.5">
                    {index === 0 && <Crosshair className="w-3.5 h-3.5" />}
                    {item.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
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
