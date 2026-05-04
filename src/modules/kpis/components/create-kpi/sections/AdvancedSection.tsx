import type { UseFormReturn } from "react-hook-form";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { ChevronDown } from "lucide-react";
import type { CreateKpiFormValues } from "../schema";

interface Props {
  form: UseFormReturn<CreateKpiFormValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdvancedSection({ form, open, onOpenChange }: Props) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-between text-muted-foreground"
        >
          Configurações avançadas
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-2">
        <FormField
          control={form.control}
          name="recovery_protocol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Protocolo de Recuperação (opcional)
                <HelpTooltip content="Plano de ação pré-definido a ser executado quando o indicador entrar em status amarelo ou vermelho." />
              </FormLabel>
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
