/**
 * FormEditorPage — editor de versão draft de um formulário (perguntas + tempos).
 */
import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Lock } from "lucide-react";
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
import {
  useForm,
  useVersions,
  useQuestions,
  useUpsertQuestion,
  useDeleteQuestion,
  usePublishVersion,
  useCreateDraftVersion,
  useUpdateForm,
  useDeleteForm,
} from "../hooks/useAssessmentsData";

export default function FormEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: form } = useForm(id);
  const { data: versions } = useVersions(id);
  const draft = useMemo(() => versions?.find((v) => !v.frozen) ?? versions?.[0], [versions]);
  const { data: questions } = useQuestions(draft?.id);
  const upsert = useUpsertQuestion();
  const del = useDeleteQuestion();
  const publish = usePublishVersion();
  const updateForm = useUpdateForm();
  const deleteForm = useDeleteForm();
  const createDraft = useCreateDraftVersion();
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
          {(questions ?? []).map((q, idx) => (
            <QuestionRow
              key={q.id}
              q={q}
              index={idx}
              versionId={draft!.id}
              frozen={draft?.frozen ?? false}
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
          {!draft?.frozen && (
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

function QuestionRow({
  q,
  index,
  versionId,
  frozen,
  editing,
  onEdit,
  onClose,
  onSave,
  onDelete,
}: {
  q: { id: string; position: number; question_type: string; prompt: string; help_text: string | null; required: boolean; time_limit_seconds: number };
  index: number;
  versionId: string;
  frozen: boolean;
  editing: boolean;
  onEdit: () => void;
  onClose: () => void;
  onSave: (p: { position: number; question_type: "short_text" | "long_text" | "single_choice" | "multiple_choice"; prompt: string; help_text: string | null; required: boolean; time_limit_seconds: number }) => void;
  onDelete: () => void;
}) {
  const [prompt, setPrompt] = useState(q.prompt);
  const [help, setHelp] = useState(q.help_text ?? "");
  const [type, setType] = useState(q.question_type as "short_text" | "long_text" | "single_choice" | "multiple_choice");
  const [required, setRequired] = useState(q.required);
  const [time, setTime] = useState(q.time_limit_seconds);

  if (!editing) {
    return (
      <Card>
        <CardContent className="p-4 flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">#{index + 1} · {q.question_type} · {q.time_limit_seconds}s {q.required && "· obrigatória"}</p>
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

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div><Label>Pergunta</Label><Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} /></div>
        <div><Label>Ajuda (opcional)</Label><Input value={help} onChange={(e) => setHelp(e.target.value)} /></div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="short_text">Texto curto</SelectItem>
                <SelectItem value="long_text">Texto longo</SelectItem>
                <SelectItem value="single_choice">Escolha única</SelectItem>
                <SelectItem value="multiple_choice">Múltipla escolha</SelectItem>
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
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave({ position: q.position, question_type: type, prompt, help_text: help || null, required, time_limit_seconds: time })}>
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
