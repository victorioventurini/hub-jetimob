import type { UseFormReturn } from "react-hook-form";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2, Settings } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CreateTicketFormData } from "../schema";

interface Props {
  form: UseFormReturn<CreateTicketFormData>;
  selectedType: "internal" | "external";
  selectedCategoryId?: string;
  selectedPartnerId?: string;
  selectedSubcategoryId?: string;
  filteredCategories: Array<{ id: string; name: string }>;
  partnersByCategory: Array<{ id: string; name: string }>;
  loadingPartnersByCategory: boolean;
  partnerHasServices: boolean;
  loadingPartnerServices: boolean;
  availableSubcategories: Array<{ id: string; name: string }>;
  isGeneralistCategory: boolean;
  availableContacts: Array<{ id: string; name: string; email: string }>;
  contactsSource: "capability" | "fallback" | "none";
  loadingContacts: boolean;
  selectedExternalContactId?: string;
  onSelectExternalContact: (id: string) => void;
}

export function BasicInfoSection({
  form,
  selectedType,
  selectedCategoryId,
  selectedPartnerId,
  selectedSubcategoryId,
  filteredCategories,
  partnersByCategory,
  loadingPartnersByCategory,
  partnerHasServices,
  loadingPartnerServices,
  availableSubcategories,
  isGeneralistCategory,
  availableContacts,
  contactsSource,
  loadingContacts,
  selectedExternalContactId,
  onSelectExternalContact,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Informações Básicas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título *</FormLabel>
              <FormControl>
                <Input placeholder="Descreva brevemente a demanda" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria {selectedType === "external" ? "*" : ""}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedType === "external" && selectedCategoryId && (
          <>
            {loadingPartnersByCategory ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando empresas...
              </div>
            ) : partnersByCategory.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Nenhuma empresa atende esta categoria.</span>
                  <Link to="/tickets/settings" className="underline flex items-center gap-1">
                    <Settings className="h-3 w-3" />
                    Configurar
                  </Link>
                </AlertDescription>
              </Alert>
            ) : partnersByCategory.length === 1 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>
                  Empresa: <strong>{partnersByCategory[0].name}</strong>
                </span>
              </div>
            ) : (
              <FormField
                control={form.control}
                name="external_company_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa Parceira *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a empresa..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {partnersByCategory.map((partner) => (
                          <SelectItem key={partner.id} value={partner.id}>
                            {partner.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </>
        )}

        {selectedType === "external" &&
          selectedPartnerId &&
          !loadingPartnerServices &&
          !partnerHasServices && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Esta empresa não possui serviços configurados para esta categoria.</span>
                <Link to="/tickets/settings" className="underline flex items-center gap-1">
                  <Settings className="h-3 w-3" />
                  Configurar
                </Link>
              </AlertDescription>
            </Alert>
          )}

        {(selectedType === "internal" || (selectedType === "external" && selectedPartnerId)) &&
          selectedCategoryId && (
            <FormField
              control={form.control}
              name="subcategory_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subcategoria</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={availableSubcategories.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            availableSubcategories.length === 0 &&
                            selectedType === "external" &&
                            isGeneralistCategory
                              ? "Opcional (generalista)"
                              : availableSubcategories.length === 0
                                ? "Nenhuma subcategoria"
                                : "Selecione..."
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableSubcategories.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedType === "external" && isGeneralistCategory && (
                    <FormDescription className="flex items-center gap-1 text-primary">
                      <CheckCircle2 className="h-3 w-3" />
                      Esta empresa atende a categoria de forma geral
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

        {selectedType === "external" &&
          selectedPartnerId &&
          (selectedSubcategoryId || isGeneralistCategory) && (
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                Contato Responsável
                {contactsSource === "fallback" && (
                  <Badge variant="secondary" className="text-xs">
                    Padrão
                  </Badge>
                )}
                {contactsSource === "capability" && (
                  <Badge variant="outline" className="text-xs">
                    Especialista
                  </Badge>
                )}
              </Label>

              {loadingContacts ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando contatos...
                </div>
              ) : availableContacts.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nenhum contato disponível. Configure capacidades ou contatos padrão nas
                    configurações da empresa.
                  </AlertDescription>
                </Alert>
              ) : availableContacts.length === 1 ? (
                <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/30">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{availableContacts[0].name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {availableContacts[0].email}
                    </div>
                  </div>
                </div>
              ) : (
                <Select value={selectedExternalContactId} onValueChange={onSelectExternalContact}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o contato responsável..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableContacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        <div className="flex items-center gap-2">
                          <span>{contact.name}</span>
                          <span className="text-muted-foreground text-xs">({contact.email})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <p className="text-xs text-muted-foreground">
                {contactsSource === "capability"
                  ? "Contato com capacidade para atender esta subcategoria."
                  : contactsSource === "fallback"
                    ? "Contato padrão da empresa (nenhum especialista encontrado)."
                    : ""}
              </p>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
