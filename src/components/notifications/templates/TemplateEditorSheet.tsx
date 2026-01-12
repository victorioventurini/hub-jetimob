/**
 * Template Editor Sheet
 * Phase 5: Editor de templates com preview e validação
 */

import { useState, useEffect, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { 
  NotificationTemplate, 
  useNotificationTemplateVariables,
  useSaveTemplateVersion,
  extractTemplateVariables,
  validateTemplateVariables,
} from '@/hooks/useNotificationTemplates';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Save, 
  Eye, 
  Code, 
  AlertTriangle,
  CheckCircle,
  Copy,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TemplateEditorSheetProps {
  template: NotificationTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateEditorSheet({ 
  template, 
  open, 
  onOpenChange 
}: TemplateEditorSheetProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [reason, setReason] = useState('');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  
  // Queries
  const { data: variables = [] } = useNotificationTemplateVariables(template?.event_slug);
  const saveVersion = useSaveTemplateVersion();
  
  // Initialize form
  useEffect(() => {
    if (template) {
      setSubject(template.subject_template || '');
      setBody(template.body_template || '');
      setReason('');
    }
  }, [template]);
  
  // Validation
  const validation = useMemo(() => {
    if (!template) return { valid: true, invalidVariables: [] };
    return validateTemplateVariables(body, subject, variables);
  }, [body, subject, variables, template]);
  
  // Used variables
  const usedVariables = useMemo(() => {
    return extractTemplateVariables((body || '') + ' ' + (subject || ''));
  }, [body, subject]);
  
  // Preview rendering with DOMPurify sanitization for XSS protection
  const previewHtml = useMemo(() => {
    let preview = body;
    for (const v of variables) {
      const regex = new RegExp(`\\{\\{${v.variable_key}\\}\\}`, 'g');
      preview = preview.replace(regex, v.example_value || `[${v.variable_label}]`);
    }
    return DOMPurify.sanitize(preview, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'div', 'span', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'blockquote', 'pre', 'code', 'hr'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style', 'src', 'alt', 'width', 'height'],
    });
  }, [body, variables]);
  
  const previewSubject = useMemo(() => {
    let preview = subject;
    for (const v of variables) {
      const regex = new RegExp(`\\{\\{${v.variable_key}\\}\\}`, 'g');
      preview = preview.replace(regex, v.example_value || `[${v.variable_label}]`);
    }
    return preview;
  }, [subject, variables]);
  
  // Insert variable at cursor
  const insertVariable = (varKey: string, targetField: 'subject' | 'body') => {
    const varText = `{{${varKey}}}`;
    if (targetField === 'subject') {
      setSubject(prev => prev + varText);
    } else {
      setBody(prev => prev + varText);
    }
  };
  
  // Save handler
  const handleSave = async () => {
    if (!template) return;
    
    if (reason.length < 10) {
      toast.error('Informe um motivo com pelo menos 10 caracteres');
      return;
    }
    
    if (!validation.valid) {
      toast.error('Corrija as variáveis inválidas antes de salvar');
      return;
    }
    
    try {
      await saveVersion.mutateAsync({
        templateId: template.id,
        subject: template.channel === 'email' ? subject : null,
        body,
        reason,
      });
      toast.success('Nova versão salva com sucesso!');
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao salvar', { description: error.message });
    }
  };
  
  const isEmailChannel = template?.channel === 'email';
  const hasChanges = template && (
    subject !== (template.subject_template || '') ||
    body !== (template.body_template || '')
  );
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[800px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Editar Template
          </SheetTitle>
          <SheetDescription>
            {template?.event_slug} • {template?.channel}
            {!template?.bu_id && (
              <Badge variant="secondary" className="ml-2">Template Global</Badge>
            )}
          </SheetDescription>
        </SheetHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit" className="gap-2">
              <Code className="h-4 w-4" />
              Editar
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="edit" className="flex-1 flex gap-4 min-h-0 mt-4">
            {/* Editor */}
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              {isEmailChannel && (
                <div className="space-y-2">
                  <Label htmlFor="subject">Assunto</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Assunto do email..."
                  />
                </div>
              )}
              
              <div className="flex-1 flex flex-col min-h-0 space-y-2">
                <Label htmlFor="body">Corpo (Markdown/HTML)</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Conteúdo do template..."
                  className="flex-1 min-h-[200px] font-mono text-sm resize-none"
                />
              </div>
              
              {/* Validation Alert */}
              {!validation.valid && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Variáveis inválidas: {validation.invalidVariables.map(v => `{{${v}}}`).join(', ')}
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo da alteração (mín. 10 caracteres)</Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Ajuste de texto para clareza..."
                  className={cn(reason.length > 0 && reason.length < 10 && "border-destructive")}
                />
              </div>
            </div>
            
            {/* Variables Sidebar */}
            <div className="w-56 flex flex-col gap-2">
              <h4 className="font-medium text-sm flex items-center gap-1">
                <Info className="h-4 w-4" />
                Variáveis Disponíveis
              </h4>
              <ScrollArea className="flex-1 border rounded-md p-2">
                <div className="space-y-1">
                  {variables.map((v) => (
                    <div
                      key={v.id}
                      className={cn(
                        "p-2 rounded text-sm cursor-pointer hover:bg-muted transition-colors",
                        usedVariables.includes(v.variable_key) && "bg-primary/10"
                      )}
                      onClick={() => insertVariable(v.variable_key, 'body')}
                    >
                      <div className="flex items-center justify-between">
                        <code className="text-xs font-mono">
                          {`{{${v.variable_key}}}`}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(`{{${v.variable_key}}}`);
                            toast.success('Copiado!');
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {v.variable_label}
                        {v.is_required && (
                          <Badge variant="outline" className="ml-1 text-[10px]">
                            obrigatório
                          </Badge>
                        )}
                      </div>
                      {v.example_value && (
                        <div className="text-xs text-muted-foreground italic">
                          Ex: {v.example_value}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
          
          <TabsContent value="preview" className="flex-1 min-h-0 mt-4">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Preview com Dados de Exemplo</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                {isEmailChannel && previewSubject && (
                  <>
                    <div className="font-medium mb-2">
                      Assunto: {previewSubject}
                    </div>
                    <Separator className="my-2" />
                  </>
                )}
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <SheetFooter className="mt-4">
          <div className="flex items-center gap-2 w-full">
            {validation.valid ? (
              <div className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Variáveis válidas
              </div>
            ) : (
              <div className="flex items-center gap-1 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                {validation.invalidVariables.length} inválida(s)
              </div>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!hasChanges || !validation.valid || reason.length < 10 || saveVersion.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {saveVersion.isPending ? 'Salvando...' : 'Salvar Nova Versão'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
