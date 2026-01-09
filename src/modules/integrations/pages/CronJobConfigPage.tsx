import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, ExternalLink, Play, RefreshCw, Check, Clock, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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

export default function CronJobConfigPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState<string | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'oiwnghihyqdsinouwmga';
  const endpointUrl = `https://${projectId}.supabase.co/functions/v1/cron-dispatcher`;

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['integrations', 'global-config', 'cron-job'],
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

  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['cron-execution-logs'],
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
      queryClient.invalidateQueries({ queryKey: ['integrations', 'global-config', 'cron-job'] });
      toast.success('Configuração atualizada');
    },
    onError: () => toast.error('Erro ao atualizar'),
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copiado!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleTestRun = async () => {
    setIsTestRunning(true);
    toast.info('Executando teste...');
    try {
      const response = await fetch(endpointUrl, { method: 'POST' });
      if (response.status === 401) {
        toast.warning('Teste requer CRON_SECRET. Configure no cron-job.org.');
      } else if (response.ok) {
        const result = await response.json();
        toast.success(`Teste concluído! Outbox: ${result.outbox?.sent || 0} enviados`);
        refetchLogs();
      } else {
        toast.error('Erro no teste');
      }
    } catch {
      toast.error('Erro ao executar. Verifique CRON_SECRET.');
    } finally {
      setIsTestRunning(false);
    }
  };

  const lastSuccessLog = logs?.find(log => log.status === 'success');
  const lastErrorLog = logs?.find(log => log.status === 'error');

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/hub/integrations')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <IntegrationIcon icon="clock" color="#4F46E5" size="lg" />
        <div>
          <h1 className="text-2xl font-bold">cron-job.org</h1>
          <p className="text-muted-foreground">Agendador externo para processamento automático</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Configuração</CardTitle>
            <CardDescription>Configure a integração com o cron-job.org</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Integração Ativa</Label>
                <p className="text-sm text-muted-foreground">Habilita o endpoint para receber chamadas</p>
              </div>
              {configLoading ? <Skeleton className="h-6 w-11" /> : (
                <Switch checked={config?.is_enabled_global ?? false} onCheckedChange={(c) => toggleMutation.mutate(c)} />
              )}
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>URL do Endpoint</Label>
              <div className="flex gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">{endpointUrl}</code>
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(endpointUrl, 'URL')}>
                  {copied === 'URL' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Header de Autenticação</Label>
              <div className="flex gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">x-cron-secret: {'<seu_secret>'}</code>
                <Button variant="outline" size="icon" onClick={() => copyToClipboard('x-cron-secret', 'Header')}>
                  {copied === 'Header' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Separator />
            <Button onClick={handleTestRun} disabled={isTestRunning} className="w-full">
              {isTestRunning ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Executando...</> : <><Play className="mr-2 h-4 w-4" />Executar Teste</>}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instruções</CardTitle>
            <CardDescription>Configure o cron-job.org</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Acesse <a href="https://cron-job.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">cron-job.org<ExternalLink className="h-3 w-3" /></a></li>
              <li>Crie um novo cronjob</li>
              <li><strong>URL:</strong> Cole a URL acima</li>
              <li><strong>Método:</strong> POST</li>
              <li><strong>Header:</strong> x-cron-secret: seu_secret</li>
              <li><strong>Frequência:</strong> <code className="bg-muted px-1 rounded">*/1 * * * *</code></li>
            </ol>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                <strong>Importante:</strong> Configure o CRON_SECRET nas variáveis de ambiente antes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Histórico de Execuções</CardTitle>
            <CardDescription>Últimas 10 execuções</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchLogs()}><RefreshCw className="h-4 w-4 mr-2" />Atualizar</Button>
        </CardHeader>
        <CardContent>
          {logsLoading ? <Skeleton className="h-32 w-full" /> : !logs?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma execução registrada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>{log.status === 'success' ? 'Sucesso' : 'Erro'}</Badge>
                    <div>
                      <p className="text-sm font-medium">{format(new Date(log.ran_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</p>
                      <p className="text-xs text-muted-foreground">Outbox: {log.outbox_sent}/{log.outbox_processed} enviados</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">{log.duration_ms}ms</span>
                </div>
              ))}
            </div>
          )}
          {logs && logs.length > 0 && (
            <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />Último sucesso: {lastSuccessLog ? format(new Date(lastSuccessLog.ran_at), "dd/MM HH:mm", { locale: ptBR }) : 'N/A'}</div>
              <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-red-500" />Último erro: {lastErrorLog ? format(new Date(lastErrorLog.ran_at), "dd/MM HH:mm", { locale: ptBR }) : 'Nenhum'}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
