import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCreateRoutingRule, useUpdateRoutingRule, usePartnerContacts } from "../../hooks";
import { TicketRoutingRule, PartnerCompany, TicketCategory } from "../../types";

const formSchema = z.object({
  external_company_id: z.string().min(1, "Empresa é obrigatória"),
  subcategory_id: z.string().min(1, "Subcategoria é obrigatória"),
  assignee_contact_ids: z.array(z.string()),
  watcher_contact_ids: z.array(z.string()),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface RoutingRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: TicketRoutingRule | null;
  companies: PartnerCompany[];
  categories: TicketCategory[];
}

export function RoutingRuleDialog({
  open,
  onOpenChange,
  rule,
  companies,
  categories,
}: RoutingRuleDialogProps) {
  const { mutate: createRule, isPending: isCreating } = useCreateRoutingRule();
  const { mutate: updateRule, isPending: isUpdating } = useUpdateRoutingRule();
  const isPending = isCreating || isUpdating;

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | undefined>();
  const { data: contacts = [] } = usePartnerContacts(selectedCompanyId);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      external_company_id: "",
      subcategory_id: "",
      assignee_contact_ids: [],
      watcher_contact_ids: [],
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (rule) {
        setSelectedCompanyId(rule.external_company_id);
        form.reset({
          external_company_id: rule.external_company_id,
          subcategory_id: rule.subcategory_id,
          assignee_contact_ids: rule.assignee_contact_ids || [],
          watcher_contact_ids: rule.watcher_contact_ids || [],
          notes: rule.notes || "",
        });
      } else {
        setSelectedCompanyId(undefined);
        form.reset({
          external_company_id: "",
          subcategory_id: "",
          assignee_contact_ids: [],
          watcher_contact_ids: [],
          notes: "",
        });
      }
    }
  }, [open, rule, form]);

  const onSubmit = (data: FormData) => {
    if (rule) {
      updateRule(
        {
          id: rule.id,
          external_company_id: data.external_company_id,
          subcategory_id: data.subcategory_id,
          assignee_contact_ids: data.assignee_contact_ids,
          watcher_contact_ids: data.watcher_contact_ids,
          notes: data.notes || null,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createRule(
        {
          external_company_id: data.external_company_id,
          subcategory_id: data.subcategory_id,
          assignee_contact_ids: data.assignee_contact_ids,
          watcher_contact_ids: data.watcher_contact_ids,
          notes: data.notes || null,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  // Flatten subcategories for select
  const subcategories = categories.flatMap((cat) =>
    (cat.subcategories || [])
      .filter((sub) => sub.status === "active")
      .map((sub) => ({
        id: sub.id,
        label: `${cat.name} → ${sub.name}`,
      }))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {rule ? "Editar Regra de Roteamento" : "Nova Regra de Roteamento"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="external_company_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa Parceira *</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedCompanyId(value);
                      form.setValue("assignee_contact_ids", []);
                      form.setValue("watcher_contact_ids", []);
                    }}
                    value={field.value}
                  >
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
              name="subcategory_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subcategoria *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a subcategoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subcategories.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Tickets desta subcategoria serão atribuídos automaticamente
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedCompanyId && contacts.length > 0 && (
              <>
                <FormField
                  control={form.control}
                  name="assignee_contact_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsáveis</FormLabel>
                      <ScrollArea className="h-32 rounded-md border p-2">
                        <div className="space-y-2">
                          {contacts.map((contact) => (
                            <div key={contact.id} className="flex items-center space-x-2">
                              <Checkbox
                                checked={field.value.includes(contact.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, contact.id]);
                                  } else {
                                    field.onChange(field.value.filter((id) => id !== contact.id));
                                  }
                                }}
                              />
                              <span className="text-sm">{contact.name} ({contact.email})</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <FormDescription>
                        Contatos que receberão os tickets como responsáveis
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="watcher_contact_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observadores</FormLabel>
                      <ScrollArea className="h-32 rounded-md border p-2">
                        <div className="space-y-2">
                          {contacts.map((contact) => (
                            <div key={contact.id} className="flex items-center space-x-2">
                              <Checkbox
                                checked={field.value.includes(contact.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, contact.id]);
                                  } else {
                                    field.onChange(field.value.filter((id) => id !== contact.id));
                                  }
                                }}
                              />
                              <span className="text-sm">{contact.name} ({contact.email})</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <FormDescription>
                        Contatos que serão notificados sobre atualizações
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </>
            )}

            {selectedCompanyId && contacts.length === 0 && (
              <p className="text-sm text-muted-foreground p-2 border rounded">
                Esta empresa não tem contatos cadastrados. Adicione contatos primeiro.
              </p>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações sobre esta regra (opcional)"
                      {...field}
                    />
                  </FormControl>
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
              <Button type="submit" disabled={isPending}>
                {rule ? "Salvar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
