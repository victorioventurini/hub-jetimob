/**
 * RitualCalendarPage - Configuração de cadências e calendário de rituais
 *
 * Acesso: Admin da BU
 * Três abas: Cadências, Calendário, Saúde
 *
 * P3.2 (modularização): a lógica densa de cada aba foi extraída para
 * `./ritual-calendar/*`. Esta página agora é apenas o container/roteador
 * de tabs.
 */

import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CalendarDays, Clock, CheckCircle2 } from 'lucide-react';
import { useUrlTab } from '@/shared/url';
import { usePageTitle } from '@/hooks/usePageTitle';
import { CadencesTab } from './ritual-calendar/CadencesTab';
import { CalendarTab } from './ritual-calendar/CalendarTab';
import { HealthTab } from './ritual-calendar/HealthTab';

export default function RitualCalendarPage() {
  usePageTitle('Calendário de Ritos', {
    customDescription: 'Configure cadências de rituais e acompanhe a aderência dos times.',
  });
  const [activeTab, setActiveTab] = useUrlTab('cadences');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendário de Ritos"
        description="Configure cadências de rituais e acompanhe a aderência dos times."
        breadcrumbs={[
          { label: 'Configurações', href: '/settings' },
          { label: 'Calendário de Ritos' },
        ]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="cadences" className="gap-2">
            <Clock className="h-4 w-4" />
            Cadências
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Calendário
          </TabsTrigger>
          <TabsTrigger value="health" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Saúde
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cadences">
          <CadencesTab />
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarTab />
        </TabsContent>

        <TabsContent value="health">
          <HealthTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
