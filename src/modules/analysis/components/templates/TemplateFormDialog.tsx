/**
 * TemplateFormDialog — formulário de criação/edição de templates da BU
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModulesChips } from "../composer/ModulesChips";
import {
  useCreateTemplate,
  useUpdateTemplate,
  type TemplateFormData,
} from "../../hooks/useAnalysisTemplateMutations";
import type {
  AnalysisDepth,
  AnalysisMode,
  AnalysisModule,
  AnalysisTemplate,
} from "../../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: AnalysisTemplate | null;
}

const DEFAULT_FORM: TemplateFormData = {
  name: "",
  category: "Geral",
  premise: "",
  display_order: 0,
  defaults: { modules: [], depth: "standard", mode: "auto" },
};

function extractDefaults(t: AnalysisTemplate): TemplateFormData["defaults"] {
  const d = (t.defaults ?? {}) as Record<string, unknown>;
  return {
    modules: Array.isArray(d.modules) ? (d.modules as AnalysisModule[]) : [],
    depth: (d.depth as AnalysisDepth) ?? "standard",
    mode: (d.mode as AnalysisMode) ?? "auto",
  };
}

export function TemplateFormDialog({ open, onOpenChange, template }: Props) {
  const [form, setForm] = useState<TemplateFormData>(DEFAULT_FORM);
  const create = useCreateTemplate();
  const update = useUpdateTemplate();
  const isEditing = !!template;
  const isSaving = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    if (template) {
      setForm({
        name: template.name,
        category: template.category,
        premise: template.premise,
        display_order: template.display_order,
        defaults: extractDefaults(template),
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [open, template]);

  const handleSubmit = async () => {
    if (!form.name.trim() || form.premise.trim().length < 20) return;
    if (isEditing && template) {
      await update.mutateAsync({ id: template.id, input: form });
    } else {
      await create.mutateAsync(form);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar template" : "Novo template"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="t-name">Nome</Label>
            <Input
              id="t-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex.: Saúde do Trimestre"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="t-cat">Categoria</Label>
              <Input
                id="t-cat"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Ex.: Rituais de Ciclo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-order">Ordem</Label>
              <Input
                id="t-order"
                type="number"
                value={form.display_order}
                onChange={(e) =>
                  setForm({ ...form, display_order: Number(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="t-premise">Premissa</Label>
            <Textarea
              id="t-premise"
              value={form.premise}
              onChange={(e) => setForm({ ...form, premise: e.target.value })}
              placeholder="Descreva a premissa que orientará a análise (mín. 20 caracteres)"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">{form.premise.length} caracteres</p>
          </div>

          <ModulesChips
            value={form.defaults.modules ?? []}
            onChange={(modules) =>
              setForm({ ...form, defaults: { ...form.defaults, modules } })
            }
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Profundidade default</Label>
              <Select
                value={form.defaults.depth ?? "standard"}
                onValueChange={(v) =>
                  setForm({ ...form, defaults: { ...form.defaults, depth: v as AnalysisDepth } })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Rápida</SelectItem>
                  <SelectItem value="standard">Padrão</SelectItem>
                  <SelectItem value="full">Profunda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modo default</Label>
              <Select
                value={form.defaults.mode ?? "auto"}
                onValueChange={(v) =>
                  setForm({ ...form, defaults: { ...form.defaults, mode: v as AnalysisMode } })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="mixed">Misto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={isSaving}
            disabled={!form.name.trim() || form.premise.trim().length < 20}
          >
            {isEditing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
