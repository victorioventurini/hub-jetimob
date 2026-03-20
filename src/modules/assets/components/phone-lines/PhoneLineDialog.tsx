/**
 * PhoneLineDialog — Create/Edit dialog for phone lines.
 * Uses react-hook-form + zod, canonical BuUserSelect, phone mask utilities.
 */

import { useCallback, useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
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
import { BuUserSelect } from "@/components/selects/BuUserSelect";
import { useDialogFormReset } from "@/hooks/useDialogFormReset";
import { formatPhoneInput, normalizePhone, isValidPhone } from "@/lib/phone";
import { usePhoneLineMutations, usePhoneLineCarriersQuery } from "../../hooks/usePhoneLines";
import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useQuery } from "@tanstack/react-query";
import { assetsKeys } from "@/lib/queryKeys/assets";
import type { PhoneLine } from "../../hooks/usePhoneLines";
import { PhoneLineHistory } from "./PhoneLineHistory";
// ── Schema ────────────────────────────────────────────

const phoneLineSchema = z.object({
  phone_number: z.string().min(1, "Número obrigatório").refine(
    (val) => isValidPhone(val),
    { message: "Número inválido (ex: 51 99999-9999)" }
  ),
  carrier: z.string().optional().nullable(),
  plan_type: z.enum(["prepaid", "postpaid"]),
  status: z.enum(["available", "loaned"]),
  current_user_id: z.string().nullable().optional(),
  responsible_user_id: z.string().nullable().optional(),
  linked_asset_id: z.string().nullable().optional(),
  notes: z.string().optional().nullable(),
}).refine(
  (data) => data.status !== "loaned" || (data.current_user_id != null && data.current_user_id !== ""),
  { message: "Responsável é obrigatório quando emprestado", path: ["current_user_id"] }
);

type PhoneLineFormData = z.infer<typeof phoneLineSchema>;

// ── Component ─────────────────────────────────────────

interface PhoneLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: PhoneLine | null;
}

export function PhoneLineDialog({ open, onOpenChange, item }: PhoneLineDialogProps) {
  const isEditing = !!item;
  const { createPhoneLine, updatePhoneLine } = usePhoneLineMutations();
  const { data: carriers = [] } = usePhoneLineCarriersQuery();

  // Fetch available inventory items for linking
  const supabase = useOptionalBuScopedSupabase();
  const { currentBuId } = useBu();
  const { data: inventoryItems = [] } = useQuery({
    queryKey: assetsKeys.inventory.all(currentBuId ?? null),
    queryFn: async () => {
      if (!supabase || !currentBuId) return [];
      const { data, error } = await supabase
        .from("asset_inventory")
        .select("id, name, internal_code, status")
        .eq("bu_id", currentBuId)
        .is("deleted_at", null)
        .in("status", ["available", "loaned"])
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open && !!currentBuId && !!supabase,
  });

  const form = useForm<PhoneLineFormData>({
    resolver: zodResolver(phoneLineSchema),
    defaultValues: {
      phone_number: "",
      carrier: "",
      plan_type: "postpaid",
      status: "available",
      current_user_id: null,
      responsible_user_id: null,
      linked_asset_id: null,
      notes: "",
    },
  });

  const resetForm = useCallback(() => {
    if (item) {
      form.reset({
        phone_number: formatPhoneInput(item.phone_number),
        carrier: item.carrier ?? "",
        plan_type: item.plan_type,
        status: item.status,
        current_user_id: item.current_user_id,
        responsible_user_id: item.responsible_user_id,
        linked_asset_id: item.linked_asset_id,
        notes: item.notes ?? "",
      });
    } else {
      form.reset({
        phone_number: "",
        carrier: "",
        plan_type: "postpaid",
        status: "available",
        current_user_id: null,
        responsible_user_id: null,
        linked_asset_id: null,
        notes: "",
      });
    }
  }, [item, form]);

  useDialogFormReset(open, resetForm);

  // When status changes to available, clear user
  const watchStatus = form.watch("status");
  useEffect(() => {
    if (watchStatus === "available") {
      form.setValue("current_user_id", null);
    }
  }, [watchStatus, form]);

  const onSubmit = async (data: PhoneLineFormData) => {
    const normalized = normalizePhone(data.phone_number);
    if (!normalized) {
      form.setError("phone_number", { message: "Número inválido" });
      return;
    }

    const payload = {
      phone_number: normalized,
      carrier: data.carrier || null,
      plan_type: data.plan_type as "prepaid" | "postpaid",
      status: data.status as "available" | "loaned",
      current_user_id: data.status === "loaned" ? data.current_user_id ?? null : null,
      responsible_user_id: data.responsible_user_id || null,
      linked_asset_id: data.linked_asset_id || null,
      notes: data.notes || null,
    };

    if (isEditing) {
      await updatePhoneLine.mutateAsync({ id: item.id, ...payload });
    } else {
      await createPhoneLine.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isSubmitting = createPhoneLine.isPending || updatePhoneLine.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Linha" : "Nova Linha Telefônica"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Atualize as informações da linha" : "Cadastre uma nova linha telefônica corporativa"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Phone number */}
            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="+55 (51) 99999-9999"
                      onChange={(e) => field.onChange(formatPhoneInput(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Carrier (autocomplete via datalist) */}
            <FormField
              control={form.control}
              name="carrier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operadora</FormLabel>
                  <FormControl>
                    <>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Ex: Vivo, Claro, TIM"
                        list="carrier-options"
                      />
                      <datalist id="carrier-options">
                        {carriers.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Plan type */}
              <FormField
                control={form.control}
                name="plan_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plano</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="postpaid">Pós-pago</SelectItem>
                        <SelectItem value="prepaid">Pré-pago</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="available">Disponível</SelectItem>
                        <SelectItem value="loaned">Emprestado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Current user (visible when loaned) */}
            {watchStatus === "loaned" && (
              <FormField
                control={form.control}
                name="current_user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável *</FormLabel>
                    <FormControl>
                      <BuUserSelect
                        value={field.value ?? undefined}
                        onValueChange={(val) => field.onChange(val)}
                        placeholder="Selecione o responsável"
                        showSearch
                        excludeExternal
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Responsible user (always visible, optional) */}
            <FormField
              control={form.control}
              name="responsible_user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável pela linha (opcional)</FormLabel>
                  <FormControl>
                    <BuUserSelect
                      value={field.value ?? undefined}
                      onValueChange={(val) => field.onChange(val || null)}
                      placeholder="Selecione o responsável"
                      showSearch
                      excludeExternal
                      
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Linked asset */}
            <FormField
              control={form.control}
              name="linked_asset_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset vinculado (opcional)</FormLabel>
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={(val) => field.onChange(val === "none" ? null : val)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhum" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {inventoryItems.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.internal_code} — {inv.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Observações opcionais..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : isEditing ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
