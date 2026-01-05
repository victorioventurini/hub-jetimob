import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Code, Copy, Check } from 'lucide-react';
import type { AutomationActionCatalog } from '../types';
import { actionCategoryLabels } from '../types';

interface ActionCatalogCardProps {
  action: AutomationActionCatalog;
}

export function ActionCatalogCard({ action }: ActionCatalogCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(action.payload_example, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="transition-shadow hover:shadow-md">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium">
                    {action.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {action.action_key}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  v{action.action_version}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 space-y-4">
            {action.required_fields.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Campos obrigatórios
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {action.required_fields.map((field) => (
                    <Badge key={field} variant="secondary" className="font-mono text-xs">
                      {field}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg bg-muted p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Code className="h-4 w-4" />
                  Payload de exemplo
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyPayload}
                  className="h-7 gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
              <pre className="overflow-x-auto text-xs text-foreground">
                {JSON.stringify(action.payload_example, null, 2)}
              </pre>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface ActionCategorySectionProps {
  category: string;
  actions: AutomationActionCatalog[];
}

export function ActionCategorySection({ category, actions }: ActionCategorySectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">
        {actionCategoryLabels[category] || category}
      </h3>
      <div className="space-y-2">
        {actions.map((action) => (
          <ActionCatalogCard key={action.id} action={action} />
        ))}
      </div>
    </div>
  );
}
