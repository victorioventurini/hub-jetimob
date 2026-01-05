import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useCreateTicket } from "../hooks/useTickets";
import { useTicketCategories, useTicketSubcategories } from "../hooks/useTicketCategories";
import { usePartnerCompanies } from "../hooks/usePartners";
import type { TicketType, TicketVisibility } from "../types";

const createTicketSchema = z.object({
  type: z.enum(["internal", "external"]),
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  category_id: z.string().optional(),
  subcategory_id: z.string().optional(),
  partner_company_id: z.string().optional(),
  visibility: z.enum(["bu_all", "teams", "users", "private"]),
  expected_due_at: z.date().optional(),
  initial_message: z.string().min(1, "Mensagem inicial é obrigatória"),
});

type FormData = z.infer<typeof createTicketSchema>;

export default function CreateTicketPage() {
  const navigate = useNavigate();
  const createTicket = useCreateTicket();
  const { data: categories = [] } = useTicketCategories();
  const { data: partners = [] } = usePartnerCompanies();
  
  const form = useForm<FormData>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      type: "internal",
      title: "",
      visibility: "bu_all",
      initial_message: "",
    },
  });

  const selectedType = form.watch("type");
  const selectedCategoryId = form.watch("category_id");
  const { data: subcategories = [] } = useTicketSubcategories(selectedCategoryId || "");

  // Filter categories by scope
  const filteredCategories = categories.filter((cat) => {
    if (selectedType === "internal") return cat.scope === "internal" || cat.scope === "both";
    if (selectedType === "external") return cat.scope === "external" || cat.scope === "both";
    return true;
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createTicket.mutateAsync({
        type: data.type,
        title: data.title,
        category_id: data.category_id || null,
        subcategory_id: data.subcategory_id || null,
        partner_company_id: data.type === "external" ? data.partner_company_id || null : null,
        visibility: data.visibility,
        expected_due_at: data.expected_due_at?.toISOString() || null,
        initial_message: data.initial_message ? { type: "text", content: data.initial_message } : undefined,
      });
      navigate("/tickets");
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Novo Ticket</h2>
          <p className="text-sm text-muted-foreground">Crie uma nova demanda</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tipo de Ticket</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-2 gap-4"
                      >
                        <Label
                          htmlFor="internal"
                          className={cn(
                            "flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-colors",
                            field.value === "internal" ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/50"
                          )}
                        >
                          <RadioGroupItem value="internal" id="internal" className="sr-only" />
                          <span className="font-medium">Interno</span>
                          <span className="text-xs text-muted-foreground text-center mt-1">
                            Entre usuários e times da BU
                          </span>
                        </Label>
                        <Label
                          htmlFor="external"
                          className={cn(
                            "flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-colors",
                            field.value === "external" ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/50"
                          )}
                        >
                          <RadioGroupItem value="external" id="external" className="sr-only" />
                          <span className="font-medium">Externo</span>
                          <span className="text-xs text-muted-foreground text-center mt-1">
                            Com empresas parceiras
                          </span>
                        </Label>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Basic Info */}
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
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

                <FormField
                  control={form.control}
                  name="subcategory_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subcategoria</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!selectedCategoryId || subcategories.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subcategories.map((sub) => (
                            <SelectItem key={sub.id} value={sub.id}>
                              {sub.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Partner (only for external) */}
              {selectedType === "external" && (
                <FormField
                  control={form.control}
                  name="partner_company_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empresa Parceira *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o parceiro..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {partners.map((partner) => (
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
            </CardContent>
          </Card>

          {/* Visibility & Due Date */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visibilidade e Prazo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visibilidade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bu_all">Toda a BU</SelectItem>
                        <SelectItem value="teams">Times específicos</SelectItem>
                        <SelectItem value="users">Usuários específicos</SelectItem>
                        <SelectItem value="private">Privado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expected_due_at"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data esperada de conclusão</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ptBR })
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Initial Message */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mensagem Inicial</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="initial_message"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva os detalhes da demanda..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createTicket.isPending}>
              {createTicket.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Ticket
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
