/**
 * PartnerEditDialog - Edição dos dados cadastrais de uma empresa parceira
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
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

import { useUpdateGlobalPartner } from "../hooks";
import type { GlobalPartnerCompany, PartnerStatus } from "../types";

const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  legal_name: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

type FormData = z.infer<typeof formSchema>;

interface PartnerEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner: GlobalPartnerCompany;
}

export function PartnerEditDialog({ open, onOpenChange, partner }: PartnerEditDialogProps) {
  const updatePartner = useUpdateGlobalPartner();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: partner.name ?? "",
      legal_name: partner.legal_name ?? "",
      notes: partner.notes ?? "",
      status: (partner.status as PartnerStatus) ?? "active",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: partner.name ?? "",
        legal_name: partner.legal_name ?? "",
        notes: partner.notes ?? "",
        status: (partner.status as PartnerStatus) ?? "active",
      });
    }
  }, [open, partner, form]);

  const onSubmit = async (data: FormData) => {
    try {
      await updatePartner.mutateAsync({
        id: partner.id,
        name: data.name,
        legal_name: data.legal_name || undefined,
        notes: data.notes || undefined,
        status: data.status,
      });
      onOpenChange(false);
    } catch {
      // Erro tratado pela mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Editar empresa parceira</DialogTitle>
          <DialogDescription>
            Atualize os dados cadastrais. O CPF/CNPJ não pode ser alterado.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da empresa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="legal_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razão social</FormLabel>
                  <FormControl>
                    <Input placeholder="Razão social (opcional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <Textarea rows={3} placeholder="Observações internas (opcional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                isLoading={updatePartner.isPending}
                loadingText="Salvando..."
              >
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
