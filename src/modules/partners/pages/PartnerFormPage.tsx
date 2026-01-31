/**
 * PartnerFormPage - Formulário de criação/edição de parceiro
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Helmet } from "react-helmet-async";
import { Building2, Users, Loader2 } from "lucide-react";

import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { DocumentInput, cleanDocument, validateDocument, detectDocumentType } from "@/components/ui/document-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  useCreateGlobalPartner,
  useSearchPartnerByDocument,
  useActivatePartnerInBu,
} from "../hooks";
import { useBu } from "@/contexts/BuContext";
import type { PersonType, DocumentType } from "../types";

const formSchema = z.object({
  person_type: z.enum(["pf", "pj"]),
  document: z.string().min(11, "Documento inválido").refine(
    (val) => validateDocument(val),
    "CPF/CNPJ inválido"
  ),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  legal_name: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function PartnerFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialDocument = searchParams.get("document") || "";

  const { currentBuId, currentBu } = useBu();
  const createPartner = useCreateGlobalPartner();
  const activateInBu = useActivatePartnerInBu();

  const [documentValue, setDocumentValue] = useState(initialDocument);
  const [detectedType, setDetectedType] = useState<DocumentType>(
    detectDocumentType(initialDocument)
  );

  // Busca se documento já existe
  const cleanDoc = cleanDocument(documentValue);
  const isValidDoc = validateDocument(cleanDoc);
  const { data: existingPartner, isFetching: isSearching } = useSearchPartnerByDocument(
    isValidDoc ? cleanDoc : null
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      person_type: detectedType === "cpf" ? "pf" : "pj",
      document: initialDocument,
      name: "",
      legal_name: "",
      notes: "",
    },
  });

  // Atualizar tipo quando documento muda
  useEffect(() => {
    const type = detectDocumentType(documentValue);
    setDetectedType(type);
    if (type) {
      form.setValue("person_type", type === "cpf" ? "pf" : "pj");
    }
  }, [documentValue, form]);

  const handleDocumentChange = (value: string, docType: DocumentType, isValid: boolean) => {
    setDocumentValue(value);
    form.setValue("document", value);
  };

  const onSubmit = async (data: FormData) => {
    try {
      const docType = detectDocumentType(data.document);

      const result = await createPartner.mutateAsync({
        name: data.name,
        legal_name: data.legal_name || undefined,
        person_type: data.person_type as PersonType,
        document: cleanDocument(data.document),
        document_type: docType || undefined,
        notes: data.notes || undefined,
      });

      // Ativar na BU atual automaticamente
      if (result?.id && currentBuId) {
        await activateInBu.mutateAsync({
          external_company_id: result.id,
          bu_id: currentBuId,
          is_active: true,
        });
      }

      navigate(`/partners/${result?.id}`);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleActivateExisting = async () => {
    if (existingPartner?.id && currentBuId) {
      await activateInBu.mutateAsync({
        external_company_id: existingPartner.id,
        bu_id: currentBuId,
        is_active: true,
      });
      navigate(`/partners/${existingPartner.id}`);
    }
  };

  const isSubmitting = createPartner.isPending || activateInBu.isPending;

  return (
    <HubLayout>
      <Helmet>
        <title>Novo Parceiro | Hub Jetimob</title>
        <meta name="description" content="Cadastre uma nova empresa parceira no sistema." />
      </Helmet>

      <div className="space-y-6 max-w-2xl">
        <PageHeader
          title="Novo Parceiro"
          description="Cadastre uma nova empresa parceira"
          backTo="/settings/partners"
          backLabel="Voltar para Parceiros"
        />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Passo 1: Documento */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">1. Identificação</CardTitle>
                <CardDescription>
                  Informe o CPF ou CNPJ do parceiro para verificar se já está cadastrado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="document"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF ou CNPJ</FormLabel>
                      <FormControl>
                        <DocumentInput
                          value={documentValue}
                          onChange={handleDocumentChange}
                          isSearching={isSearching}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Alerta se parceiro já existe */}
                {existingPartner && (
                  <Alert>
                    <Building2 className="h-4 w-4" />
                    <AlertTitle>Parceiro já cadastrado!</AlertTitle>
                    <AlertDescription className="mt-2">
                      <p className="mb-3">
                        <strong>{existingPartner.name}</strong> já está no sistema.
                        {existingPartner.status === "active"
                          ? " Você pode ativá-lo na sua unidade de negócio."
                          : " Este parceiro está inativo."}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={handleActivateExisting}
                          isLoading={activateInBu.isPending}
                          loadingText={`Ativando...`}
                        >
                          Ativar na {currentBu?.name || "BU"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          asChild
                        >
                          <Link to={`/partners/${existingPartner.id}`}>
                            Ver detalhes
                          </Link>
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <FormField
                  control={form.control}
                  name="person_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Pessoa</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!!detectedType}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pf">
                            <span className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Pessoa Física
                            </span>
                          </SelectItem>
                          <SelectItem value="pj">
                            <span className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              Pessoa Jurídica
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {detectedType
                          ? "Tipo detectado automaticamente pelo documento"
                          : "Selecione o tipo de pessoa"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Passo 2: Dados (só mostra se documento é válido e não existe) */}
            {isValidDoc && !existingPartner && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">2. Dados do Parceiro</CardTitle>
                  <CardDescription>
                    Preencha as informações do novo parceiro
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {form.watch("person_type") === "pf" ? "Nome Completo" : "Nome Fantasia"}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome do parceiro" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("person_type") === "pj" && (
                    <FormField
                      control={form.control}
                      name="legal_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Razão Social</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Razão social da empresa" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Informações adicionais sobre o parceiro..."
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Ações */}
            {isValidDoc && !existingPartner && (
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  asChild
                >
                  <Link to="/partners">Cancelar</Link>
                </Button>
                <Button type="submit" isLoading={isSubmitting} loadingText="Cadastrando...">
                  Cadastrar Parceiro
                </Button>
              </div>
            )}
          </form>
        </Form>
      </div>
    </HubLayout>
  );
}
