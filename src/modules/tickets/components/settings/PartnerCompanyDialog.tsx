import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useCreatePartnerCompany, useUpdatePartnerCompany } from "../../hooks/usePartners";
import { PartnerCompany } from "../../types";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  legal_name: z.string().optional(),
  allowed_domains: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

type FormData = z.infer<typeof formSchema>;

interface PartnerCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: PartnerCompany | null;
}

export function PartnerCompanyDialog({
  open,
  onOpenChange,
  company,
}: PartnerCompanyDialogProps) {
  const { mutate: createCompany, isPending: isCreating } = useCreatePartnerCompany();
  const { mutate: updateCompany, isPending: isUpdating } = useUpdatePartnerCompany();
  const isPending = isCreating || isUpdating;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      legal_name: "",
      allowed_domains: "",
      notes: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (open) {
      if (company) {
        form.reset({
          name: company.name,
          legal_name: company.legal_name || "",
          allowed_domains: company.allowed_domains?.join(", ") || "",
          notes: company.notes || "",
          status: company.status,
        });
      } else {
        form.reset({
          name: "",
          legal_name: "",
          allowed_domains: "",
          notes: "",
          status: "active",
        });
      }
    }
  }, [open, company, form]);

  const onSubmit = (data: FormData) => {
    const domains = data.allowed_domains
      ?.split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean) || [];

    if (company) {
      updateCompany(
        {
          id: company.id,
          name: data.name,
          legal_name: data.legal_name || null,
          allowed_domains: domains,
          notes: data.notes || null,
          status: data.status,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createCompany(
        {
          name: data.name,
          legal_name: data.legal_name || null,
          allowed_domains: domains,
          notes: data.notes || null,
          status: data.status,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {company ? "Editar Empresa Parceira" : "Nova Empresa Parceira"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da empresa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="legal_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razão Social</FormLabel>
                  <FormControl>
                    <Input placeholder="Razão social (opcional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allowed_domains"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domínios Permitidos</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="empresa.com.br, empresa.com"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Separe múltiplos domínios por vírgula. Emails desses domínios poderão fazer login.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações internas sobre a parceria..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Ativo</FormLabel>
                    <FormDescription>
                      Empresas inativas não podem criar novos tickets
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value === "active"}
                      onCheckedChange={(checked) =>
                        field.onChange(checked ? "active" : "inactive")
                      }
                    />
                  </FormControl>
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
              <Button type="submit" disabled={isPending}>
                {company ? "Salvar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
