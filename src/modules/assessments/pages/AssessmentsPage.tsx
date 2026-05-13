/**
 * AssessmentsPage — entrypoint /assessments com tabs (Provas, Formulários).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Plus, ClipboardList, FileText } from "lucide-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { useUrlTab } from "@/shared/url";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAssessments, useForms, useCreateAssessment, useCreateForm } from "../hooks/useAssessmentsData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";

export default function AssessmentsPage() {
  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Assessments"
          description="Provas e formulários com controle de tempo e anti-fraude"
          breadcrumbs={[{ label: "Assessments" }]}
        />
        <Tabs defaultValue="provas">
          <TabsList>
            <TabsTrigger value="provas"><ClipboardList className="h-4 w-4 mr-2" />Provas</TabsTrigger>
            <TabsTrigger value="forms"><FileText className="h-4 w-4 mr-2" />Formulários</TabsTrigger>
          </TabsList>
          <TabsContent value="provas" className="mt-6"><AssessmentsTab /></TabsContent>
          <TabsContent value="forms" className="mt-6"><FormsTab /></TabsContent>
        </Tabs>
      </div>
    </HubLayout>
  );
}

function AssessmentsTab() {
  const { data, isLoading } = useAssessments();
  const create = useCreateAssessment();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Nova prova</Button>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {!isLoading && (data?.length ?? 0) === 0 && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhuma prova ainda.</CardContent></Card>
      )}
      <div className="grid gap-3">
        {data?.map((a) => (
          <Link key={a.id} to={`/assessments/provas/${a.id}`}>
            <Card className="hover:bg-accent/40 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{a.title}</p>
                  {a.description && <p className="text-sm text-muted-foreground line-clamp-1">{a.description}</p>}
                </div>
                <Badge variant={a.status === "active" ? "default" : "secondary"}>{a.status}</Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova prova</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
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

function FormsTab() {
  const { data, isLoading } = useForms();
  const create = useCreateForm();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState(1);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Novo formulário</Button>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {!isLoading && (data?.length ?? 0) === 0 && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhum formulário ainda.</CardContent></Card>
      )}
      <div className="grid gap-3">
        {data?.map((f) => (
          <Link key={f.id} to={`/assessments/forms/${f.id}`}>
            <Card className="hover:bg-accent/40 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{f.title}</p>
                  <p className="text-xs text-muted-foreground">Nível {f.level}</p>
                </div>
                <Badge variant={f.status === "published" ? "default" : "secondary"}>{f.status}</Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo formulário</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><Label>Nível</Label><Input type="number" min={1} value={level} onChange={(e) => setLevel(Number(e.target.value) || 1)} /></div>
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
