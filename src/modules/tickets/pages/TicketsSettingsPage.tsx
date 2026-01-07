import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, FolderTree, Route, Users, Zap } from "lucide-react";
import { PartnerCompaniesTab } from "../components/settings/PartnerCompaniesTab";
import { PartnerContactsTab } from "../components/settings/PartnerContactsTab";
import { CategoriesTab } from "../components/settings/CategoriesTab";
import { RoutingRulesTab } from "../components/settings/RoutingRulesTab";
import { ContactCapabilitiesTab } from "../components/settings/ContactCapabilitiesTab";
import { useUrlTab } from "@/hooks/useUrlState";

export default function TicketsSettingsPage() {
  const [activeTab, setActiveTab] = useUrlTab("partners");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="partners" className="gap-2">
            <Building2 className="h-4 w-4" />
            Empresas Parceiras
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2">
            <Users className="h-4 w-4" />
            Contatos
          </TabsTrigger>
          <TabsTrigger value="capabilities" className="gap-2">
            <Zap className="h-4 w-4" />
            Capacidades
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <FolderTree className="h-4 w-4" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="routing" className="gap-2">
            <Route className="h-4 w-4" />
            Roteamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="partners">
          <PartnerCompaniesTab />
        </TabsContent>

        <TabsContent value="contacts">
          <PartnerContactsTab />
        </TabsContent>

        <TabsContent value="capabilities">
          <ContactCapabilitiesTab />
        </TabsContent>

        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>

        <TabsContent value="routing">
          <RoutingRulesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
