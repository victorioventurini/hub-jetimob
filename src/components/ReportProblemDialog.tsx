import { useState } from "react";
import { Bug, Send } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBu } from "@/contexts/BuContext";

const reportSchema = z.object({
  description: z
    .string()
    .trim()
    .min(10, "Descreva o problema com pelo menos 10 caracteres")
    .max(1000, "A descrição deve ter no máximo 1000 caracteres"),
});

type ReportFormValues = z.infer<typeof reportSchema>;

interface ReportProblemDialogProps {
  attemptedRoute: string;
  trigger?: React.ReactNode;
}

export function ReportProblemDialog({
  attemptedRoute,
  trigger,
}: ReportProblemDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { currentBu } = useBu();

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      description: "",
    },
  });

  async function onSubmit(values: ReportFormValues) {
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("audit_logs").insert({
        action: "report_problem",
        entity_type: "404_error",
        entity_id: null,
        user_id: user?.id || null,
        user_agent: navigator.userAgent,
        new_values: {
          attempted_route: attemptedRoute,
          description: values.description,
          user_email: user?.email || null,
          user_name: profile?.display_name || null,
          bu_id: currentBu?.id || null,
          bu_name: currentBu?.name || null,
          timestamp: new Date().toISOString(),
          referrer: document.referrer || null,
        },
      });

      if (error) throw error;

      toast({
        title: "Problema reportado",
        description: "Obrigado pelo feedback! Vamos investigar.",
      });

      form.reset();
      setOpen(false);
    } catch (error) {
      console.error("Error reporting problem:", error);
      toast({
        title: "Erro ao reportar",
        description: "Não foi possível enviar o report. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button
            className="flex items-center gap-1.5 text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Reportar um problema"
          >
            <Bug className="h-3.5 w-3.5" />
            Reportar problema
          </button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-muted-foreground" />
            Reportar problema
          </DialogTitle>
          <DialogDescription>
            Conta pra gente o que você estava tentando fazer. Isso nos ajuda a
            melhorar o Hub.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Contexto da rota */}
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Rota tentada: </span>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                {attemptedRoute}
              </code>
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>O que você estava tentando fazer?</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o que você esperava encontrar ou a ação que estava tentando realizar..."
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  "Enviando..."
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
