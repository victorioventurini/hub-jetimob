/**
 * Step 1: Email verification
 * Checks if email already exists in the system
 */
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Mail, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useCheckContactByEmail } from "../../../hooks/usePartnerContactGlobal";
import type { PartnerCompany } from "../../../types";

const emailSchema = z.object({
  email: z.string().trim().email("Email inválido"),
  partner_company_id: z.string().min(1, "Selecione uma empresa"),
});

type EmailFormData = z.infer<typeof emailSchema>;

interface EmailVerificationStepProps {
  companies: PartnerCompany[];
  defaultCompanyId?: string;
  currentBuId: string | null;
  onVerified: (email: string, existingContactId: string | null) => void;
  onCancel: () => void;
}

export function EmailVerificationStep({
  companies,
  defaultCompanyId,
  currentBuId,
  onVerified,
  onCancel,
}: EmailVerificationStepProps) {
  const [searchEmail, setSearchEmail] = useState<string | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
      partner_company_id: defaultCompanyId || "",
    },
  });

  const watchedEmail = form.watch("email");
  const watchedCompanyId = form.watch("partner_company_id");

  // Check if email exists globally
  const { data: existingContact, isLoading: isChecking } = useCheckContactByEmail(searchEmail);

  // Get selected company for domain validation
  const selectedCompany = useMemo(() => {
    return companies.find((c) => c.id === watchedCompanyId);
  }, [companies, watchedCompanyId]);

  const allowedDomains = useMemo(() => {
    return selectedCompany?.allowed_domains || [];
  }, [selectedCompany]);

  // Validate email domain
  const validateDomain = (email: string): boolean => {
    if (!email || !watchedCompanyId) {
      setDomainError(null);
      return true;
    }

    const emailParts = email.toLowerCase().trim().split("@");
    if (emailParts.length !== 2) {
      setDomainError(null);
      return true;
    }

    const emailDomain = emailParts[1];

    // If company has no configured domains, allow any
    if (allowedDomains.length === 0) {
      setDomainError(null);
      return true;
    }

    const isDomainAllowed = allowedDomains.some(
      (domain) => domain.toLowerCase() === emailDomain
    );

    if (!isDomainAllowed) {
      setDomainError(
        `O domínio "@${emailDomain}" não está autorizado para ${selectedCompany?.name}. ` +
          `Domínios permitidos: ${allowedDomains.map((d) => `@${d}`).join(", ")}`
      );
      return false;
    }

    setDomainError(null);
    return true;
  };

  const handleSearch = (data: EmailFormData) => {
    if (!validateDomain(data.email)) return;
    setSearchEmail(data.email.toLowerCase().trim());
  };

  const handleContinue = () => {
    const email = searchEmail!;
    
    if (existingContact) {
      // Check if already active in current BU
      const currentBuAssoc = existingContact.associations?.find(
        (a) => a.bu_id === currentBuId
      );
      
      if (currentBuAssoc?.is_active) {
        // Already active - show error
        form.setError("email", {
          type: "manual",
          message: "Este contato já está ativo nesta BU",
        });
        setSearchEmail(null);
        return;
      }

      // Contact exists, go to existing step
      onVerified(email, existingContact.id);
    } else {
      // New contact, go to form
      onVerified(email, null);
    }
  };

  const showResult = searchEmail && !isChecking;
  const contactFound = showResult && existingContact;
  const contactNotFound = showResult && !existingContact;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSearch)} className="space-y-4">
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email do contato *</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="email@empresa.com"
                      type="email"
                      className="pl-10"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setSearchEmail(null); // Reset search on change
                        setDomainError(null);
                      }}
                    />
                  </div>
                </FormControl>
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={isChecking || !watchedEmail || !watchedCompanyId}
                >
                  {isChecking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <FormDescription>
                Digite o email para verificar se já está cadastrado
                {allowedDomains.length > 0 && (
                  <span className="block mt-1">
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

        {contactFound && (
          <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>{existingContact.name}</strong> já está cadastrado.
              {existingContact.partner_company && (
                <span className="block text-sm mt-1">
                  Empresa: {(existingContact.partner_company as { name: string }).name}
                </span>
              )}
              {existingContact.associations && existingContact.associations.length > 0 && (
                <span className="block text-sm mt-1">
                  BUs ativas: {existingContact.associations
                    .filter((a) => a.is_active)
                    .map((a) => a.bu_name)
                    .join(", ") || "Nenhuma"}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {contactNotFound && (
          <Alert className="bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800">
            <AlertCircle className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-800 dark:text-emerald-200">
              Email disponível. Você pode cadastrar um novo contato.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          {showResult && (
            <Button type="button" onClick={handleContinue}>
              {contactFound ? "Ativar nesta BU" : "Continuar cadastro"}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
