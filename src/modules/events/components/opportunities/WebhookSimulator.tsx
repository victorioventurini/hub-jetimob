/**
 * WebhookSimulator — Config + mock logs
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Send, CheckCircle2, XCircle } from "lucide-react";
import { useEventsContext } from "../../context/EventsContext";
import { Label } from "@/components/ui/label";

export function WebhookSimulator() {
  const { webhookConfig, setWebhookConfig, webhookLogs, sendTestWebhook } = useEventsContext();
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const handleTest = () => {
    sendTestWebhook({
      event_type: "opportunity.test",
      timestamp: new Date().toISOString(),
      data: { message: "Teste de webhook", sponsor: "Porto Seguro" },
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Configuração do Webhook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">URL do Webhook</Label>
              <Input
                value={webhookConfig.url}
                onChange={(e) => setWebhookConfig({ ...webhookConfig, url: e.target.value })}
                placeholder="https://..."
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Secret</Label>
              <Input
                value={webhookConfig.secret}
                onChange={(e) => setWebhookConfig({ ...webhookConfig, secret: e.target.value })}
                placeholder="whsec_..."
                className="text-sm font-mono"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={webhookConfig.isActive}
                onCheckedChange={(v) => setWebhookConfig({ ...webhookConfig, isActive: v })}
              />
              <Label className="text-sm">{webhookConfig.isActive ? "Ativo" : "Inativo"}</Label>
            </div>
            <Button size="sm" onClick={handleTest} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              Testar Webhook
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Logs de Envio ({webhookLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {webhookLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum log registrado</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {webhookLogs.map((log) => (
                <div
                  key={log.id}
                  className="border border-border rounded-lg p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {log.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <Badge variant={log.success ? "secondary" : "destructive"} className="text-[10px]">
                        {log.statusCode}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{log.responseTime}ms</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  {expandedLog === log.id && (
                    <pre className="mt-3 p-3 bg-muted rounded-md text-xs overflow-x-auto font-mono">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
