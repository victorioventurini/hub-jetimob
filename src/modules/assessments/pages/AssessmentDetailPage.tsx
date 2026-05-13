/**
 * AssessmentDetailPage — detalhes de uma prova: forms vinculados, convites, respostas.
 */
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Copy, Mail } from "lucide-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  useAssessment,
  useUpdateAssessment,
  useForms,
  useVersions,
  useAddFormToAssessment,
  useRemoveFormFromAssessment,
  useInvites,
  useCreateInvite,
  useRevokeInvite,
  useRuns,
} from "../hooks/useAssessmentsData";

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useAssessment(id);
  const a = data?.assessment;
  const links = data?.links ?? [];
  const update = useUpdateAssessment();

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title={a?.title ?? "Prova"}
          description={a?.description ?? undefined}
          breadcrumbs={[{ label: "Assessments", href: "/assessments" }, { label: a?.title ?? "..." }]}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild><Link to="/assessments"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Link></Button>
              {a && a.status !== "active" && (
                <Button onClick={() => update.mutate({ id: id!, status: "active" })}>Ativar</Button>
              )}
              {a?.status === "active" && (
                <Button variant="outline" onClick={() => update.mutate({ id: id!, status: "archived" })}>Arquivar</Button>
              )}
            </div>
          }
        />

        <Card>
          <CardContent className="p-4 grid gap-3 sm:grid-cols-3">
            <div><Label>Status</Label><p><Badge variant={a?.status === "active" ? "default" : "secondary"}>{a?.status}</Badge></p></div>
            <div><Label>Formulários</Label><p>{links.length}</p></div>
            <div><Label>Tempo total padrão</Label><p>{a?.default_total_time_seconds ?? "auto"}</p></div>
          </CardContent>
        </Card>

        <Tabs defaultValue="forms">
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
      {links.length === 0 && (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Nenhum formulário vinculado.</CardContent></Card>
      )}
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
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate({ link_id: l.id, assessment_id: assessmentId })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

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
  const create = useCreateInvite();
  const revoke = useRevokeInvite();
  const [open, setOpen] = useState(false);
  const [cpf, setCpf] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Novo convite</Button>
      </div>
      {(invites?.length ?? 0) === 0 && (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Nenhum convite ainda.</CardContent></Card>
      )}
      <div className="grid gap-2">
        {invites?.map((inv) => {
          const link = `${baseUrl}/q/${inv.token}`;
          return (
            <Card key={inv.id}>
              <CardContent className="p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{inv.invitee_name || inv.invitee_cpf}</p>
                  <p className="text-xs text-muted-foreground truncate">CPF {inv.invitee_cpf} · {inv.invitee_email ?? "sem email"}</p>
                  <p className="text-xs text-muted-foreground truncate">{link}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={inv.status === "submitted" ? "default" : "secondary"}>{inv.status}</Badge>
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copiado"); }}><Copy className="h-3 w-3" /></Button>
                  {inv.invitee_email && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`mailto:${inv.invitee_email}?subject=${encodeURIComponent("Convite para questionário")}&body=${encodeURIComponent(link)}`}><Mail className="h-3 w-3" /></a>
                    </Button>
                  )}
                  {inv.status !== "submitted" && inv.status !== "revoked" && (
                    <Button size="sm" variant="ghost" onClick={() => revoke.mutate({ id: inv.id, assessment_id: assessmentId })}>Revogar</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo convite</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>CPF</Label><Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="00000000000" /></div>
            <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Email (opcional)</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              disabled={cpf.replace(/\D/g, "").length !== 11 || create.isPending}
              onClick={async () => {
                await create.mutateAsync({
                  assessment_id: assessmentId,
                  invitee_cpf: cpf,
                  invitee_name: name || undefined,
                  invitee_email: email || undefined,
                });
                setOpen(false); setCpf(""); setName(""); setEmail("");
              }}
            >Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResultsTab({ assessmentId }: { assessmentId: string }) {
  const { data: runs } = useRuns(assessmentId);
  if (!runs || runs.length === 0) {
    return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Nenhuma resposta ainda.</CardContent></Card>;
  }
  return (
    <div className="grid gap-2">
      {runs.map((r) => {
        const fraud = (r.tab_switch_count ?? 0) + (r.paste_attempt_count ?? 0) + (r.copy_attempt_count ?? 0);
        return (
          <Link key={r.id} to={`/assessments/runs/${r.id}`}>
            <Card className="hover:bg-accent/40 transition-colors">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{r.respondent_name || r.respondent_cpf}</p>
                  <p className="text-xs text-muted-foreground">
                    Iniciado em {new Date(r.started_at).toLocaleString()}
                    {r.submitted_at && ` · Enviado em ${new Date(r.submitted_at).toLocaleString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {fraud > 0 && <Badge variant="destructive">⚠ {fraud} sinais</Badge>}
                  <Badge variant={r.status === "submitted" ? "default" : "secondary"}>{r.status}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
