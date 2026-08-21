import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { BU_API_MODULES } from '../scopes';

const API_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bu-api`;

export function ApiDocsCard() {
  const curlExample = `curl "${API_BASE_URL}/kpis?limit=50" \\
  -H "x-api-key: jet_xxxxxx_..."`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Como consumir a API</CardTitle>
        <CardDescription>
          Todas as chamadas são escopadas automaticamente à BU dona da chave.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">URL base</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-muted px-3 py-2 text-xs break-all">
              {API_BASE_URL}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(API_BASE_URL);
                toast.success('URL copiada');
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Autenticação</p>
          <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">{curlExample}</pre>
          <p className="text-xs text-muted-foreground">
            Respostas seguem o formato <code>{'{ data, pagination }'}</code> e erros{' '}
            <code>{'{ error: { code, message } }'}</code>. Parâmetros <code>limit</code> (máx.
            500) e <code>offset</code> disponíveis nas listagens.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {BU_API_MODULES.map((mod) => (
            <AccordionItem key={mod.key} value={mod.key}>
              <AccordionTrigger className="text-sm">{mod.label}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Escopo de leitura: <code>{mod.key}:read</code>
                    {mod.supportsWrite && (
                      <>
                        {' · '}escrita: <code>{mod.key}:write</code>
                      </>
                    )}
                  </p>
                  <ul className="space-y-1">
                    {[...mod.readEndpoints, ...mod.writeEndpoints].map((endpoint) => (
                      <li key={endpoint} className="font-mono text-xs">
                        {endpoint}
                      </li>
                    ))}
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
