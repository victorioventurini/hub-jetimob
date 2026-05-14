/**
 * AssessmentsPage — entrypoint /assessments com tabs (Provas, Formulários).
 * UI alinhada aos canônicos: PageHeader com CTA + SavedLinksPopover,
 * ListPageFilters com busca+status, ViewOptionsBar, EmptyState, Skeleton.
 */
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, ClipboardList, FileText, Trash2 } from "lucide-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { ListPageFilters } from "@/components/ui/list-page-filters";
import { ViewOptionsBar } from "@/components/ui/view-options-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UrlSelect } from "@/shared/filters/UrlSelect";
import { useUrlTab, useUrlState } from "@/shared/url";
import { usePageTitle } from "@/hooks/usePageTitle";
import { SavedLinksPopover } from "@/shared/saved-links";
import { PreviewEnvironmentButton } from "../components/PreviewEnvironmentButton";
import { DuplicateActionButton } from "../components/DuplicateActionButton";
import {
  useAssessments,
  useForms,
  useCreateAssessment,
  useCreateForm,
  useDeleteForm,
  useDuplicateAssessment,
  useDuplicateForm,
} from "../hooks/useAssessmentsData";
import { AssessmentStatusBadge, FormStatusBadge } from "../components/StatusBadges";
import { ConfirmActionDialog } from "../components/ConfirmActionDialog";

export default function AssessmentsPage() {
  const [tab, setTab] = useUrlTab<"provas" | "forms">("provas");
  const [open, setOpen] = useState(false);

  usePageTitle("Assessments", {
    customDescription: "Provas e formulários com controle de tempo e anti-fraude no Hub da Jet.",
  });

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Assessments"
          description="Provas e formulários com controle de tempo e anti-fraude"
          breadcrumbs={[{ label: "Assessments" }]}
          actions={
            <div className="flex items-center gap-2">
              <SavedLinksPopover moduleSlug="assessments" />
              <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{tab === "provas" ? "Nova prova" : "Novo formulário"}</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </div>
          }
        />

        <Tabs value={tab} onValueChange={(v) => setTab(v as "provas" | "forms")}>
          <TabsList>
            <TabsTrigger value="provas"><ClipboardList className="h-4 w-4 mr-2" />Provas</TabsTrigger>
            <TabsTrigger value="forms"><FileText className="h-4 w-4 mr-2" />Formulários</TabsTrigger>
          </TabsList>
          <TabsContent value="provas" className="mt-6">
            <AssessmentsTab open={open} setOpen={setOpen} />
          </TabsContent>
          <TabsContent value="forms" className="mt-6">
            <FormsTab open={open} setOpen={setOpen} />
          </TabsContent>
        </Tabs>
      </div>
    </HubLayout>
  );
}

const ASSESSMENT_STATUS_OPTIONS = [
  { value: "draft", label: "Rascunho" },
  { value: "active", label: "Ativa" },
  { value: "archived", label: "Arquivada" },
];

function AssessmentsTab({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const { data, isLoading } = useAssessments();
  const create = useCreateAssessment();
  const duplicate = useDuplicateAssessment();
  const navigate = useNavigate();
  const search = useUrlState<string>({ key: "qa", defaultValue: "" });
  const status = useUrlState<string>({ key: "sa", defaultValue: "all" });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const filtered = useMemo(() => {
    const q = search.value.trim().toLowerCase();
    return (data ?? []).filter((a) => {
      if (status.value !== "all" && a.status !== status.value) return false;
      if (!q) return true;
      return a.title.toLowerCase().includes(q) || (a.description ?? "").toLowerCase().includes(q);
    });
  }, [data, search.value, status.value]);

  const hasFilters = !!search.value || status.value !== "all";

  return (
    <div className="space-y-4">
      <ListPageFilters
        searchValue={search.value}
        onSearchChange={search.set}
        searchPlaceholder="Buscar provas..."
      >
        <UrlSelect
          value={status.value}
          onChange={status.set}
          options={ASSESSMENT_STATUS_OPTIONS}
          allOptionLabel="Todos os status"
          includeAllOption
          triggerClassName="w-full sm:w-[180px]"
        />
      </ListPageFilters>

      <ViewOptionsBar
        resultCount={filtered.length}
        resultCountLabel="provas encontradas"
        resultCountLabelSingular="prova encontrada"
      />

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : filtered.length === 0 ? (
        hasFilters ? (
          <EmptyState
            variant="filter"
            actionLabel="Limpar filtros"
            onAction={() => { search.set(""); status.set("all"); }}
          />
        ) : (
          <EmptyState
            variant="firstUse"
            title="Nenhuma prova ainda"
            description="Crie a primeira prova para começar a aplicar avaliações."
            actionLabel="Nova prova"
            onAction={() => setOpen(true)}
          />
        )
      ) : (
        <div className="grid gap-3">
          {filtered.map((a) => (
            <Card key={a.id} className="hover:bg-accent/40 transition-colors">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <Link
                  to={`/assessments/provas/${a.id}`}
                  className="min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <p className="font-medium truncate">{a.title}</p>
                  {a.description && <p className="text-sm text-muted-foreground line-clamp-1">{a.description}</p>}
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <AssessmentStatusBadge status={a.status} />
                  <PreviewEnvironmentButton assessmentId={a.id} variant="icon" />
                  <DuplicateActionButton
                    title="Duplicar prova?"
                    description="Cria uma nova prova em rascunho com os mesmos formulários vinculados. Convites e respostas não são copiados."
                    isPending={duplicate.isPending}
                    ariaLabel="Duplicar prova"
                    onConfirm={async () => {
                      const newId = await duplicate.mutateAsync({ id: a.id });
                      navigate(`/assessments/provas/${newId}`);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova prova</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label htmlFor="new-assessment-title">Título</Label><Input id="new-assessment-title" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><Label htmlFor="new-assessment-desc">Descrição</Label><Textarea id="new-assessment-desc" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              disabled={!title.trim() || create.isPending}
              onClick={async () => {
                const id = await create.mutateAsync({ title: title.trim(), description: description.trim() || undefined });
                setOpen(false);
                setTitle(""); setDescription("");
                navigate(`/assessments/provas/${id}`);
              }}
            >Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const FORM_STATUS_OPTIONS = [
  { value: "draft", label: "Rascunho" },
  { value: "published", label: "Publicado" },
  { value: "archived", label: "Arquivado" },
];

function FormsTab({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const { data, isLoading } = useForms();
  const create = useCreateForm();
  const deleteForm = useDeleteForm();
  const duplicate = useDuplicateForm();
  const navigate = useNavigate();
  const search = useUrlState<string>({ key: "qf", defaultValue: "" });
  const status = useUrlState<string>({ key: "sf", defaultValue: "all" });
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState(1);

  const filtered = useMemo(() => {
    const q = search.value.trim().toLowerCase();
    return (data ?? []).filter((f) => {
      if (status.value !== "all" && f.status !== status.value) return false;
      if (!q) return true;
      return f.title.toLowerCase().includes(q);
    });
  }, [data, search.value, status.value]);

  const hasFilters = !!search.value || status.value !== "all";

  return (
    <div className="space-y-4">
      <ListPageFilters
        searchValue={search.value}
        onSearchChange={search.set}
        searchPlaceholder="Buscar formulários..."
      >
        <UrlSelect
          value={status.value}
          onChange={status.set}
          options={FORM_STATUS_OPTIONS}
          allOptionLabel="Todos os status"
          includeAllOption
          triggerClassName="w-full sm:w-[180px]"
        />
      </ListPageFilters>

      <ViewOptionsBar
        resultCount={filtered.length}
        resultCountLabel="formulários encontrados"
        resultCountLabelSingular="formulário encontrado"
      />

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : filtered.length === 0 ? (
        hasFilters ? (
          <EmptyState
            variant="filter"
            actionLabel="Limpar filtros"
            onAction={() => { search.set(""); status.set("all"); }}
          />
        ) : (
          <EmptyState
            variant="firstUse"
            title="Nenhum formulário ainda"
            description="Crie um formulário para reutilizar entre provas."
            actionLabel="Novo formulário"
            onAction={() => setOpen(true)}
          />
        )
      ) : (
        <div className="grid gap-3">
          {filtered.map((f) => (
            <Card key={f.id} className="hover:bg-accent/40 transition-colors">
              <CardContent className="p-0 flex items-stretch">
                <Link
                  to={`/assessments/forms/${f.id}`}
                  className="flex-1 p-4 flex items-center justify-between gap-3 rounded-l-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{f.title}</p>
                    <p className="text-xs text-muted-foreground">Nível {f.level}</p>
                  </div>
                  <FormStatusBadge status={f.status} />
                </Link>
                <div className="flex items-center gap-1 pr-3">
                  <DuplicateActionButton
                    title="Duplicar formulário?"
                    description="Cria um novo formulário em rascunho com todas as perguntas copiadas. Não copia vínculos com provas."
                    isPending={duplicate.isPending}
                    ariaLabel="Duplicar formulário"
                    onConfirm={async () => {
                      const r = await duplicate.mutateAsync({ id: f.id });
                      navigate(`/assessments/forms/${r.formId}`);
                    }}
                  />
                  <ConfirmActionDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir formulário"
                        disabled={deleteForm.isPending}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                    title="Excluir formulário?"
                    description="Esta ação remove o formulário e todas as suas perguntas. Provas ativas vinculadas precisam ser desvinculadas primeiro."
                    confirmLabel="Excluir"
                    onConfirm={() => deleteForm.mutate(f.id)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo formulário</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label htmlFor="new-form-title">Título</Label><Input id="new-form-title" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><Label htmlFor="new-form-level">Nível</Label><Input id="new-form-level" type="number" min={1} value={level} onChange={(e) => setLevel(Number(e.target.value) || 1)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              disabled={!title.trim() || create.isPending}
              onClick={async () => {
                const r = await create.mutateAsync({ title: title.trim(), level });
                setOpen(false); setTitle(""); setLevel(1);
                navigate(`/assessments/forms/${r.formId}`);
              }}
            >Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
