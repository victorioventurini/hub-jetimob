import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Copy, ExternalLink, Play, RefreshCw, Check, Clock, AlertCircle, Eye, EyeOff, Key, Loader2, CheckCircle2, Circle, Info } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { queryKeys } from '@/lib/queryKeys';

import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { IntegrationIcon } from '../components/IntegrationIcon';

interface CronLog {
  id: string;
  ran_at: string;
  status: 'success' | 'error';
  duration_ms: number | null;
  outbox_processed: number;
  outbox_sent: number;
  outbox_failed: number;
  health_alerts_created: number;
  health_alerts_resolved: number;
  error_message: string | null;
  correlation_id: string | null;
}

interface ConfigEncrypted {
  cron_secret?: string;
}

type SetupStep = 'secret' | 'enabled' | 'external' | 'test';

export default function CronJobConfigPage() {
  usePageTitle("Cron Job Externo", { 
    skipBu: true, 
    customDescription: "Configure o agendador externo para processamento automático de notificações." 
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState<string | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [cronSecret, setCronSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'oiwnghihyqdsinouwmga';
  const endpointUrl = `https://${projectId}.supabase.co/functions/v1/cron-dispatcher`;

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: queryKeys.cronJob.globalConfig(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hub_integrations_global_config')
        .select('id, is_enabled_global, config_encrypted, last_test_status, last_test_at')
        .eq('integration_key', 'cron-job')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Load secret from config when data arrives
  useEffect(() => {
    if (config?.config_encrypted) {
      const encrypted = config.config_encrypted as ConfigEncrypted;
      setCronSecret(encrypted.cron_secret || '');
    }
  }, [config]);

  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: queryKeys.cronJob.executionLogs(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cron_execution_logs' as any)
        .select('id, ran_at, status, duration_ms, outbox_processed, outbox_sent, outbox_failed, health_alerts_created, health_alerts_resolved, error_message, correlation_id')
        .order('ran_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as unknown as CronLog[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from('hub_integrations_global_config')
        .update({ is_enabled_global: enabled })
        .eq('integration_key', 'cron-job');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cronJob.globalConfig(), refetchType: 'active' });
      toast.success('Configuração atualizada');
    },
    onError: () => toast.error('Erro ao atualizar'),
  });

  // Save secret mutation
  const saveSecretMutation = useMutation({
    mutationFn: async (secret: string) => {
      const currentConfig = (config?.config_encrypted as ConfigEncrypted) || {};
      const { error } = await supabase
        .from('hub_integrations_global_config')
        .update({ 
          config_encrypted: { ...currentConfig, cron_secret: secret }
        })
        .eq('integration_key', 'cron-job');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cronJob.globalConfig(), refetchType: 'active' });
      setHasUnsavedChanges(false);
      toast.success('Secret salvo com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao salvar secret');
    },
  });

  const generateSecret = () => {
    const newSecret = `cron_hub_${crypto.randomUUID().replace(/-/g, '')}`;
    setCronSecret(newSecret);
    setHasUnsavedChanges(true);
  };

  const handleSecretChange = (value: string) => {
    setCronSecret(value);
    const originalSecret = (config?.config_encrypted as ConfigEncrypted)?.cron_secret || '';
    setHasUnsavedChanges(value !== originalSecret);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copiado!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleTestRun = async () => {
    if (!cronSecret) {
      toast.error('Configure o CRON_SECRET primeiro');
      return;
    }

    if (hasUnsavedChanges) {
      toast.error('Salve o secret antes de executar o teste');
      return;
    }

    setIsTestRunning(true);
    toast.info('Executando teste...');
    try {
      const response = await fetch(endpointUrl, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': cronSecret,
        },
      });
      if (response.status === 401) {
        toast.error('Falha na autenticação. Verifique o CRON_SECRET.');
      } else if (response.ok) {
        const result = await response.json();
        toast.success(`Teste concluído! Outbox: ${result.outbox?.sent || 0} enviados`);
        refetchLogs();
      } else {
        const result = await response.json();
        toast.error(`Erro: ${result.error || 'Falha na execução'}`);
      }
    } catch {
      toast.error('Erro ao executar teste');
    } finally {
      setIsTestRunning(false);
    }
  };

  const lastSuccessLog = logs?.find(log => log.status === 'success');
  const lastErrorLog = logs?.find(log => log.status === 'error');
  
  // Calculate setup status
  const savedSecret = (config?.config_encrypted as ConfigEncrypted)?.cron_secret || '';
  const isSecretConfigured = !!savedSecret && !hasUnsavedChanges;
  const isEnabled = config?.is_enabled_global ?? false;
  const hasRecentExecution = lastSuccessLog && 
    new Date(lastSuccessLog.ran_at).getTime() > Date.now() - 5 * 60 * 1000; // 5 min

  const getStepStatus = (step: SetupStep): 'complete' | 'current' | 'pending' => {
    switch (step) {
      case 'secret':
        return isSecretConfigured ? 'complete' : 'current';
      case 'enabled':
        if (!isSecretConfigured) return 'pending';
        return isEnabled ? 'complete' : 'current';
      case 'external':
        if (!isSecretConfigured || !isEnabled) return 'pending';
        return hasRecentExecution ? 'complete' : 'current';
      case 'test':
        if (!isSecretConfigured || !isEnabled) return 'pending';
        return hasRecentExecution ? 'complete' : 'pending';
    }
  };

  const StepIndicator = ({ step, label, description }: { step: SetupStep; label: string; description: string }) => {
    const status = getStepStatus(step);
    return (
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex-shrink-0 ${
          status === 'complete' ? 'text-status-green' : 
          status === 'current' ? 'text-primary' : 
          'text-muted-foreground/50'
        }`}>
          {status === 'complete' ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Circle className={`h-5 w-5 ${status === 'current' ? 'fill-primary/20' : ''}`} />
          )}
        </div>
        <div className="flex-1">
          <p className={`font-medium text-sm ${status === 'pending' ? 'text-muted-foreground/50' : ''}`}>
            {label}
          </p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    );
  };

  // Overall status
  const isFullyConfigured = isSecretConfigured && isEnabled && hasRecentExecution;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/hub/integrations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <IntegrationIcon icon="clock" color="#4F46E5" size="lg" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Cron Job Externo</h1>
          <p className="text-muted-foreground">Agendador para processamento automático de notificações</p>
        </div>
        <Badge variant={isFullyConfigured ? 'default' : 'secondary'} className="text-sm">
          {isFullyConfigured ? 'Funcionando' : 'Configuração pendente'}
        </Badge>
      </div>

      {/* Status Overview */}
      <Card className={isFullyConfigured ? 'border-status-green/50 bg-status-green-muted' : 'border-status-yellow/50 bg-status-yellow-muted'}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            {isFullyConfigured ? (
              <><CheckCircle2 className="h-5 w-5 text-status-green" />Sistema Operacional</>
            ) : (
              <><Info className="h-5 w-5 text-status-yellow" />Configuração Necessária</>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StepIndicator 
              step="secret" 
              label="1. Configurar Secret" 
              description="Gerar chave de autenticação" 
            />
            <StepIndicator 
              step="enabled" 
              label="2. Ativar Integração" 
              description="Habilitar endpoint" 
            />
            <StepIndicator 
              step="external" 
              label="3. Configurar cron-job.org" 
              description="Agendar chamadas automáticas" 
            />
            <StepIndicator 
              step="test" 
              label="4. Verificar Execução" 
              description="Confirmar funcionamento" 
            />
          </div>
        </CardContent>
      </Card>

      {/* Secret Configuration Card */}
      <Card className={getStepStatus('secret') === 'current' ? 'ring-2 ring-primary' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Passo 1: CRON_SECRET
          </CardTitle>
          <CardDescription>
            Chave de autenticação para validar chamadas do serviço externo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Secret</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showSecret ? 'text' : 'password'}
                  value={cronSecret}
                  onChange={(e) => handleSecretChange(e.target.value)}
                  placeholder="Clique em 'Gerar' para criar um secret..."
                  className="font-mono text-sm pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button variant="outline" onClick={generateSecret} title="Gerar novo secret">
                <RefreshCw className="h-4 w-4 mr-2" />
                Gerar
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => copyToClipboard(cronSecret, 'Secret')}
                disabled={!cronSecret}
                title="Copiar secret"
              >
                {copied === 'Secret' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            {hasUnsavedChanges && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                ⚠️ Clique em "Salvar" para confirmar as alterações
              </p>
            )}
            {isSecretConfigured && (
              <p className="text-sm text-green-600 dark:text-green-400">
                ✓ Secret configurado
              </p>
            )}
          </div>

          <Button 
            onClick={() => saveSecretMutation.mutate(cronSecret)}
            disabled={!hasUnsavedChanges || saveSecretMutation.isPending || !cronSecret}
          >
            {saveSecretMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Secret
          </Button>
        </CardContent>
      </Card>

      {/* Enable Integration */}
      <Card className={getStepStatus('enabled') === 'current' ? 'ring-2 ring-primary' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Passo 2: Ativar Integração
          </CardTitle>
          <CardDescription>Habilita o endpoint para receber chamadas externas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Integração Ativa</Label>
              <p className="text-sm text-muted-foreground">
                {isEnabled ? 'O endpoint está pronto para receber chamadas' : 'Ative para permitir chamadas do cron externo'}
              </p>
            </div>
            {configLoading ? <Skeleton className="h-6 w-11" /> : (
              <Switch 
                checked={isEnabled} 
                onCheckedChange={(c) => toggleMutation.mutate(c)}
                disabled={!isSecretConfigured}
              />
            )}
          </div>
          {!isSecretConfigured && (
            <p className="text-sm text-muted-foreground mt-3">
              Configure o secret primeiro para ativar a integração
            </p>
          )}
        </CardContent>
      </Card>

      {/* External Cron Setup Instructions */}
      <Card className={getStepStatus('external') === 'current' ? 'ring-2 ring-primary' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Passo 3: Configurar cron-job.org
          </CardTitle>
          <CardDescription>Configure o serviço externo para chamar o endpoint automaticamente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Por que usar um serviço externo?</AlertTitle>
            <AlertDescription>
              O Lovable Cloud não suporta crons internos do PostgreSQL (pg_cron). 
              Usamos o cron-job.org (gratuito) para chamar a edge function periodicamente.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Dados para configuração:</Label>
            </div>

            <div className="grid gap-3">
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">URL do Endpoint</Label>
                <div className="flex gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">{endpointUrl}</code>
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(endpointUrl, 'URL')}>
                    {copied === 'URL' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Método HTTP</Label>
                <code className="block p-2 bg-muted rounded text-sm font-mono">POST</code>
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Header de Autenticação</Label>
                <div className="flex gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                    x-cron-secret: {cronSecret || '<configure o secret primeiro>'}
                  </code>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => copyToClipboard(`x-cron-secret: ${cronSecret}`, 'Header')}
                    disabled={!cronSecret}
                  >
                    {copied === 'Header' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Expressão Cron (a cada 1 minuto)</Label>
                <div className="flex gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">*/1 * * * *</code>
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard('*/1 * * * *', 'Cron')}>
                    {copied === 'Cron' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1">
                <a href="https://cron-job.org" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir cron-job.org
                </a>
              </Button>
              <Button 
                onClick={handleTestRun} 
                disabled={isTestRunning || !cronSecret || hasUnsavedChanges || !isEnabled} 
                className="flex-1"
              >
                {isTestRunning ? (
                  <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Testando...</>
                ) : (
                  <><Play className="mr-2 h-4 w-4" />Testar Manualmente</>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Execution History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Passo 4: Histórico de Execuções
            </CardTitle>
            <CardDescription>
              {hasRecentExecution 
                ? `Última execução há ${formatDistanceToNow(new Date(lastSuccessLog!.ran_at), { locale: ptBR })}`
                : 'Aguardando primeira execução do cron externo'
              }
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchLogs()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {logsLoading ? <Skeleton className="h-32 w-full" /> : !logs?.length ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Nenhuma execução registrada</p>
              <p className="text-sm">Configure o cron-job.org e aguarde a primeira execução automática</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                      {log.status === 'success' ? 'Sucesso' : 'Erro'}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">
                        {format(new Date(log.ran_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Outbox: {log.outbox_sent}/{log.outbox_processed} enviados
                        {log.outbox_failed > 0 && ` • ${log.outbox_failed} falhas`}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">{log.duration_ms}ms</span>
                </div>
              ))}
            </div>
          )}
          {logs && logs.length > 0 && (
            <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-status-green" />
                Último sucesso: {lastSuccessLog ? format(new Date(lastSuccessLog.ran_at), "dd/MM HH:mm", { locale: ptBR }) : 'N/A'}
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-status-red" />
                Último erro: {lastErrorLog ? format(new Date(lastErrorLog.ran_at), "dd/MM HH:mm", { locale: ptBR }) : 'Nenhum'}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
