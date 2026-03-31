/**
 * AddendumSection - Post-submission addendum UI
 * 
 * Allows leaders to add supplementary notes after submitting a ritual.
 * Displays existing addendums in chronological order.
 */

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquarePlus, Send, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useIdentity } from '@/hooks/useIdentity';
import { queryKeys } from '@/lib/queryKeys';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Addendum {
  text: string;
  created_at: string;
  created_by: string;
}

interface AddendumSectionProps {
  sessionId: string;
  addendums: Addendum[];
}

export function AddendumSection({ sessionId, addendums: initialAddendums }: AddendumSectionProps) {
  const [text, setText] = useState('');
  const [addendums, setAddendums] = useState<Addendum[]>(initialAddendums);
  const buSupabase = useBuScopedSupabase();
  const { profileId } = useIdentity();
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: async (addendumText: string) => {
      if (!profileId) throw new Error('Usuário não identificado');

      const newAddendum: Addendum = {
        text: addendumText,
        created_at: new Date().toISOString(),
        created_by: profileId,
      };

      const updatedAddendums = [...addendums, newAddendum];

      const { error } = await buSupabase
        .from('okr_wizard_sessions')
        .update({ addendums: updatedAddendums as any })
        .eq('id', sessionId);

      if (error) throw error;
      return updatedAddendums;
    },
    onSuccess: (updated) => {
      setAddendums(updated);
      setText('');
      toast.success('Adendo registrado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['okr-completed-session-cycle'] });
    },
    onError: () => {
      toast.error('Erro ao enviar adendo. Tente novamente.');
    },
  });

  const handleSubmit = useCallback(() => {
    if (!text.trim()) return;
    submitMutation.mutate(text.trim());
  }, [text, submitMutation]);

  return (
    <div className="space-y-4">
      {addendums.length > 0 && (
        <div className="space-y-2">
          {addendums.map((addendum, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-3 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    {format(new Date(addendum.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{addendum.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4 text-primary" />
            Precisa adicionar algo?
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            O envio original não pode ser alterado, mas você pode registrar um adendo que será visível para o C-Level e para o facilitador da reunião.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Adicione contexto, correções ou informações que ficaram de fora..."
            className="min-h-[80px] text-sm"
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!text.trim() || submitMutation.isPending}
            className="gap-1"
          >
            <Send className="h-3 w-3" />
            {submitMutation.isPending ? 'Enviando...' : 'Enviar adendo'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
