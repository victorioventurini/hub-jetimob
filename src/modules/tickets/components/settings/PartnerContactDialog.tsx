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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCreatePartnerContact, useUpdatePartnerContact } from "../../hooks/usePartners";
import { PartnerContact, PartnerCompany } from "../../types";

const formSchema = z.object({
  partner_company_id: z.string().min(1, "Empresa é obrigatória"),
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

type FormData = z.infer<typeof formSchema>;

interface PartnerContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: PartnerContact | null;
  companies: PartnerCompany[];
  defaultCompanyId?: string;
}

export function PartnerContactDialog({
  open,
  onOpenChange,
  contact,
  companies,
  defaultCompanyId,
}: PartnerContactDialogProps) {
  const { mutate: createContact, isPending: isCreating } = useCreatePartnerContact();
  const { mutate: updateContact, isPending: isUpdating } = useUpdatePartnerContact();
  const isPending = isCreating || isUpdating;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partner_company_id: "",
      name: "",
      email: "",
      phone: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (open) {
      if (contact) {
        form.reset({
          partner_company_id: contact.partner_company_id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone || "",
          status: contact.status,
        });
      } else {
        form.reset({
          partner_company_id: defaultCompanyId || "",
          name: "",
          email: "",
          phone: "",
          status: "active",
        });
      }
    }
  }, [open, contact, defaultCompanyId, form]);

  const onSubmit = (data: FormData) => {
    if (contact) {
      updateContact(
        {
          id: contact.id,
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          status: data.status,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createContact(
        {
          partner_company_id: data.partner_company_id,
          name: data.name,
          email: data.email,
          phone: data.phone || null,
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
            {contact ? "Editar Contato" : "Novo Contato"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="partner_company_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a empresa" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do contato" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input placeholder="email@empresa.com" type="email" {...field} />
                  </FormControl>
                  <FormDescription>
                    Este email será usado para login via Magic Link
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="(00) 00000-0000" {...field} />
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
                      Contatos inativos não podem fazer login
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
                {contact ? "Salvar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
