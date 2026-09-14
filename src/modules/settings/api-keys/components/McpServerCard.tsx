import { useState } from "react";
import { Bot, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const MCP_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mcp`;

/**
 * Card informativo: como conectar assistentes (Claude, ChatGPT, Cursor) ao Next
 * pelo servidor MCP. Somente leitura e sempre com as permissões da pessoa.
 */
export function McpServerCard() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(MCP_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" aria-hidden />
          <CardTitle>Consultar o Next por assistentes de IA</CardTitle>
        </div>
        <CardDescription>
          Conecte Claude, ChatGPT ou Cursor ao Next para perguntar sobre pessoas, OKRs, indicadores,
          projetos, tickets, ritos, ativos, avaliações e parceiros. Cada pessoa entra com a própria
          conta e vê apenas o que já vê no Next. Nenhuma consulta altera dados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Endereço da conexão</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded bg-muted px-3 py-2 text-xs">{MCP_URL}</code>
            <Button variant="outline" size="sm" onClick={copy} aria-label="Copiar endereço">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          No assistente, adicione um conector do tipo MCP com esse endereço. Na primeira vez ele abre
          a tela de entrada do Next e pede sua autorização.
        </p>
      </CardContent>
    </Card>
  );
}
