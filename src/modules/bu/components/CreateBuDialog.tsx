import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Plus, X, Globe, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCreateBu } from "../hooks/useBuData";
import { toast } from "sonner";

const createBuSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  description: z.string().optional(),
  legal_entity: z.string().optional(),
  allowed_email_domains: z.array(z.string()).min(1, "Adicione ao menos um domínio"),
});

type CreateBuFormData = z.infer<typeof createBuSchema>;

interface CreateBuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBuDialog({ open, onOpenChange }: CreateBuDialogProps) {
  const [domainInput, setDomainInput] = useState("");
  const createBu = useCreateBu();

  const form = useForm<CreateBuFormData>({
    resolver: zodResolver(createBuSchema),
    defaultValues: {
      name: "",
      description: "",
      legal_entity: "",
      allowed_email_domains: [],
    },
  });

  const domains = form.watch("allowed_email_domains");

  const handleAddDomain = () => {
    const domain = domainInput.trim().toLowerCase().replace(/^@/, "");
    if (!domain) return;

    // Validate domain format
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
      toast.error("Formato de domínio inválido");
      return;
    }

    if (domains.includes(domain)) {
      toast.error("Domínio já adicionado");
      return;
    }

    form.setValue("allowed_email_domains", [...domains, domain]);
    setDomainInput("");
  };

  const handleRemoveDomain = (domain: string) => {
    form.setValue(
      "allowed_email_domains",
      domains.filter((d) => d !== domain)
    );
  };

  const onSubmit = async (data: CreateBuFormData) => {
    try {
      await createBu.mutateAsync({
        name: data.name,
        description: data.description || undefined,
        legal_entity: data.legal_entity || undefined,
        allowed_email_domains: data.allowed_email_domains,
      });
      toast.success("Business Unit criada com sucesso!");
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar Business Unit");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Nova Business Unit
          </DialogTitle>
          <DialogDescription>
            Crie uma nova unidade de negócio com domínios de e-mail autorizados.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da BU</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Jet Experience" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrição da unidade de negócio"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="legal_entity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razão Social (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Jet Experience LTDA" {...field} />
                  </FormControl>
                  <FormDescription>
                    CNPJ ou razão social da empresa, se aplicável.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allowed_email_domains"
              render={() => (
                <FormItem>
                  <FormLabel>Domínios de E-mail Autorizados</FormLabel>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="jetxp.com.br"
                        value={domainInput}
                        onChange={(e) => setDomainInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddDomain();
                          }
                        }}
                        className="pl-10"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleAddDomain}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {domains.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {domains.map((domain) => (
                        <Badge
                          key={domain}
                          variant="secondary"
                          className="gap-1 pr-1"
                        >
                          @{domain}
                          <button
                            type="button"
                            onClick={() => handleRemoveDomain(domain)}
                            className="ml-1 hover:bg-muted rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <FormDescription>
                    Apenas usuários com esses domínios poderão fazer login nesta BU.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createBu.isPending}>
                {createBu.isPending ? "Criando..." : "Criar BU"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
