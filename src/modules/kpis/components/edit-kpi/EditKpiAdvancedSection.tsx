/**
 * EditKpiAdvancedSection — Collapsible com Protocolo de Recuperação
 * Extraído de EditKpiDialog.tsx (refatoração P1.4)
 */
import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ChevronDown } from 'lucide-react';
import type { EditKpiFormValues } from './editKpiSchema';

interface EditKpiAdvancedSectionProps {
  form: UseFormReturn<EditKpiFormValues>;
  showAdvanced: boolean;
  setShowAdvanced: (open: boolean) => void;
}

export function EditKpiAdvancedSection({
  form,
  showAdvanced,
  setShowAdvanced,
}: EditKpiAdvancedSectionProps) {
  return (
    <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-between text-muted-foreground"
        >
          Configurações avançadas
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-2">
        <FormField
          control={form.control}
          name="recovery_protocol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Protocolo de Recuperação (opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descreva o plano de ação caso o indicador fique amarelo ou vermelho..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Ações a serem tomadas quando o indicador ficar fora da meta
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
