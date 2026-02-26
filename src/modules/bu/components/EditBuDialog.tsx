import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDialogFormReset } from "@/hooks/useDialogFormReset";
import { Building2, Plus, X, Globe, Loader2, MapPin } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUpdateBu } from "@/modules/bu/hooks";
import { BuLogoUpload } from "./BuLogoUpload";
import { ColorPicker } from "./ColorPicker";
import { formatCNPJ, validateCNPJ, unformatCNPJ } from "../utils/cnpjMask";
import { toast } from "sonner";
import { BuUnit } from "../types";
import { useAuth } from "@/hooks/useAuth";
import { LocationsList } from "./LocationsList";

const editBuSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  description: z.string().optional(),
  legal_entity: z.string().optional(),
  cnpj: z.string().optional().refine(
    (val) => !val || val.length === 0 || validateCNPJ(val),
    "CNPJ inválido"
  ),
  member_display_name: z.string().optional(),
  allowed_email_domains: z.array(z.string()).min(1, "Adicione ao menos um domínio"),
  logo_url: z.string().nullable().optional(),
  symbol_url: z.string().nullable().optional(),
  primary_color: z.string().regex(/^#([A-Fa-f0-9]{6})$/, "Cor inválida"),
  secondary_color: z.string().regex(/^#([A-Fa-f0-9]{6})$/, "Cor inválida"),
  status: z.enum(["active", "inactive"]),
});

type EditBuFormData = z.infer<typeof editBuSchema>;

interface EditBuDialogProps {
  bu: BuUnit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBuDialog({ bu, open, onOpenChange }: EditBuDialogProps) {
  const [domainInput, setDomainInput] = useState("");
  const { isAdmin } = useAuth();
  const updateBu = useUpdateBu();
  
  // Defense in depth: check if user can edit BU settings
  const { has, isWildcard, isLoading: isLoadingPermissions } = usePermissions();
  const canEditBu = isWildcard || has('bu.settings.manage:bu') || isAdmin;
  
  // Don't render if user doesn't have permission
  if (!isLoadingPermissions && !canEditBu) {
    return null;
  }

  const form = useForm<EditBuFormData>({
    resolver: zodResolver(editBuSchema),
    defaultValues: {
      name: "",
      description: "",
      legal_entity: "",
      cnpj: "",
      member_display_name: "",
      allowed_email_domains: [],
      logo_url: null,
      symbol_url: null,
      primary_color: "#0A3D62",
      secondary_color: "#EAF2FF",
      status: "active",
    },
  });

  // Só reseta o form quando o dialog abre, não quando os dados mudam
  useDialogFormReset(open, useCallback(() => {
    if (bu) {
      form.reset({
        name: bu.name,
        description: bu.description || "",
        legal_entity: bu.legal_entity || "",
        cnpj: bu.cnpj ? formatCNPJ(bu.cnpj) : "",
        member_display_name: bu.member_display_name || "",
        allowed_email_domains: bu.allowed_email_domains || [],
        logo_url: bu.logo_url || null,
        symbol_url: bu.symbol_url || null,
        primary_color: bu.primary_color || "#0A3D62",
        secondary_color: bu.secondary_color || "#EAF2FF",
        status: bu.status,
      });
    }
  }, [bu, form]));

  const domains = form.watch("allowed_email_domains");

  const handleAddDomain = () => {
    const domain = domainInput.trim().toLowerCase().replace(/^@/, "");
    if (!domain) return;

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

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    form.setValue("cnpj", formatted);
  };

  const onSubmit = async (data: EditBuFormData) => {
    if (!bu) return;

    try {
      await updateBu.mutateAsync({
        id: bu.id,
        name: data.name,
        description: data.description || null,
        legal_entity: data.legal_entity || null,
        cnpj: data.cnpj ? unformatCNPJ(data.cnpj) : null,
        member_display_name: data.member_display_name || null,
        allowed_email_domains: data.allowed_email_domains,
        logo_url: data.logo_url,
        symbol_url: data.symbol_url,
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
        status: data.status,
      });
      toast.success("Business Unit atualizada com sucesso!");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar Business Unit");
    }
  };

  // Check if user is BU admin (not global admin) - can only edit visual fields
  const canEditAllFields = isAdmin;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Editar Business Unit
          </DialogTitle>
          <DialogDescription>
            {canEditAllFields
              ? "Edite as informações da unidade de negócio."
              : "Você pode editar apenas campos visuais (logo, símbolo, cores)."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">Informações</TabsTrigger>
                <TabsTrigger value="locations">Sedes</TabsTrigger>
                <TabsTrigger value="branding">Identidade Visual</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da BU</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Jet Experience"
                          {...field}
                          disabled={!canEditAllFields}
                        />
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
                          disabled={!canEditAllFields}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="member_display_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome dos Colaboradores</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Jetimobers, Verdinhos"
                          {...field}
                          disabled={!canEditAllFields}
                        />
                      </FormControl>
                      <FormDescription>
                        Nome usado no menu e nas telas para se referir aos colaboradores. Se vazio, será exibido "Usuários".
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="legal_entity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Razão Social</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Jet Experience LTDA"
                            {...field}
                            disabled={!canEditAllFields}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="00.000.000/0000-00"
                            {...field}
                            onChange={handleCnpjChange}
                            disabled={!canEditAllFields}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                            disabled={!canEditAllFields}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleAddDomain}
                          disabled={!canEditAllFields}
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
                              {canEditAllFields && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDomain(domain)}
                                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <FormDescription>
                        Apenas usuários com esses domínios poderão fazer login.
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
                        <FormLabel>Status</FormLabel>
                        <FormDescription>
                          BUs inativas não aceitam novos logins.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value === "active"}
                          onCheckedChange={(checked) =>
                            field.onChange(checked ? "active" : "inactive")
                          }
                          disabled={!canEditAllFields}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="locations" className="mt-4">
                {bu && (
                  <LocationsList buId={bu.id} canManage={canEditAllFields} />
                )}
              </TabsContent>

              <TabsContent value="branding" className="space-y-6 mt-4">
                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="logo_url"
                    render={({ field }) => (
                      <FormItem>
                        <BuLogoUpload
                          value={field.value ?? null}
                          onChange={field.onChange}
                          label="Logotipo"
                          description="Usado em relatórios e telas completas"
                          bucketFolder="logos"
                          aspectRatio="wide"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="symbol_url"
                    render={({ field }) => (
                      <FormItem>
                        <BuLogoUpload
                          value={field.value ?? null}
                          onChange={field.onChange}
                          label="Símbolo"
                          description="Ícone reduzido (sidebar)"
                          bucketFolder="symbols"
                          aspectRatio="square"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="primary_color"
                    render={({ field }) => (
                      <FormItem>
                        <ColorPicker
                          value={field.value}
                          onChange={field.onChange}
                          label="Cor Primária"
                        />
                        <FormDescription>
                          Cor principal do menu lateral.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="secondary_color"
                    render={({ field }) => (
                      <FormItem>
                        <ColorPicker
                          value={field.value}
                          onChange={field.onChange}
                          label="Cor Secundária"
                          presets={[
                            "#EAF2FF",
                            "#E8F5E9",
                            "#FFF3E0",
                            "#FCE4EC",
                            "#E0F7FA",
                            "#F3E5F5",
                            "#ECEFF1",
                            "#FFF8E1",
                            "#E1F5FE",
                            "#F1F8E9",
                            "#FAFAFA",
                            "#FFFDE7",
                          ]}
                        />
                        <FormDescription>
                          Fundos e destaques suaves.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Theme Preview */}
                <div className="rounded-lg border p-4 space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    Preview do Tema
                  </p>
                  <div className="flex gap-4">
                    {/* Mini sidebar preview */}
                    <div
                      className="w-16 h-24 rounded-lg flex flex-col items-center py-2 gap-2"
                      style={{ backgroundColor: form.watch("primary_color") }}
                    >
                      <div className="w-8 h-8 rounded bg-white/20" />
                      <div className="w-10 h-2 rounded bg-white/40" />
                      <div className="w-10 h-2 rounded bg-white/20" />
                    </div>
                    {/* Card preview */}
                    <div
                      className="flex-1 rounded-lg p-3"
                      style={{ backgroundColor: form.watch("secondary_color") }}
                    >
                      <div className="h-3 w-20 rounded bg-foreground/20 mb-2" />
                      <div className="h-2 w-full rounded bg-foreground/10 mb-1" />
                      <div className="h-2 w-3/4 rounded bg-foreground/10" />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" isLoading={updateBu.isPending} loadingText="Salvando...">
                Salvar Alterações
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
