/**
 * ExternalDashboard - Main dashboard for external users (partner contacts)
 * Clean, simple layout focused on tickets
 */
import { CultureCard } from "@/components/home/CultureCard";
import { ExternalHero } from "./ExternalHero";
import { MyTicketsCard } from "./MyTicketsCard";
import { ExternalStatsCards } from "./ExternalStatsCards";
import { CompanyContextCard } from "./CompanyContextCard";
import { VicExternalCard } from "./VicExternalCard";
import { useExternalDashboard } from "../hooks/useExternalDashboard";
import type { ExternalUserInfo } from "../types";

interface ExternalDashboardProps {
  externalInfo: ExternalUserInfo;
}

export function ExternalDashboard({ externalInfo }: ExternalDashboardProps) {
  const { tickets, stats, companyContext, isLoading } = useExternalDashboard(externalInfo);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <ExternalHero externalInfo={externalInfo} />

      {/* Culture Card - Same as internal */}
      <CultureCard />

      {/* Stats Cards */}
      <ExternalStatsCards stats={stats} isLoading={isLoading} />

      {/* My Tickets Card - Full width */}
      <MyTicketsCard tickets={tickets} isLoading={isLoading} />

      {/* Grid: Company Context + Vic */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CompanyContextCard context={companyContext} isLoading={isLoading} />
        <VicExternalCard />
      </div>
    </div>
  );
}
