/**
 * VicTestPage - Página isolada para testar invokeVic
 * 
 * Acesse via /vic-test para testar os agentes cadastrados
 */

import { useState, useCallback } from "react";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Send, RefreshCw, Clock } from "lucide-react";
import { useVicAgent, useVicEnabled } from "@/modules/vic/hooks";
import { VIC_AGENTS, type VicAgentSlug } from "@/modules/vic/types";
import { useBu } from "@/contexts/BuContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";

interface TestResult {
  agentSlug: string;
  success: boolean;
  response?: string;
  error?: string;
  latencyMs: number;
  timestamp: Date;
}

export default function VicTestPage() {
  const { currentBuId } = useBu();
  const { isEnabled, iaMode, isLoading: isLoadingConfig } = useVicEnabled();
  const vicAgent = useVicAgent();

  const [selectedAgent, setSelectedAgent] = useState<VicAgentSlug>("coach-okrs");
  const [userQuestion, setUserQuestion] = useState("Me dê uma dica rápida sobre como escrever um bom OKR");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTestingAll, setIsTestingAll] = useState(false);

  // Fetch all active agents from DB
  const { data: dbAgents = [], isLoading: isLoadingAgents } = useQuery({
    queryKey: queryKeys.vic.globalAgents(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agents")
        .select("id, name, slug, is_active, scope, model_name, integration_key")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Test a single agent
  const testAgent = useCallback(async (agentSlug: VicAgentSlug) => {
    const startTime = Date.now();
    
    try {
      const response = await vicAgent.invoke(
        agentSlug,
        "vic-test-page",
        {
          type: "test",
          title: "Teste de integração do Vic",
          description: `Testando agente ${agentSlug}`,
        },
        userQuestion
      );

      const latencyMs = Date.now() - startTime;
      
      setTestResults(prev => [{
        agentSlug,
        success: true,
        response: response.response || JSON.stringify(response),
        latencyMs,
        timestamp: new Date(),
      }, ...prev]);

      return true;
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      
      setTestResults(prev => [{
        agentSlug,
        success: false,
        error: error?.error || error?.message || "Erro desconhecido",
        latencyMs,
        timestamp: new Date(),
      }, ...prev]);

      return false;
    }
  }, [vicAgent, userQuestion]);

  // Test the selected agent
  const handleTestSingle = useCallback(async () => {
    await testAgent(selectedAgent);
  }, [testAgent, selectedAgent]);

  // Test all registered agents
  const handleTestAll = useCallback(async () => {
    setIsTestingAll(true);
    const agentSlugs = Object.keys(VIC_AGENTS) as VicAgentSlug[];
    
    for (const slug of agentSlugs) {
      await testAgent(slug);
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 1000));
    }
    
    setIsTestingAll(false);
  }, [testAgent]);

  const clearResults = useCallback(() => {
    setTestResults([]);
  }, []);

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Teste do Vic (IA)"
          description="Página isolada para testar a integração com os agentes de IA"
        />

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status da Integração</CardTitle>
            <CardDescription>Configuração de IA para esta BU</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!currentBuId ? (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">Nenhuma BU selecionada</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Você precisa estar logado e ter uma BU selecionada para testar os agentes.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-3">
                  <Badge variant={isEnabled ? "default" : "destructive"} className="gap-1">
                    {isEnabled ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    IA {isEnabled ? "Habilitada" : "Desabilitada"}
                  </Badge>
                  <Badge variant="outline">
                    Modo: {iaMode}
                  </Badge>
                  <Badge variant="secondary">
                    BU: {currentBuId?.slice(0, 8)}...
                  </Badge>
                  <Badge variant="secondary">
                    {dbAgents.length} agentes ativos
                  </Badge>
                </div>

                {/* Agents from DB */}
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">Agentes no Banco de Dados:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {dbAgents.map(agent => (
                      <div key={agent.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="font-medium">{agent.name}</span>
                        <span className="text-muted-foreground">({agent.slug})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Test Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Testar Agente</CardTitle>
            <CardDescription>Selecione um agente e faça uma pergunta de teste</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Agente</label>
                <Select value={selectedAgent} onValueChange={(v) => setSelectedAgent(v as VicAgentSlug)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(VIC_AGENTS).map(([slug, info]) => (
                      <SelectItem key={slug} value={slug}>
                        {info.name} ({slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Pergunta de Teste</label>
              <Textarea
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                placeholder="Digite uma pergunta para o agente..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleTestSingle} 
                disabled={!currentBuId || vicAgent.isLoading || isTestingAll}
                className="gap-2"
              >
                {vicAgent.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Testar Agente Selecionado
              </Button>

              <Button 
                variant="outline"
                onClick={handleTestAll} 
                disabled={!currentBuId || vicAgent.isLoading || isTestingAll}
                className="gap-2"
              >
                {isTestingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Testar Todos ({Object.keys(VIC_AGENTS).length})
              </Button>
              {testResults.length > 0 && (
                <Button 
                  variant="ghost"
                  onClick={clearResults}
                >
                  Limpar Resultados
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resultados dos Testes</CardTitle>
              <CardDescription>
                {testResults.filter(r => r.success).length} sucessos, {testResults.filter(r => !r.success).length} falhas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {testResults.map((result, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-lg border ${
                    result.success 
                      ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" 
                      : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="font-medium">{result.agentSlug}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {result.latencyMs}ms
                      <span>•</span>
                      {result.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    {result.success ? (
                      <pre className="whitespace-pre-wrap bg-background/50 p-3 rounded text-foreground overflow-auto max-h-48">
                        {result.response}
                      </pre>
                    ) : (
                      <p className="text-red-600 dark:text-red-400">
                        Erro: {result.error}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </HubLayout>
  );
}
