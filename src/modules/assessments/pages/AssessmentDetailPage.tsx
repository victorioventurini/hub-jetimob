/**
 * AssessmentDetailPage — detalhes de uma prova: forms vinculados, convites, respostas.
 */
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Copy, Mail, Pencil } from "lucide-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { useUrlTab } from "@/shared/url";
import { usePageTitle } from "@/hooks/usePageTitle";
import { SavedLinksPopover } from "@/shared/saved-links";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  useAssessment,
  useUpdateAssessment,
  useDeleteAssessment,
  useForms,
  useVersions,
  useAddFormToAssessment,
  useRemoveFormFromAssessment,
  useInvites,
  useCreateInvitesBatch,
  useRevokeInvite,
  useReactivateInvite,
  useRuns,
  type BatchInviteInput,
} from "../hooks/useAssessmentsData";
import { BuUserMultiSelect } from "@/components/selects/BuUserMultiSelect";
import { TeamSelect } from "@/components/selects/TeamSelect";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useQuery } from "@tanstack/react-query";
import { useBu } from "@/contexts/BuContext";
import { maskCpfInput, normalizeCpf, isValidCpf } from "@/lib/validation/cpf";
import { AlertCircle, X as XIcon } from "lucide-react";
import { AssessmentStatusBadge, InviteStatusBadge, RunStatusBadge } from "../components/StatusBadges";
import { ConfirmActionDialog } from "../components/ConfirmActionDialog";

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data } = useAssessment(id);
  const a = data?.assessment;
  const links = data?.links ?? [];
  const update = useUpdateAssessment();
  const del = useDeleteAssessment();
  const [tab, setTab] = useUrlTab<"forms" | "invites" | "results">("forms");
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTime, setEditTime] = useState<string>("");

  useEffect(() => {
    if (a && editOpen) {
      setEditTitle(a.title ?? "");
      setEditDescription(a.description ?? "");
      setEditTime(a.default_total_time_seconds ? String(a.default_total_time_seconds) : "");
    }
  }, [a, editOpen]);

  usePageTitle(a?.title ?? "Prova", {
    customDescription: a?.description?.trim() || "Detalhes da prova: formulários, convites e resultados.",
  });

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title={a?.title ?? "Prova"}
          description={a?.description ?? undefined}
          breadcrumbs={[{ label: "Assessments", href: "/assessments" }, { label: a?.title ?? "..." }]}
          actions={
            <div className="flex items-center gap-2">
              <SavedLinksPopover moduleSlug="assessments" />
              <Button variant="outline" asChild><Link to="/assessments"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Link></Button>
              {a && a.status !== "active" && (
                <Button onClick={() => update.mutate({ id: id!, status: "active" })}>Ativar</Button>
              )}
              {a?.status === "active" && (
                <ConfirmActionDialog
                  trigger={<Button variant="outline">Arquivar</Button>}
                  title="Arquivar prova?"
                  description="A prova ficará indisponível para novos respondentes. Convites pendentes não poderão mais ser usados."
                  confirmLabel="Arquivar"
                  destructive
                  onConfirm={() => update.mutate({ id: id!, status: "archived" })}
                />
              )}
            </div>
          }
        />

        <Card>
          <CardContent className="p-4 grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <div className="mt-1"><AssessmentStatusBadge status={a?.status} /></div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Formulários vinculados</p>
              <p className="mt-1 font-medium">{links.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tempo total padrão</p>
              <p className="mt-1 font-medium">{a?.default_total_time_seconds ? `${a.default_total_time_seconds}s` : "Automático"}</p>
            </div>
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="forms">Formulários</TabsTrigger>
            <TabsTrigger value="invites">Convites</TabsTrigger>
            <TabsTrigger value="results">Resultados</TabsTrigger>
          </TabsList>
          <TabsContent value="forms" className="mt-6"><FormsLinkTab assessmentId={id!} links={links} disabled={a?.status === "archived"} /></TabsContent>
          <TabsContent value="invites" className="mt-6"><InvitesTab assessmentId={id!} /></TabsContent>
          <TabsContent value="results" className="mt-6"><ResultsTab assessmentId={id!} /></TabsContent>
        </Tabs>
      </div>
    </HubLayout>
  );
}

function FormsLinkTab({ assessmentId, links, disabled }: { assessmentId: string; links: { id: string; form_id: string; version_id: string; position: number }[]; disabled?: boolean }) {
  const { data: forms } = useForms();
  const add = useAddFormToAssessment();
  const remove = useRemoveFormFromAssessment();
  const [open, setOpen] = useState(false);
  const [formId, setFormId] = useState<string>("");
  const { data: versions } = useVersions(formId);
  const [versionId, setVersionId] = useState<string>("");

  const linkedFormIds = new Set(links.map((l) => l.form_id));
  const available = (forms ?? []).filter((f) => f.status === "published" && !linkedFormIds.has(f.id));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)} disabled={disabled || available.length === 0}><Plus className="h-4 w-4 mr-2" />Adicionar formulário</Button>
      </div>
      {links.length === 0 ? (
        <EmptyState
          variant="firstUse"
          title="Nenhum formulário vinculado"
          description={disabled ? "Esta prova está arquivada." : "Vincule um formulário publicado para começar."}
          actionLabel={disabled || available.length === 0 ? undefined : "Adicionar formulário"}
          onAction={disabled || available.length === 0 ? undefined : () => setOpen(true)}
        />
      ) : (
        <div className="grid gap-2">
          {links.map((l, idx) => {
            const f = forms?.find((x) => x.id === l.form_id);
            return (
              <Card key={l.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">#{idx + 1}</p>
                    <p className="font-medium">{f?.title ?? l.form_id}</p>
                  </div>
                  {!disabled && (
                    <ConfirmActionDialog
                      trigger={
                        <Button size="sm" variant="ghost" aria-label="Remover formulário">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                      title="Remover formulário?"
                      description="O formulário será desvinculado desta prova. Convites pendentes podem ser afetados."
                      confirmLabel="Remover"
                      onConfirm={() => remove.mutate({ link_id: l.id, assessment_id: assessmentId })}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar formulário</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Formulário (publicados)</Label>
              <Select value={formId} onValueChange={(v) => { setFormId(v); setVersionId(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {available.map((f) => <SelectItem key={f.id} value={f.id}>{f.title} (nv {f.level})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {formId && (
              <div>
                <Label>Versão</Label>
                <Select value={versionId} onValueChange={setVersionId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(versions ?? []).filter((v) => v.frozen).map((v) => (
                      <SelectItem key={v.id} value={v.id}>v{v.version_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              disabled={!formId || !versionId || add.isPending}
              onClick={async () => {
                await add.mutateAsync({ assessment_id: assessmentId, form_id: formId, version_id: versionId, position: links.length + 1 });
                setOpen(false); setFormId(""); setVersionId("");
              }}
            >Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InvitesTab({ assessmentId }: { assessmentId: string }) {
  const { data: invites } = useInvites(assessmentId);
  const revoke = useRevokeInvite();
  const reactivate = useReactivateInvite();
  const [open, setOpen] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Novo convite</Button>
      </div>
      {(invites?.length ?? 0) === 0 ? (
        <EmptyState
          variant="firstUse"
          title="Nenhum convite ainda"
          description="Crie convites para que respondentes acessem a prova com link único."
          actionLabel="Novo convite"
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="grid gap-2">
          {invites?.map((inv) => {
            const link = `${baseUrl}/q/${inv.token}`;
            return (
              <Card key={inv.id}>
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{inv.invitee_name || inv.invitee_cpf}</p>
                    <p className="text-xs text-muted-foreground truncate">CPF {inv.invitee_cpf} · {inv.invitee_email ?? "sem email"}</p>
                  </div>
                  <InviteStatusBadge status={inv.status} />
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" aria-label="Copiar link" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copiado"); }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    {inv.invitee_email && (
                      <Button size="sm" variant="ghost" aria-label="Enviar email" asChild>
                        <a href={`mailto:${inv.invitee_email}?subject=${encodeURIComponent("Convite para questionário")}&body=${encodeURIComponent(link)}`}><Mail className="h-3 w-3" /></a>
                      </Button>
                    )}
                    {inv.status !== "submitted" && inv.status !== "revoked" && (
                      <ConfirmActionDialog
                        trigger={<Button size="sm" variant="ghost">Revogar</Button>}
                        title="Revogar convite?"
                        description="O respondente perderá o acesso ao link. Você pode reativar depois."
                        confirmLabel="Revogar"
                        onConfirm={() => revoke.mutate({ id: inv.id, assessment_id: assessmentId })}
                      />
                    )}
                    {inv.status === "revoked" && (
                      <Button size="sm" variant="ghost" onClick={() => reactivate.mutate({ id: inv.id, assessment_id: assessmentId })}>Reativar</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <NewInviteDialog
        open={open}
        onOpenChange={setOpen}
        assessmentId={assessmentId}
        existingCpfs={(invites ?? []).map((i) => i.invitee_cpf)}
      />
    </div>
  );
}

function NewInviteDialog({
  open,
  onOpenChange,
  assessmentId,
  existingCpfs,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assessmentId: string;
  existingCpfs: string[];
}) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const batch = useCreateInvitesBatch();

  const [tab, setTab] = useUrlTab<"internal" | "external">("internal", "invite");

  // Internos
  const [teamId, setTeamId] = useState<string | null>(null);
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);

  const internalProfilesQ = useQuery({
    queryKey: ["assessments", "invite-profiles-cpf", currentBuId, selectedProfileIds],
    enabled: !!currentBuId && selectedProfileIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, cpf, display_name, work_email")
        .in("id", selectedProfileIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Externos
  const [externals, setExternals] = useState<Array<{ cpf: string; name: string; email: string }>>([
    { cpf: "", name: "", email: "" },
  ]);

  const existingSet = new Set(existingCpfs.map((c) => c.replace(/\D/g, "")));

  const internalRows = (internalProfilesQ.data ?? []).map((p) => {
    const cpf = (p.cpf ?? "").replace(/\D/g, "");
    let warning: string | null = null;
    if (!cpf) warning = "Sem CPF cadastrado no perfil";
    else if (existingSet.has(cpf)) warning = "Já possui convite ativo";
    return { ...p, cpf, warning };
  });
  const validInternal = internalRows.filter((r) => !r.warning);

  const externalParsed = externals.map((e) => {
    const cpf = normalizeCpf(e.cpf);
    let error: string | null = null;
    if (!cpf) error = "CPF obrigatório";
    else if (!isValidCpf(cpf)) error = "CPF inválido";
    else if (existingSet.has(cpf)) error = "Já possui convite ativo";
    return { ...e, cpf, error };
  });
  // dedup interno na lista de externos
  const seen = new Set<string>();
  for (const e of externalParsed) {
    if (e.cpf && !e.error) {
      if (seen.has(e.cpf)) e.error = "CPF duplicado na lista";
      seen.add(e.cpf);
    }
  }
  const validExternal = externalParsed.filter((e) => !e.error);

  const totalValid = tab === "internal" ? validInternal.length : validExternal.length;

  const handleSubmit = async () => {
    let invites: BatchInviteInput[] = [];
    if (tab === "internal") {
      invites = validInternal.map((r) => ({
        invitee_profile_id: r.id,
        invitee_cpf: r.cpf,
        invitee_name: r.display_name ?? null,
        invitee_email: r.work_email ?? null,
      }));
    } else {
      invites = validExternal.map((e) => ({
        invitee_cpf: e.cpf,
        invitee_name: e.name || null,
        invitee_email: e.email || null,
      }));
    }
    if (invites.length === 0) return;
    const res = await batch.mutateAsync({ assessment_id: assessmentId, invites });
    if (res.created > 0 || res.skipped_duplicates.length || res.failed.length) {
      onOpenChange(false);
      setSelectedProfileIds([]);
      setExternals([{ cpf: "", name: "", email: "" }]);
      setTeamId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>Novo convite</DialogTitle></DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="internal">Usuários internos</TabsTrigger>
            <TabsTrigger value="external">Externos (CPF)</TabsTrigger>
          </TabsList>

          <TabsContent value="internal" className="space-y-3 mt-4">
            <div>
              <Label>Filtrar por time (opcional)</Label>
              <TeamSelect
                value={teamId}
                onValueChange={setTeamId}
                includeAll
                allLabel="Todos os times"
              />
            </div>
            <div>
              <Label>Selecionar usuários</Label>
              <BuUserMultiSelect
                value={selectedProfileIds}
                onValueChange={setSelectedProfileIds}
                excludeExternal
                teamId={teamId ?? undefined}
                placeholder="Selecione um ou mais usuários"
              />
            </div>
            {selectedProfileIds.length > 0 && (
              <div className="rounded-md border p-2 max-h-56 overflow-y-auto space-y-1">
                {internalProfilesQ.isLoading ? (
                  <p className="text-xs text-muted-foreground p-2">Carregando…</p>
                ) : internalRows.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 text-sm py-1">
                    <span className="truncate">{r.display_name}</span>
                    {r.warning ? (
                      <Badge variant="destructive" className="gap-1 text-[10px]">
                        <AlertCircle className="h-3 w-3" />{r.warning}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">CPF ok</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="external" className="space-y-3 mt-4">
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {externalParsed.map((row, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4">
                    <Input
                      placeholder="CPF"
                      inputMode="numeric"
                      maxLength={14}
                      value={maskCpfInput(row.cpf || externals[i].cpf)}
                      onChange={(e) => setExternals((prev) => prev.map((p, idx) => idx === i ? { ...p, cpf: e.target.value } : p))}
                    />
                    {row.error && <p className="text-[10px] text-destructive mt-0.5">{row.error}</p>}
                  </div>
                  <Input
                    className="col-span-3"
                    placeholder="Nome"
                    value={externals[i].name}
                    onChange={(e) => setExternals((prev) => prev.map((p, idx) => idx === i ? { ...p, name: e.target.value } : p))}
                  />
                  <Input
                    className="col-span-4"
                    placeholder="Email (opcional)"
                    type="email"
                    value={externals[i].email}
                    onChange={(e) => setExternals((prev) => prev.map((p, idx) => idx === i ? { ...p, email: e.target.value } : p))}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="col-span-1"
                    disabled={externals.length === 1}
                    onClick={() => setExternals((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExternals((prev) => [...prev, { cpf: "", name: "", email: "" }])}
            >
              <Plus className="h-3 w-3 mr-1" /> Adicionar mais um
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={totalValid === 0 || batch.isPending} onClick={handleSubmit}>
            Criar {totalValid > 0 ? `${totalValid} convite${totalValid > 1 ? "s" : ""}` : "convites"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResultsTab({ assessmentId }: { assessmentId: string }) {
  const { data: runs } = useRuns(assessmentId);
  if (!runs || runs.length === 0) {
    return (
      <EmptyState
        variant="default"
        title="Nenhuma resposta ainda"
        description="Quando respondentes enviarem suas tentativas, elas aparecerão aqui."
      />
    );
  }
  return (
    <div className="grid gap-2">
      {runs.map((r) => {
        const fraud = (r.tab_switch_count ?? 0) + (r.paste_attempt_count ?? 0) + (r.copy_attempt_count ?? 0);
        return (
          <Link
            key={r.id}
            to={`/assessments/runs/${r.id}`}
            className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="hover:bg-accent/40 transition-colors">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.respondent_name || r.respondent_cpf}</p>
                  <p className="text-xs text-muted-foreground">
                    Iniciado em {new Date(r.started_at).toLocaleString()}
                    {r.submitted_at && ` · Enviado em ${new Date(r.submitted_at).toLocaleString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {fraud > 0 && <Badge variant="destructive" aria-label={`${fraud} sinais de risco`}>⚠ {fraud}</Badge>}
                  <RunStatusBadge status={r.status} />
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
