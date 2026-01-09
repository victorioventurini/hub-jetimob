import { useEffect, useState, useMemo } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useCreatePartnerContact, useUpdatePartnerContact } from "../../hooks/usePartners";
import { PartnerContact, PartnerCompany } from "../../types";
import { ContactCapabilitiesList } from "./ContactCapabilitiesList";

import { formatPhoneInput, formatPhoneDisplay, normalizePhone } from "@/lib/phone";

const formSchema = z.object({
  partner_company_id: z.string().min(1, "Empresa é obrigatória"),
  name: z.string().trim().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  email: z.string().trim().email("Email inválido").max(255, "Email deve ter no máximo 255 caracteres"),
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
  const isEditMode = !!contact;
  const { mutate: createContact, isPending: isCreating } = useCreatePartnerContact();
  const { mutate: updateContact, isPending: isUpdating } = useUpdatePartnerContact();
  const isPending = isCreating || isUpdating;
  
  const [activeTab, setActiveTab] = useState("data");
  const [domainError, setDomainError] = useState<string | null>(null);

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

  const watchedCompanyId = form.watch("partner_company_id");
  const watchedEmail = form.watch("email");

  // Obter domínios permitidos da empresa selecionada
  const selectedCompany = useMemo(() => {
    return companies.find(c => c.id === watchedCompanyId);
  }, [companies, watchedCompanyId]);

  const allowedDomains = useMemo(() => {
    return selectedCompany?.allowed_domains || [];
  }, [selectedCompany]);

  // Validar domínio do email quando email ou empresa mudar
  useEffect(() => {
    if (!watchedEmail || !watchedCompanyId) {
      setDomainError(null);
      return;
    }

    const emailParts = watchedEmail.toLowerCase().trim().split("@");
    if (emailParts.length !== 2) {
      setDomainError(null);
      return;
    }

    const emailDomain = emailParts[1];
    
    // Se a empresa não tem domínios configurados, permitir qualquer domínio
    if (allowedDomains.length === 0) {
      setDomainError(null);
      return;
    }

    // Verificar se o domínio do email está na lista de domínios permitidos
    const isDomainAllowed = allowedDomains.some(
      domain => domain.toLowerCase() === emailDomain
    );

    if (!isDomainAllowed) {
      setDomainError(
        `O domínio "@${emailDomain}" não está autorizado para ${selectedCompany?.name}. ` +
        `Domínios permitidos: ${allowedDomains.map(d => `@${d}`).join(", ")}`
      );
    } else {
      setDomainError(null);
    }
  }, [watchedEmail, watchedCompanyId, allowedDomains, selectedCompany?.name]);

  useEffect(() => {
    if (open) {
      setActiveTab("data");
      setDomainError(null);
      if (contact) {
        form.reset({
          partner_company_id: contact.partner_company_id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone ? formatPhoneDisplay(contact.phone) : "",
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

  const handlePhoneChange = (value: string, onChange: (value: string) => void) => {
    const formatted = formatPhoneInput(value);
    onChange(formatted);
  };

  const onSubmit = (data: FormData) => {
    // Bloquear submit se houver erro de domínio
    if (domainError) {
      return;
    }

    // Normalize phone to digits only for storage
    const phoneDigits = normalizePhone(data.phone);

    if (contact) {
      updateContact(
        {
          id: contact.id,
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          phone: phoneDigits,
          status: data.status,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createContact(
        {
          partner_company_id: data.partner_company_id,
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          phone: phoneDigits,
          status: data.status,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  const isSubmitDisabled = isPending || !!domainError;

  // Form fields component para reutilização
  const FormFields = () => (
    <>
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
              {allowedDomains.length > 0 && (
                <span className="block mt-1 text-muted-foreground">
                  Domínios permitidos: {allowedDomains.map(d => `@${d}`).join(", ")}
                </span>
              )}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {domainError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{domainError}</AlertDescription>
        </Alert>
      )}

      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Telefone</FormLabel>
            <FormControl>
              <Input 
                placeholder="+55 (51) 99999-9999" 
                value={field.value}
                onChange={(e) => handlePhoneChange(e.target.value, field.onChange)}
              />
            </FormControl>
            <FormDescription>
              Formato: +55 (DDD) XXXXX-XXXX
            </FormDescription>
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
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contact ? "Editar Contato" : "Novo Contato"}
          </DialogTitle>
        </DialogHeader>

        {isEditMode ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="data">Dados</TabsTrigger>
              <TabsTrigger value="capabilities">Capacidades</TabsTrigger>
            </TabsList>

            <TabsContent value="data" className="mt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormFields />
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitDisabled}>
                      Salvar
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="capabilities" className="mt-4">
              <ContactCapabilitiesList
                contactId={contact!.id}
                companyId={contact!.partner_company_id}
              />
              <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormFields />
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitDisabled}>
                  Criar
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
