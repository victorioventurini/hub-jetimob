/**
 * Step 2b: New contact registration form
 * Full form with email pre-filled
 */
import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { formatPhoneInput, normalizePhone } from "@/lib/phone";
import { useCreateGlobalContact } from "@/modules/tickets/hooks";
import type { PartnerCompany } from "../../../types";

const formSchema = z.object({
  external_company_id: z.string().min(1, "Empresa é obrigatória"),
  name: z.string().trim().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  email: z.string().trim().email("Email inválido"),
  phone: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

type FormData = z.infer<typeof formSchema>;

interface ContactFormStepProps {
  email: string;
  companies: PartnerCompany[];
  defaultCompanyId?: string;
  onBack: () => void;
  onSuccess: () => void;
}

export function ContactFormStep({
  email,
  companies,
  defaultCompanyId,
  onBack,
  onSuccess,
}: ContactFormStepProps) {
  const { mutate: createContact, isPending } = useCreateGlobalContact();
  const [domainError, setDomainError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      external_company_id: defaultCompanyId || "",
      name: "",
      email: email,
      phone: "",
      status: "active",
    },
  });

  const watchedCompanyId = form.watch("external_company_id");
  const watchedEmail = form.watch("email");

  // Get selected company for domain validation
  const selectedCompany = useMemo(() => {
    return companies.find((c) => c.id === watchedCompanyId);
  }, [companies, watchedCompanyId]);

  const allowedDomains = useMemo(() => {
    return selectedCompany?.allowed_domains || [];
  }, [selectedCompany]);

  // Validate domain when email or company changes
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

    if (allowedDomains.length === 0) {
      setDomainError(null);
      return;
    }

    const isDomainAllowed = allowedDomains.some(
      (domain) => domain.toLowerCase() === emailDomain
    );

    if (!isDomainAllowed) {
      setDomainError(
        `O domínio "@${emailDomain}" não está autorizado para ${selectedCompany?.name}. ` +
          `Domínios permitidos: ${allowedDomains.map((d) => `@${d}`).join(", ")}`
      );
    } else {
      setDomainError(null);
    }
  }, [watchedEmail, watchedCompanyId, allowedDomains, selectedCompany?.name]);

  const handlePhoneChange = (value: string, onChange: (value: string) => void) => {
    const formatted = formatPhoneInput(value);
    onChange(formatted);
  };

  const onSubmit = (data: FormData) => {
    if (domainError) return;

    const phoneDigits = normalizePhone(data.phone);

    createContact(
      {
        external_company_id: data.external_company_id,
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        phone: phoneDigits,
        status: data.status,
        sendInvite: true,
      },
      { onSuccess }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="external_company_id"
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
                <Input
                  placeholder="email@empresa.com"
                  type="email"
                  disabled
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Este email será usado para login via Magic Link
                {allowedDomains.length > 0 && (
                  <span className="block mt-1 text-muted-foreground">
                    Domínios permitidos: {allowedDomains.map((d) => `@${d}`).join(", ")}
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
              <FormDescription>Formato: +55 (DDD) XXXXX-XXXX</FormDescription>
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
                <FormDescription>Contatos inativos não podem fazer login</FormDescription>
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

        <div className="flex justify-between pt-4">
          <Button type="button" variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button type="submit" disabled={isPending || !!domainError}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              "Criar contato"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
