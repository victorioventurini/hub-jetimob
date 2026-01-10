import { Settings, Calendar, Scale, BookOpen, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUrlTab } from "@/hooks/useUrlState";
import { usePageTitle } from "@/hooks/usePageTitle";
import { CyclesTab } from "../components/settings/CyclesTab";
import { LimitsTab } from "../components/settings/LimitsTab";
import { RulesInfoTab } from "../components/settings/RulesInfoTab";

export default function OkrsSettingsPage() {
  usePageTitle("Configurações de OKRs", {
    customDescription: "Configure ciclos, limites e regras de vínculo de OKRs."
  });
  const [activeTab, setActiveTab] = useUrlTab("cycles");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Configurações de OKRs
        </h1>
        <p className="text-muted-foreground">
          Configure ciclos, limites e regras de vínculo da metodologia OKR
        </p>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-foreground">Configurações globais</p>
          <p className="text-muted-foreground">
            Estas configurações afetam todas as Business Units e times. 
            As regras de OKR são metodológicas e aplicadas de forma consistente em toda a organização.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="cycles" className="gap-2">
            <Calendar className="h-4 w-4" />
            Ciclos
          </TabsTrigger>
          <TabsTrigger value="limits" className="gap-2">
            <Scale className="h-4 w-4" />
            Limites
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Regras de Vínculo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cycles">
          <CyclesTab />
        </TabsContent>

        <TabsContent value="limits">
          <LimitsTab />
        </TabsContent>

        <TabsContent value="rules">
          <RulesInfoTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
