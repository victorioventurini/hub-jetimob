/**
 * ExternalDashboard - Main dashboard for external users (partner contacts)
 * Clean, simple layout focused on tickets
 */
import { CultureCard } from "@/components/home/CultureCard";
import { VicCard } from "@/components/home/VicCard";
import { DashboardHero } from "@/components/home/DashboardHero";
import { MyTicketsCard, type TicketItem } from "@/components/home/MyTicketsCard";
import { ExternalStatsCards } from "./ExternalStatsCards";
import { CompanyContextCard } from "./CompanyContextCard";
import { useExternalDashboard } from "../hooks";
import { useGreeting } from "@/hooks/useGreeting";
import type { ExternalUserInfo } from "../types";

interface ExternalDashboardProps {
  externalInfo: ExternalUserInfo;
}

export function ExternalDashboard({ externalInfo }: ExternalDashboardProps) {
  const { tickets, stats, companyContext, isLoading } = useExternalDashboard(externalInfo);
  const { greeting } = useGreeting({ userName: externalInfo.name.split(" ")[0] });
  const legalName = externalInfo.buLegalName || externalInfo.buName;

  // Map external tickets to unified TicketItem type
  const mappedTickets: TicketItem[] = tickets.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    updatedAt: t.updatedAt,
    categoryName: t.categoryName,
    subcategoryName: t.subcategoryName,
  }));

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <DashboardHero
        variant="external"
        greeting={greeting}
        companyName={legalName}
      />

      {/* Culture Card - Same as internal */}
      <CultureCard />

      {/* Stats Cards */}
      <ExternalStatsCards stats={stats} isLoading={isLoading} />

      {/* My Tickets Card - Full width */}
      <MyTicketsCard 
        variant="external" 
        tickets={mappedTickets} 
        isLoading={isLoading} 
      />

      {/* Company Context */}
      <CompanyContextCard context={companyContext ?? null} isLoading={isLoading} />

      {/* Vic Card - Always at the end */}
      <VicCard profile="external" />
    </div>
  );
}
