/**
 * SponsorHeader — Header with sponsor logo and name
 */
import { SPONSOR_MOCK } from "../../mocks/sponsor";
import { ViewModeToggle } from "./ViewModeToggle";
import { ScopeFilter } from "./ScopeFilter";

export function SponsorHeader({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white border border-border flex items-center justify-center p-1.5 shadow-sm">
            <img
              src={SPONSOR_MOCK.logoUrl}
              alt={SPONSOR_MOCK.name}
              className="h-full w-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{SPONSOR_MOCK.name} • Patrocinador</p>
          </div>
        </div>
        <ViewModeToggle />
      </div>
      <ScopeFilter />
    </div>
  );
}
