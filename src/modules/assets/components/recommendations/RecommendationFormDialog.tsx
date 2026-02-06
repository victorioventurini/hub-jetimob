/**
 * RecommendationFormDialog
 * 
 * Dialog for creating/editing equipment recommendations.
 * Reuses existing components: AssetCategorySelect, useBrands, BuUserSelect, MultiTeamSelect, MultiJobTitleSelect.
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AutocompleteInput } from "../inventory/AutocompleteInput";
import { MultiTeamSelect } from "@/components/selects/MultiTeamSelect";
import { MultiJobTitleSelect } from "@/components/selects/MultiJobTitleSelect";
import { BuUserSelect } from "@/components/selects/BuUserSelect";
import { useBrands, useRecommendations, useInventory } from "../../hooks";
import { useIdentity } from "@/hooks/useIdentity";
import { 
  REVIEW_INTERVAL_OPTIONS, 
  type AssetRecommendation,
} from "../../types";

// ============================================
// SCHEMA
// ============================================

const recommendationFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  category_id: z.string().optional(),
  brand: z.string().min(1, "Marca é obrigatória"),
  model: z.string().optional(),
  description: z.string().optional(),
  applicable_team_ids: z.array(z.string()).default([]),
  applicable_job_title_ids: z.array(z.string()).default([]),
  review_interval_months: z.number().default(6),
  owner_user_id: z.string().min(1, "Responsável é obrigatório"),
  notes: z.string().optional(),
});

type RecommendationFormData = z.infer<typeof recommendationFormSchema>;

// ============================================
// COMPONENT
// ============================================

interface RecommendationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendation?: AssetRecommendation | null;
}

export function RecommendationFormDialog({
  open,
  onOpenChange,
  recommendation,
}: RecommendationFormDialogProps) {
  const isEditing = !!recommendation;
  const { profileId } = useIdentity();
  const { brands } = useBrands();
  const { categories } = useInventory();
  const {
    createRecommendationAsync,
    updateRecommendationAsync,
    isCreating,
    isUpdating,
  } = useRecommendations();

  // Build subcategory options (same pattern as inventory form)
  const subcategoryOptions = categories
    .filter((c) => c.parent_id)
    .map((sub) => {
      const parent = categories.find((p) => p.id === sub.parent_id);
      return {
        id: sub.id,
        name: sub.name,
        parentName: parent?.name || "",
        fullName: parent ? `${parent.name} › ${sub.name}` : sub.name,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));

  const form = useForm<RecommendationFormData>({
    resolver: zodResolver(recommendationFormSchema),
    defaultValues: {
      name: "",
      category_id: undefined,
      brand: "",
      model: "",
      description: "",
      applicable_team_ids: [],
      applicable_job_title_ids: [],
      review_interval_months: 6,
      owner_user_id: profileId || "",
      notes: "",
    },
  });

  // Reset form when dialog opens/closes or recommendation changes
  useEffect(() => {
    if (!open) return;

    if (recommendation) {
      form.reset({
        name: recommendation.name,
        category_id: recommendation.category_id || undefined,
        brand: recommendation.brand,
        model: recommendation.model || "",
        description: recommendation.description || "",
        applicable_team_ids: recommendation.applicable_team_ids || [],
        applicable_job_title_ids: recommendation.applicable_job_title_ids || [],
        review_interval_months: recommendation.review_interval_months,
        owner_user_id: recommendation.owner_user_id,
        notes: recommendation.notes || "",
      });
    } else {
      form.reset({
        name: "",
        category_id: undefined,
        brand: "",
        model: "",
        description: "",
        applicable_team_ids: [],
        applicable_job_title_ids: [],
        review_interval_months: 6,
        owner_user_id: profileId || "",
        notes: "",
      });
    }
  }, [open, recommendation, profileId, form]);

  const onSubmit = async (data: RecommendationFormData) => {
    try {
      if (isEditing && recommendation) {
        await updateRecommendationAsync({
          id: recommendation.id,
          name: data.name,
          category_id: data.category_id,
          brand: data.brand,
          model: data.model,
          description: data.description,
          applicable_team_ids: data.applicable_team_ids,
          applicable_job_title_ids: data.applicable_job_title_ids,
          review_interval_months: data.review_interval_months,
          owner_user_id: data.owner_user_id,
          notes: data.notes,
        });
      } else {
        await createRecommendationAsync({
          name: data.name,
          category_id: data.category_id,
          brand: data.brand,
          model: data.model,
          description: data.description,
          applicable_team_ids: data.applicable_team_ids,
          applicable_job_title_ids: data.applicable_job_title_ids,
          review_interval_months: data.review_interval_months,
          owner_user_id: data.owner_user_id,
          notes: data.notes,
        });
      }
      onOpenChange(false);
    } catch {
      // Toast already shown by mutation
    }
  };

  const brandSuggestions = brands;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Recomendação" : "Nova Recomendação de Equipamento"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações da recomendação"
              : "Crie uma recomendação para orientar compras de equipamentos"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Recomendação *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Notebook para Desenvolvedores Backend"
                        {...field}
                      />
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
                    <FormLabel>Categoria</FormLabel>
                    <Select
                      value={field.value || ""}
                      onValueChange={(value) => field.onChange(value || undefined)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subcategoryOptions.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca *</FormLabel>
                      <FormControl>
                        <AutocompleteInput
                          value={field.value}
                          onChange={field.onChange}
                          suggestions={brandSuggestions}
                          placeholder="Dell, Apple, Lenovo..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modelo</FormLabel>
                      <FormControl>
                        <Input placeholder="Latitude 5540" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição / Especificações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Requisitos mínimos, links de referência, observações..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Especificações técnicas, links ou instruções de compra
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Applicability */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Aplicabilidade</h3>
              <p className="text-sm text-muted-foreground">
                Defina para quais times ou cargos esta recomendação se aplica.
                Cargo tem precedência sobre time.
              </p>

              <FormField
                control={form.control}
                name="applicable_team_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Times aplicáveis</FormLabel>
                    <FormControl>
                      <MultiTeamSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Selecione times (opcional)"
                      />
                    </FormControl>
                    <FormDescription>
                      Deixe vazio para aplicar globalmente
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="applicable_job_title_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargos aplicáveis</FormLabel>
                    <FormControl>
                      <MultiJobTitleSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Selecione cargos (opcional)"
                      />
                    </FormControl>
                    <FormDescription>
                      Cargos têm prioridade sobre times na busca
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Governance */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Governança</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="owner_user_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsável pela revisão *</FormLabel>
                      <FormControl>
                        <BuUserSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Selecione o responsável"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="review_interval_months"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Revisar a cada</FormLabel>
                      <Select
                        value={String(field.value)}
                        onValueChange={(value) => field.onChange(Number(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {REVIEW_INTERVAL_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações internas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notas internas sobre esta recomendação..."
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                isLoading={isCreating || isUpdating}
                loadingText="Salvando..."
              >
                {isEditing ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
