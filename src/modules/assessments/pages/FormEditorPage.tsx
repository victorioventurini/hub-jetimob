/**
 * FormEditorPage — editor de versão draft de um formulário (perguntas + tempos).
 */
import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Lock, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { useUrlState } from "@/shared/url";
import { usePageTitle } from "@/hooks/usePageTitle";
import { SavedLinksPopover } from "@/shared/saved-links";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FormStatusBadge } from "../components/StatusBadges";
import { ConfirmActionDialog } from "../components/ConfirmActionDialog";
import { DuplicateActionButton } from "../components/DuplicateActionButton";
import {
  useForm,
  useVersions,
  useQuestions,
  useUpsertQuestion,
  useDeleteQuestion,
  useReorderQuestions,
  usePublishVersion,
  useCreateDraftVersion,
  useUpdateForm,
  useDeleteForm,
  useDuplicateForm,
} from "../hooks/useAssessmentsData";
import { useHasPermission } from "@/hooks/usePermissions";

export default function FormEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: form } = useForm(id);
  const { data: versions } = useVersions(id);
  const draft = useMemo(() => versions?.find((v) => !v.frozen) ?? versions?.[0], [versions]);
  const { data: questions } = useQuestions(draft?.id);
  const upsert = useUpsertQuestion();
  const del = useDeleteQuestion();
  const reorder = useReorderQuestions();
  const publish = usePublishVersion();
  const updateForm = useUpdateForm();
  const deleteForm = useDeleteForm();
  const duplicate = useDuplicateForm();
  const createDraft = useCreateDraftVersion();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const frozen = draft?.frozen ?? false;
  const canEditScoring = useHasPermission("assessments.form.update:bu");
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !draft || frozen) return;
    const list = questions ?? [];
    const oldIndex = list.findIndex((q) => q.id === active.id);
    const newIndex = list.findIndex((q) => q.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const ordered = arrayMove(list, oldIndex, newIndex).map((q) => q.id);
    reorder.mutate({ version_id: draft.id, ordered_ids: ordered });
  };
  const editingState = useUrlState<string>({ key: "q", defaultValue: "" });
  const editing = editingState.value || null;
  const setEditing = (v: string | null) => editingState.set(v ?? "");

  const totalSeconds = (questions ?? []).reduce((s, q) => s + (q.time_limit_seconds || 0), 0);

  usePageTitle(form?.title ?? "Formulário", {
    customDescription: form?.description?.trim() || "Editor de perguntas, tipos e tempo por questão.",
  });

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title={form?.title ?? "Formulário"}
          description={form?.description ?? undefined}
          breadcrumbs={[{ label: "Assessments", href: "/assessments" }, { label: form?.title ?? "..." }]}
          actions={
            <div className="flex items-center gap-2">
              <SavedLinksPopover moduleSlug="assessments" />
              <Button variant="outline" asChild><Link to="/assessments?tab=forms"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Link></Button>
              {id && (
                <DuplicateActionButton
                  variant="full"
                  title="Duplicar formulário?"
                  description="Cria um novo formulário em rascunho com todas as perguntas copiadas. Não copia vínculos com provas."
                  isPending={duplicate.isPending}
                  onConfirm={async () => {
                    const r = await duplicate.mutateAsync({ id });
                    navigate(`/assessments/forms/${r.formId}`);
                  }}
                />
              )}
              <ConfirmActionDialog
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Excluir formulário" disabled={deleteForm.isPending}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
                title="Excluir formulário?"
                description="Esta ação remove o formulário e todas as suas perguntas. Provas ativas vinculadas precisam ser desvinculadas primeiro."
                confirmLabel="Excluir"
                onConfirm={() =>
                  deleteForm.mutate(id!, {
                    onSuccess: () => navigate("/assessments?tab=forms"),
                  })
                }
              />
              {draft && !draft.frozen && (
                <ConfirmActionDialog
                  trigger={
                    <Button disabled={(questions?.length ?? 0) === 0 || publish.isPending}>
                      Publicar versão
                    </Button>
                  }
                  title="Publicar versão?"
                  description="Após publicar, as perguntas e tempos ficarão congelados nesta versão. Edições futuras criarão uma nova versão."
                  confirmLabel="Publicar"
                  destructive={false}
                  onConfirm={() => publish.mutate({ form_id: id!, version_id: draft.id })}
                />
              )}
              {draft?.frozen && (
                <Button
                  onClick={() => createDraft.mutate({ form_id: id! })}
                  disabled={createDraft.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />Criar nova versão (rascunho)
                </Button>
              )}
            </div>
          }
        />

        <Card>
          <CardContent className="p-4 grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <div className="mt-1"><FormStatusBadge status={form?.status} /></div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Versão atual</p>
              <p className="mt-1 font-medium">v{draft?.version_number} {draft?.frozen && <Lock className="h-3 w-3 inline ml-1" aria-label="Versão congelada" />}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tempo total</p>
              <p className="mt-1 font-medium">{Math.ceil(totalSeconds / 60)} min ({totalSeconds}s)</p>
            </div>
            <div className="sm:col-span-3">
              <Label htmlFor="form-level">Nível</Label>
              <Input
                id="form-level"
                type="number"
                min={1}
                defaultValue={form?.level ?? 1}
                onBlur={(e) => updateForm.mutate({ id: id!, level: Number(e.target.value) || 1 })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={(questions ?? []).map((q) => q.id)} strategy={verticalListSortingStrategy}>
              {(questions ?? []).map((q, idx) => (
                <SortableQuestionRow
                  key={q.id}
                  q={q}
                  index={idx}
                  versionId={draft!.id}
                  frozen={frozen}
                  canEditScoring={canEditScoring}
                  editing={editing === q.id}
                  onEdit={() => setEditing(q.id)}
                  onClose={() => setEditing(null)}
                  onSave={(payload) => {
                    upsert.mutate({ ...payload, id: q.id, version_id: draft!.id });
                    setEditing(null);
                  }}
                  onDelete={() => del.mutate({ id: q.id, version_id: draft!.id })}
                />
              ))}
            </SortableContext>
          </DndContext>
          {!frozen && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                upsert.mutate({
                  version_id: draft!.id,
                  position: (questions?.length ?? 0) + 1,
                  question_type: "long_text",
                  prompt: "Nova pergunta",
                  required: true,
                  time_limit_seconds: 120,
                  scoring: { mode: "none" },
                  points: 1,
                })
              }
            >
              <Plus className="h-4 w-4 mr-2" />Adicionar pergunta
            </Button>
          )}
        </div>
      </div>
    </HubLayout>
  );
}

type QType = "short_text" | "long_text" | "single_choice" | "multiple_choice" | "scale";
type ChoiceOpt = { id: string; label: string; order?: number };
type ScaleCfg = { min: number; max: number; step?: number; min_label?: string | null; max_label?: string | null };
type Scoring =
  | { mode: "none" }
  | { mode: "exact" | "partial"; correct_option_ids: string[] }
  | { mode: "scale_target"; target: number; tolerance?: number };

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `opt-${Math.random().toString(36).slice(2, 10)}`;
}

function defaultOptionsFor(type: QType, prev: unknown): unknown {
  if (type === "single_choice" || type === "multiple_choice") {
    if (Array.isArray(prev) && prev.length >= 2) return prev;
    return [
      { id: uuid(), label: "Alternativa 1", order: 1 },
      { id: uuid(), label: "Alternativa 2", order: 2 },
    ];
  }
  if (type === "scale") {
    if (prev && typeof prev === "object" && "min" in (prev as object)) return prev;
    return { min: 0, max: 10, step: 1, min_label: "Discordo", max_label: "Concordo" };
  }
  return null;
}

function SortableQuestionRow({
  q,
  index,
  versionId: _versionId,
  frozen,
  canEditScoring,
  editing,
  onEdit,
  onClose,
  onSave,
  onDelete,
}: {
  q: {
    id: string;
    position: number;
    question_type: string;
    prompt: string;
    help_text: string | null;
    required: boolean;
    time_limit_seconds: number;
    options?: unknown;
    scoring?: unknown;
    points?: number | null;
  };
  index: number;
  versionId: string;
  frozen: boolean;
  canEditScoring: boolean;
  editing: boolean;
  onEdit: () => void;
  onClose: () => void;
  onSave: (p: {
    position: number;
    question_type: QType;
    prompt: string;
    help_text: string | null;
    required: boolean;
    time_limit_seconds: number;
    options: unknown;
    scoring: Scoring;
    points: number;
  }) => void;
  onDelete: () => void;
}) {
  const [prompt, setPrompt] = useState(q.prompt);
  const [help, setHelp] = useState(q.help_text ?? "");
  const [type, setType] = useState<QType>(q.question_type as QType);
  const [required, setRequired] = useState(q.required);
  const [time, setTime] = useState(q.time_limit_seconds);
  const [opts, setOpts] = useState<unknown>(q.options ?? defaultOptionsFor(q.question_type as QType, null));
  const initialScoring = (q.scoring as Scoring | null) ?? { mode: "none" };
  const [scoreMode, setScoreMode] = useState<Scoring["mode"]>(initialScoring.mode);
  const [correctIds, setCorrectIds] = useState<string[]>(
    initialScoring.mode === "exact" || initialScoring.mode === "partial"
      ? initialScoring.correct_option_ids ?? []
      : [],
  );
  const [scaleTarget, setScaleTarget] = useState<number>(
    initialScoring.mode === "scale_target" ? initialScoring.target : 0,
  );
  const [scaleTolerance, setScaleTolerance] = useState<number>(
    initialScoring.mode === "scale_target" ? initialScoring.tolerance ?? 0 : 0,
  );
  const [points, setPoints] = useState<number>(q.points ?? 1);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: q.id,
    disabled: frozen || editing,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function changeType(next: QType) {
    setType(next);
    setOpts(defaultOptionsFor(next, opts));
    // reset scoring se o modo atual deixou de fazer sentido
    if (next !== "single_choice" && next !== "multiple_choice" && (scoreMode === "exact" || scoreMode === "partial")) {
      setScoreMode("none");
    }
    if (next !== "scale" && scoreMode === "scale_target") setScoreMode("none");
  }

  function buildScoring(): Scoring {
    if (scoreMode === "none") return { mode: "none" };
    if (scoreMode === "exact" || scoreMode === "partial") {
      return { mode: scoreMode, correct_option_ids: correctIds };
    }
    return { mode: "scale_target", target: scaleTarget, tolerance: scaleTolerance };
  }

  function handleSave() {
    onSave({
      position: q.position,
      question_type: type,
      prompt,
      help_text: help || null,
      required,
      time_limit_seconds: time,
      options: opts,
      scoring: buildScoring(),
      points,
    });
  }

  if (!editing) {
    const typeLabel: Record<string, string> = {
      short_text: "Texto curto",
      long_text: "Texto longo",
      single_choice: "Escolha única",
      multiple_choice: "Múltipla escolha",
      scale: "Escala",
    };
    const hasGabarito = q.scoring && typeof q.scoring === "object" && (q.scoring as { mode?: string }).mode !== "none";
    return (
      <Card ref={setNodeRef} style={style}>
        <CardContent className="p-4 flex items-start justify-between gap-3">
          {!frozen && (
            <button
              type="button"
              className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
              aria-label="Arrastar para reordenar"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">
              #{index + 1} · {typeLabel[q.question_type] ?? q.question_type} · {q.time_limit_seconds}s
              {q.required && " · obrigatória"}
              {hasGabarito && ` · ${q.points ?? 1} pt`}
            </p>
            <p className="font-medium">{q.prompt}</p>
            {q.help_text && <p className="text-xs text-muted-foreground mt-1">{q.help_text}</p>}
          </div>
          {!frozen && (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={onEdit}>Editar</Button>
              <ConfirmActionDialog
                trigger={<Button size="sm" variant="ghost" aria-label="Excluir pergunta"><Trash2 className="h-4 w-4" /></Button>}
                title="Excluir pergunta?"
                description="Esta ação não pode ser desfeita."
                confirmLabel="Excluir"
                onConfirm={onDelete}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const isChoice = type === "single_choice" || type === "multiple_choice";
  const isScale = type === "scale";
  const optsArr = Array.isArray(opts) ? (opts as ChoiceOpt[]) : [];
  const scaleCfg = (opts && typeof opts === "object" && !Array.isArray(opts) ? (opts as ScaleCfg) : { min: 0, max: 10, step: 1 });

  return (
    <Card ref={setNodeRef} style={style}>
      <CardContent className="p-4 space-y-3">
        <div><Label>Pergunta</Label><Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} /></div>
        <div><Label>Ajuda (opcional)</Label><Input value={help} onChange={(e) => setHelp(e.target.value)} /></div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => changeType(v as QType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="short_text">Texto curto</SelectItem>
                <SelectItem value="long_text">Texto longo</SelectItem>
                <SelectItem value="single_choice">Escolha única</SelectItem>
                <SelectItem value="multiple_choice">Múltipla escolha</SelectItem>
                <SelectItem value="scale">Escala / NPS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tempo (s)</Label>
            <Input type="number" min={10} value={time} onChange={(e) => setTime(Number(e.target.value) || 10)} />
          </div>
          <div className="flex items-end gap-2">
            <Switch checked={required} onCheckedChange={setRequired} />
            <Label>Obrigatória</Label>
          </div>
        </div>

        {isChoice && (
          <div className="space-y-2 rounded-md border bg-muted/30 p-3">
            <Label className="text-xs uppercase text-muted-foreground">Alternativas</Label>
            {optsArr.map((opt, i) => (
              <div key={opt.id} className="flex items-center gap-2">
                <Input
                  value={opt.label}
                  onChange={(e) => {
                    const next = optsArr.map((o) => (o.id === opt.id ? { ...o, label: e.target.value } : o));
                    setOpts(next);
                  }}
                  placeholder={`Alternativa ${i + 1}`}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Remover alternativa"
                  disabled={optsArr.length <= 2}
                  onClick={() => {
                    const next = optsArr.filter((o) => o.id !== opt.id).map((o, idx2) => ({ ...o, order: idx2 + 1 }));
                    setOpts(next);
                    setCorrectIds((ids) => ids.filter((id) => id !== opt.id));
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpts([...optsArr, { id: uuid(), label: `Alternativa ${optsArr.length + 1}`, order: optsArr.length + 1 }])}
            >
              <Plus className="h-3 w-3 mr-1" />Adicionar alternativa
            </Button>
          </div>
        )}

        {isScale && (
          <div className="grid sm:grid-cols-5 gap-3 rounded-md border bg-muted/30 p-3">
            <div><Label>Min</Label><Input type="number" value={scaleCfg.min} onChange={(e) => setOpts({ ...scaleCfg, min: Number(e.target.value) })} /></div>
            <div><Label>Max</Label><Input type="number" value={scaleCfg.max} onChange={(e) => setOpts({ ...scaleCfg, max: Number(e.target.value) })} /></div>
            <div><Label>Step</Label><Input type="number" min={1} value={scaleCfg.step ?? 1} onChange={(e) => setOpts({ ...scaleCfg, step: Number(e.target.value) || 1 })} /></div>
            <div><Label>Rótulo mín.</Label><Input value={scaleCfg.min_label ?? ""} onChange={(e) => setOpts({ ...scaleCfg, min_label: e.target.value })} /></div>
            <div><Label>Rótulo máx.</Label><Input value={scaleCfg.max_label ?? ""} onChange={(e) => setOpts({ ...scaleCfg, max_label: e.target.value })} /></div>
          </div>
        )}

        {canEditScoring && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={scoreMode !== "none"}
              onCheckedChange={(c) => {
                if (!c) setScoreMode("none");
                else if (isChoice) setScoreMode("exact");
                else if (isScale) setScoreMode("scale_target");
              }}
              disabled={!isChoice && !isScale}
            />
            <Label>Esta questão tem gabarito</Label>
            {!isChoice && !isScale && <span className="text-xs text-muted-foreground">(disponível em escolha / escala)</span>}
          </div>

          {scoreMode !== "none" && isChoice && (
            <>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Modo:</Label>
                <Select value={scoreMode} onValueChange={(v) => setScoreMode(v as Scoring["mode"])}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exact">Exato (tudo ou nada)</SelectItem>
                    <SelectItem value="partial">Parcial (proporcional)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase text-muted-foreground">Alternativas corretas</Label>
                {optsArr.map((opt) => {
                  const isSelected = correctIds.includes(opt.id);
                  return (
                    <Label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) setCorrectIds([...correctIds, opt.id]);
                          else setCorrectIds(correctIds.filter((id) => id !== opt.id));
                        }}
                      />
                      <span className="text-sm">{opt.label}</span>
                    </Label>
                  );
                })}
              </div>
            </>
          )}

          {scoreMode === "scale_target" && isScale && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Resposta esperada</Label><Input type="number" value={scaleTarget} onChange={(e) => setScaleTarget(Number(e.target.value))} /></div>
              <div><Label>Tolerância (±)</Label><Input type="number" min={0} value={scaleTolerance} onChange={(e) => setScaleTolerance(Number(e.target.value))} /></div>
            </div>
          )}

          {scoreMode !== "none" && (
            <div className="w-32">
              <Label>Pontos</Label>
              <Input type="number" min={0} step={0.5} value={points} onChange={(e) => setPoints(Number(e.target.value) || 0)} />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </div>
      </CardContent>
    </Card>
  );
}
