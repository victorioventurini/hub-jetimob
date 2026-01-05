import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, FolderTree, Route, Users } from "lucide-react";
import { PartnerCompaniesTab } from "../components/settings/PartnerCompaniesTab";
import { PartnerContactsTab } from "../components/settings/PartnerContactsTab";
import { CategoriesTab } from "../components/settings/CategoriesTab";
import { RoutingRulesTab } from "../components/settings/RoutingRulesTab";

export default function TicketsSettingsPage() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="partners" className="space-y-4">
        <TabsList>
          <TabsTrigger value="partners" className="gap-2">
            <Building2 className="h-4 w-4" />
            Empresas Parceiras
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2">
            <Users className="h-4 w-4" />
            Contatos
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
