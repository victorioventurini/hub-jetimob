import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DocumentInput, type DocumentType } from "@/components/ui/document-input";
import { Loader2, Building2, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBu } from "@/contexts/BuContext";
import { useCreatePartnerCompany, useUpdatePartnerCompany } from "../../hooks";
import { useActivatePartnerInBu } from "@/modules/partners/hooks/usePartnerBuAssociations";
import { queryKeys } from "@/lib/queryKeys";
import { PartnerCompany } from "../../types";
import { toast } from "sonner";

// ===========================================
// TYPES & SCHEMAS
// ===========================================

type DialogStep = "document" | "existing" | "form";

interface ExistingCompany {
  id: string;
  name: string;
  legal_name: string | null;
  document: string | null;
  document_type: string | null;
  person_type: string | null;
  status: string;
  // Computed
  is_active_in_current_bu: boolean;
}

const documentSchema = z.object({
  document: z.string().min(11, "Documento é obrigatório"),
});

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  legal_name: z.string().optional(),
  person_type: z.enum(["pf", "pj"]),
  document: z.string().optional(),
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

// ===========================================
// COMPONENT
// ===========================================

export function PartnerCompanyDialog({
  open,
  onOpenChange,
  company,
}: PartnerCompanyDialogProps) {
  const { currentBu } = useBu();
  const queryClient = useQueryClient();
  
  const { mutate: createCompany, isPending: isCreating } = useCreatePartnerCompany();
  const { mutate: updateCompany, isPending: isUpdating } = useUpdatePartnerCompany();
  const { mutate: activateInBu, isPending: isActivating } = useActivatePartnerInBu();
  const isPending = isCreating || isUpdating || isActivating;

  // Step state
  const [step, setStep] = useState<DialogStep>("document");
  const [documentInput, setDocumentInput] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [isCheckingDocument, setIsCheckingDocument] = useState(false);
  const [existingCompany, setExistingCompany] = useState<ExistingCompany | null>(null);
  const [personTypeForCheck, setPersonTypeForCheck] = useState<"pf" | "pj">("pj");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      legal_name: "",
      person_type: "pj",
      document: "",
      allowed_domains: "",
      notes: "",
      status: "active",
    },
  });

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (company) {
        // Edit mode - go directly to form
        setStep("form");
        form.reset({
          name: company.name,
          legal_name: company.legal_name || "",
          person_type: (company.person_type === 'pf' ? 'pf' : 'pj') as 'pf' | 'pj',
          document: company.document || "",
          allowed_domains: company.allowed_domains?.join(", ") || "",
          notes: company.notes || "",
          status: company.status,
        });
        setDocumentType(company.document_type as DocumentType || null);
      } else {
        // Create mode - start with document verification
        setStep("document");
        setDocumentInput("");
        setDocumentType(null);
        setDocumentError(null);
        setExistingCompany(null);
        setPersonTypeForCheck("pj");
        form.reset({
          name: "",
          legal_name: "",
          person_type: "pj",
          document: "",
          allowed_domains: "",
          notes: "",
          status: "active",
        });
      }
    }
  }, [open, company, form]);

  // ===========================================
  // DOCUMENT VERIFICATION
  // ===========================================

  const handleCheckDocument = async () => {
    const cleanDoc = documentInput.replace(/\D/g, "");
    
    // Validate document length
    if (personTypeForCheck === "pf" && cleanDoc.length !== 11) {
      setDocumentError("CPF deve ter 11 dígitos");
      return;
    }
    if (personTypeForCheck === "pj" && cleanDoc.length !== 14) {
      setDocumentError("CNPJ deve ter 14 dígitos");
      return;
    }

    setDocumentError(null);
    setIsCheckingDocument(true);

    try {
      // Search for existing company globally (any BU)
      const { data: existingData, error } = await supabase
        .from("partner_companies")
        .select("id, name, legal_name, document, document_type, person_type, status")
        .eq("document", cleanDoc)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;

      if (existingData) {
        // Check if already active in current BU
        let isActiveInCurrentBu = false;
        
        if (currentBu?.id) {
          const { data: association } = await supabase
            .from("partner_company_bu_associations")
            .select("id, is_active")
            .eq("partner_company_id", existingData.id)
            .eq("bu_id", currentBu.id)
            .is("deleted_at", null)
            .maybeSingle();

          isActiveInCurrentBu = association?.is_active === true;
        }

        setExistingCompany({
          ...existingData,
          is_active_in_current_bu: isActiveInCurrentBu,
        });
        setStep("existing");
      } else {
        // No existing company - proceed to form with document pre-filled
        form.reset({
          name: "",
          legal_name: "",
          person_type: personTypeForCheck,
          document: documentInput,
          allowed_domains: "",
          notes: "",
          status: "active",
        });
        setStep("form");
      }
    } catch (error) {
      console.error("Error checking document:", error);
      toast.error("Erro ao verificar documento. Tente novamente.");
    } finally {
      setIsCheckingDocument(false);
    }
  };

  // ===========================================
  // ACTIVATE EXISTING IN BU
  // ===========================================

  const handleActivateInBu = () => {
    if (!existingCompany || !currentBu?.id) return;

    activateInBu(
      {
        partner_company_id: existingCompany.id,
        bu_id: currentBu.id,
        is_active: true,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.tickets.partners(currentBu.id), refetchType: 'active' });
          toast.success(`${existingCompany.name} foi ativada nesta BU!`);
          onOpenChange(false);
        },
        onError: (error) => {
          console.error("Error activating company:", error);
          toast.error("Erro ao ativar empresa nesta BU");
        },
      }
    );
  };

  // ===========================================
  // FORM SUBMISSION
  // ===========================================

  const onSubmit = (data: FormData) => {
    const domains = data.allowed_domains
      ?.split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean) || [];

    const cleanDoc = data.document?.replace(/\D/g, '') || null;

    if (company) {
      updateCompany(
        {
          id: company.id,
          name: data.name,
          legal_name: data.legal_name || null,
          person_type: data.person_type,
          document: cleanDoc,
          document_type: documentType,
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
          person_type: data.person_type,
          document: cleanDoc,
          document_type: documentType,
          allowed_domains: domains,
          notes: data.notes || null,
          status: data.status,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  // ===========================================
  // HELPERS
  // ===========================================

  const formatDocument = (doc: string | null, type: string | null) => {
    if (!doc) return "—";
    if (type === 'cpf' && doc.length === 11) {
      return `${doc.slice(0, 3)}.${doc.slice(3, 6)}.${doc.slice(6, 9)}-${doc.slice(9)}`;
    }
    if (type === 'cnpj' && doc.length === 14) {
      return `${doc.slice(0, 2)}.${doc.slice(2, 5)}.${doc.slice(5, 8)}/${doc.slice(8, 12)}-${doc.slice(12)}`;
    }
    return doc;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const handleBack = () => {
    setStep("document");
    setExistingCompany(null);
  };

  // ===========================================
  // RENDER
  // ===========================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {/* STEP 1: Document Verification */}
        {step === "document" && !company && (
          <>
            <DialogHeader>
              <DialogTitle>Nova Empresa Parceira</DialogTitle>
              <DialogDescription>
                Informe o CPF ou CNPJ para verificar se a empresa já está cadastrada no Hub.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo de Pessoa</Label>
                <RadioGroup
                  value={personTypeForCheck}
                  onValueChange={(v) => {
                    setPersonTypeForCheck(v as "pf" | "pj");
                    setDocumentInput("");
                    setDocumentError(null);
                  }}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pj" id="check-pj" />
                    <Label htmlFor="check-pj" className="cursor-pointer">Pessoa Jurídica</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pf" id="check-pf" />
                    <Label htmlFor="check-pf" className="cursor-pointer">Pessoa Física</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>{personTypeForCheck === "pf" ? "CPF" : "CNPJ"} *</Label>
                <DocumentInput
                  value={documentInput}
                  onChange={(value, docType) => {
                    setDocumentInput(value);
                    setDocumentType(docType);
                    setDocumentError(null);
                  }}
                  placeholder={personTypeForCheck === "pf" ? "000.000.000-00" : "00.000.000/0000-00"}
                  showValidation
                />
                {documentError && (
                  <p className="text-sm text-destructive">{documentError}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Documento único para identificação do parceiro
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCheckDocument}
                  disabled={isCheckingDocument || !documentInput}
                >
                  {isCheckingDocument ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    "Verificar"
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* STEP 2a: Existing Company Found */}
        {step === "existing" && existingCompany && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                Empresa Encontrada
              </DialogTitle>
              <DialogDescription>
                Esta empresa já está cadastrada no Hub. 
                {existingCompany.is_active_in_current_bu 
                  ? " Ela já está ativa nesta BU."
                  : " Deseja ativá-la nesta BU?"}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              {/* Company Card */}
              <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(existingCompany.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{existingCompany.name}</h3>
                    <Badge variant={existingCompany.status === "active" ? "default" : "secondary"}>
                      {existingCompany.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  {existingCompany.legal_name && (
                    <p className="text-sm text-muted-foreground truncate mb-1">
                      {existingCompany.legal_name}
                    </p>
                  )}
                  <p className="text-sm font-mono text-muted-foreground">
                    {existingCompany.person_type === "pf" ? "CPF: " : "CNPJ: "}
                    {formatDocument(existingCompany.document, existingCompany.document_type)}
                  </p>
                </div>
              </div>

              {/* Status Alert */}
              {existingCompany.is_active_in_current_bu ? (
                <Alert className="mt-4">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Esta empresa já está ativa em <strong>{currentBu?.name}</strong>.
                    Você pode encontrá-la na lista de empresas parceiras.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="mt-4" variant="default">
                  <Building2 className="h-4 w-4" />
                  <AlertDescription>
                    Ao ativar, esta empresa poderá criar tickets externos em <strong>{currentBu?.name}</strong>.
                  </AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                {!existingCompany.is_active_in_current_bu && (
                  <Button onClick={handleActivateInBu} disabled={isActivating}>
                    {isActivating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Ativando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Ativar nesta BU
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        {/* STEP 2b / Edit: Full Form */}
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {!company && (
                  <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                {company ? "Editar Empresa Parceira" : "Nova Empresa Parceira"}
              </DialogTitle>
              {!company && (
                <DialogDescription>
                  Complete as informações para cadastrar a nova empresa.
                </DialogDescription>
              )}
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
                  name="person_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="pj" id="pj" />
                            <Label htmlFor="pj" className="cursor-pointer">Pessoa Jurídica</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="pf" id="pf" />
                            <Label htmlFor="pf" className="cursor-pointer">Pessoa Física</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="document"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {form.watch("person_type") === "pf" ? "CPF" : "CNPJ"}
                      </FormLabel>
                      <FormControl>
                        <DocumentInput
                          value={field.value || ""}
                          onChange={(value, docType) => {
                            field.onChange(value);
                            setDocumentType(docType);
                          }}
                          placeholder={form.watch("person_type") === "pf" ? "000.000.000-00" : "00.000.000/0000-00"}
                          showValidation
                          disabled={!company} // Disable in create mode since it's pre-filled
                        />
                      </FormControl>
                      <FormDescription>
                        Documento único para identificação do parceiro
                      </FormDescription>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
