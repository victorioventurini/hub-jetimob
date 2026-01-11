import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { DiscardChangesDialog } from "@/components/ui/discard-changes-dialog";
import { 
  AlertCircle, 
  Check, 
  ChevronRight, 
  Copy, 
  FileText, 
  Inbox, 
  Loader2, 
  Plus,
  Search,
  Settings,
  Trash2,
  User,
  X
} from "lucide-react";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

// Component usage data - manually curated for accuracy
const componentUsageData: Record<string, { description: string; pages: string[] }> = {
  // Buttons & Actions
  "Button": {
    description: "Botão padrão para ações primárias e secundárias",
    pages: ["/auth", "/hub", "/okrs", "/assets", "/tickets", "/teams", "/users", "/settings/*"]
  },
  "Badge": {
    description: "Indicador visual para status, categorias e tags",
    pages: ["/okrs/*", "/assets/*", "/tickets/*", "/teams/*", "/hub/*"]
  },
  "Switch": {
    description: "Toggle para estados on/off",
    pages: ["/hub/integrations", "/hub/modules", "/settings/*", "/okrs/settings"]
  },
  "Checkbox": {
    description: "Seleção múltipla de opções",
    pages: ["/tickets/settings", "/okrs/create", "/users", "/hub/permissions"]
  },
  
  // Forms & Inputs
  "Input": {
    description: "Campo de entrada de texto padrão",
    pages: ["/auth", "/profile", "/users/*", "/teams/*", "/assets/*", "/tickets/*"]
  },
  "Label": {
    description: "Rótulo para campos de formulário",
    pages: ["/auth", "/profile", "/teams/*", "/assets/*", "/tickets/*", "/okrs/*"]
  },
  
  // Layout & Structure
  "Card": {
    description: "Container para agrupar conteúdo relacionado",
    pages: ["/*"] // Used everywhere
  },
  "Separator": {
    description: "Divisor visual entre seções",
    pages: ["/hub/*", "/settings/*", "/okrs/*", "/profile"]
  },
  "ScrollArea": {
    description: "Container com scroll customizado",
    pages: ["/okrs/*", "/tickets/*", "/assets/inventory", "/hub/*"]
  },
  "Tabs": {
    description: "Navegação entre seções de conteúdo",
    pages: ["/hub/*", "/okrs/settings", "/assets/settings", "/tickets/settings", "/teams/*"]
  },
  
  // Feedback & Status
  "Alert": {
    description: "Mensagem de alerta/informação contextual",
    pages: ["/auth", "/hub/*", "/okrs/*", "/assets/*"]
  },
  "Progress": {
    description: "Barra de progresso para indicar percentual",
    pages: ["/okrs/*", "/assets/*", "/teams/*"]
  },
  "Skeleton": {
    description: "Placeholder de loading para conteúdo",
    pages: ["/*"] // Used everywhere for loading states
  },
  "StatusBadge": {
    description: "Badge especializado para status (on_track, at_risk, etc)",
    pages: ["/okrs/*", "/tickets/*", "/assets/*"]
  },
  
  // Display
  "Avatar": {
    description: "Exibição de foto/iniciais de usuário",
    pages: ["/users/*", "/teams/*", "/okrs/*", "/tickets/*", "/profile", "/hub"]
  },
  "Table": {
    description: "Exibição de dados tabulares",
    pages: ["/users", "/hub/*", "/assets/*", "/tickets/*", "/okrs/*"]
  },
  
  // States
  "EmptyState": {
    description: "Estado vazio com ícone, mensagem e ação",
    pages: ["/okrs/*", "/assets/*", "/tickets/*", "/teams/*"]
  },
  "LoadingState": {
    description: "Estado de carregamento padronizado",
    pages: ["/okrs/*", "/assets/*", "/tickets/*", "/teams/*"]
  },
  "ErrorState": {
    description: "Estado de erro com retry",
    pages: ["/okrs/*", "/assets/*", "/tickets/*"]
  },
  
  // Dialogs & Overlays
  "DeleteConfirmDialog": {
    description: "Diálogo de confirmação para exclusão",
    pages: ["/assets/*", "/teams/*", "/okrs/*", "/hub/*"]
  },
  "DiscardChangesDialog": {
    description: "Diálogo para confirmar descarte de alterações",
    pages: ["/okrs/create", "/assets/*", "/teams/*"]
  },
  
  // Navigation & Headers
  "PageHeader": {
    description: "Cabeçalho de página com título, descrição e ações",
    pages: ["/*"] // Used on most pages
  },
  "HelpTooltip": {
    description: "Ícone de ajuda com tooltip explicativo",
    pages: ["/okrs/*", "/hub/*", "/settings/*"]
  },
};

interface ComponentShowcaseProps {
  name: string;
  description: string;
  pages: string[];
  children: React.ReactNode;
}

function ComponentShowcase({ name, description, pages, children }: ComponentShowcaseProps) {
  const [copied, setCopied] = useState(false);

  const copyImport = () => {
    const importPath = name === "StatusBadge" || name === "EmptyState" || name === "LoadingState" || name === "ErrorState" || name === "PageHeader" || name === "HelpTooltip" || name === "DeleteConfirmDialog" || name === "DiscardChangesDialog"
      ? `import { ${name} } from "@/components/ui/${name.replace(/([A-Z])/g, '-$1').toLowerCase().slice(1)}";`
      : `import { ${name} } from "@/components/ui/${name.toLowerCase()}";`;
    
    navigator.clipboard.writeText(importPath);
    setCopied(true);
    toast.success("Import copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-mono">{name}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={copyImport}
            className="h-8 w-8"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Component Preview */}
        <div className="p-4 bg-muted/30 rounded-lg border border-dashed">
          {children}
        </div>
        
        {/* Usage Table */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Páginas que utilizam:</p>
          <div className="flex flex-wrap gap-1">
            {pages.map((page) => (
              <Badge key={page} variant="secondary" className="text-xs font-mono">
                {page}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const CATEGORIES = [
  { id: "buttons", label: "Buttons & Actions", icon: <Settings className="h-4 w-4" /> },
  { id: "forms", label: "Forms & Inputs", icon: <FileText className="h-4 w-4" /> },
  { id: "layout", label: "Layout & Structure", icon: <ChevronRight className="h-4 w-4" /> },
  { id: "feedback", label: "Feedback & Status", icon: <AlertCircle className="h-4 w-4" /> },
  { id: "display", label: "Display", icon: <User className="h-4 w-4" /> },
  { id: "states", label: "States", icon: <Inbox className="h-4 w-4" /> },
  { id: "dialogs", label: "Dialogs & Overlays", icon: <X className="h-4 w-4" /> },
  { id: "navigation", label: "Navigation & Headers", icon: <Search className="h-4 w-4" /> },
];

export default function SettingsUiCatalog() {
  usePageTitle("Catálogo de UI", { skipBu: true });
  const [search, setSearch] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo de Componentes UI"
        description="Visualize todos os componentes de interface disponíveis no Hub e onde são utilizados"
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar componente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="outline" className="text-muted-foreground">
          {Object.keys(componentUsageData).length} componentes
        </Badge>
      </div>

      <Tabs defaultValue="buttons" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
          {CATEGORIES.map((cat) => (
            <TabsTrigger
              key={cat.id}
              value={cat.id}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {cat.icon}
              <span className="ml-2">{cat.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Buttons & Actions */}
        <TabsContent value="buttons" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ComponentShowcase {...componentUsageData["Button"]} name="Button">
              <div className="flex flex-wrap gap-2">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading</Button>
              </div>
            </ComponentShowcase>

            <ComponentShowcase {...componentUsageData["Badge"]} name="Badge">
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
            </ComponentShowcase>

            <ComponentShowcase {...componentUsageData["Switch"]} name="Switch">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch id="switch-1" />
                  <Label htmlFor="switch-1">Off</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="switch-2" defaultChecked />
                  <Label htmlFor="switch-2">On</Label>
                </div>
              </div>
            </ComponentShowcase>

            <ComponentShowcase {...componentUsageData["Checkbox"]} name="Checkbox">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox id="check-1" />
                  <Label htmlFor="check-1">Unchecked</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="check-2" defaultChecked />
                  <Label htmlFor="check-2">Checked</Label>
                </div>
              </div>
            </ComponentShowcase>
          </div>
        </TabsContent>

        {/* Forms & Inputs */}
        <TabsContent value="forms" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ComponentShowcase {...componentUsageData["Input"]} name="Input">
              <div className="space-y-2">
                <Input placeholder="Digite algo..." />
                <Input disabled placeholder="Desabilitado" />
              </div>
            </ComponentShowcase>

            <ComponentShowcase {...componentUsageData["Label"]} name="Label">
              <div className="space-y-2">
                <Label htmlFor="demo-input">Email</Label>
                <Input id="demo-input" type="email" placeholder="exemplo@email.com" />
              </div>
            </ComponentShowcase>
          </div>
        </TabsContent>

        {/* Layout & Structure */}
        <TabsContent value="layout" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ComponentShowcase {...componentUsageData["Card"]} name="Card">
              <Card>
                <CardHeader>
                  <CardTitle>Card Title</CardTitle>
                  <CardDescription>Card description goes here</CardDescription>
                </CardHeader>
                <CardContent>Card content</CardContent>
              </Card>
            </ComponentShowcase>

            <ComponentShowcase {...componentUsageData["Separator"]} name="Separator">
              <div className="space-y-2">
                <p className="text-sm">Seção 1</p>
                <Separator />
                <p className="text-sm">Seção 2</p>
                <Separator />
                <p className="text-sm">Seção 3</p>
              </div>
            </ComponentShowcase>

            <ComponentShowcase {...componentUsageData["Tabs"]} name="Tabs">
              <Tabs defaultValue="tab1" className="w-full">
                <TabsList>
                  <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                  <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                </TabsList>
                <TabsContent value="tab1" className="p-2">Conteúdo da Tab 1</TabsContent>
                <TabsContent value="tab2" className="p-2">Conteúdo da Tab 2</TabsContent>
              </Tabs>
            </ComponentShowcase>

            <ComponentShowcase {...componentUsageData["ScrollArea"]} name="ScrollArea">
              <ScrollArea className="h-24 w-full rounded border p-2">
                <div className="space-y-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <p key={i} className="text-sm">Item {i + 1}</p>
                  ))}
                </div>
              </ScrollArea>
            </ComponentShowcase>
          </div>
        </TabsContent>

        {/* Feedback & Status */}
        <TabsContent value="feedback" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ComponentShowcase {...componentUsageData["Alert"]} name="Alert">
              <div className="space-y-2">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Informação</AlertTitle>
                  <AlertDescription>Esta é uma mensagem informativa.</AlertDescription>
                </Alert>
              </div>
            </ComponentShowcase>

            <ComponentShowcase {...componentUsageData["Progress"]} name="Progress">
              <div className="space-y-3">
                <Progress value={25} />
                <Progress value={50} />
                <Progress value={75} />
              </div>
            </ComponentShowcase>

            <ComponentShowcase {...componentUsageData["Skeleton"]} name="Skeleton">
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </div>
            </ComponentShowcase>

            <ComponentShowcase {...componentUsageData["StatusBadge"]} name="StatusBadge">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status="on_track" />
                <StatusBadge status="at_risk" />
                <StatusBadge status="off_track" />
                <StatusBadge status="not_started" />
                <StatusBadge status="active" />
                <StatusBadge status="completed" />
              </div>
            </ComponentShowcase>
          </div>
        </TabsContent>

        {/* Display */}
        <TabsContent value="display" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ComponentShowcase {...componentUsageData["Avatar"]} name="Avatar">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="text-lg">AB</AvatarFallback>
                </Avatar>
              </div>
            </ComponentShowcase>

            <ComponentShowcase {...componentUsageData["Table"]} name="Table">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Item 1</TableCell>
                    <TableCell><Badge>Ativo</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Item 2</TableCell>
                    <TableCell><Badge variant="secondary">Pendente</Badge></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </ComponentShowcase>
          </div>
        </TabsContent>

        {/* States */}
        <TabsContent value="states" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ComponentShowcase {...componentUsageData["EmptyState"]} name="EmptyState">
              <EmptyState
                icon={Inbox}
                title="Nenhum item"
                description="Não há itens para exibir no momento."
                actionLabel="Adicionar"
                onAction={() => toast.info("Ação clicada!")}
              />
            </ComponentShowcase>

            <ComponentShowcase {...componentUsageData["LoadingState"]} name="LoadingState">
              <LoadingState text="Carregando dados..." />
            </ComponentShowcase>

            <ComponentShowcase {...componentUsageData["ErrorState"]} name="ErrorState">
              <ErrorState
                title="Erro ao carregar"
                description="Não foi possível carregar os dados."
                onRetry={() => toast.info("Retry clicado!")}
              />
            </ComponentShowcase>
          </div>
        </TabsContent>

        {/* Dialogs & Overlays */}
        <TabsContent value="dialogs" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ComponentShowcase {...componentUsageData["DeleteConfirmDialog"]} name="DeleteConfirmDialog">
              <div className="space-y-2">
                <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Abrir Delete Dialog
                </Button>
                <DeleteConfirmDialog
                  open={showDeleteDialog}
                  onOpenChange={setShowDeleteDialog}
                  onConfirm={() => {
                    toast.success("Deletado!");
                    setShowDeleteDialog(false);
                  }}
                  title="Confirmar exclusão"
                  description="Tem certeza que deseja excluir este item?"
                />
              </div>
            </ComponentShowcase>

            <ComponentShowcase {...componentUsageData["DiscardChangesDialog"]} name="DiscardChangesDialog">
              <div className="space-y-2">
                <Button variant="outline" onClick={() => setShowDiscardDialog(true)}>
                  Abrir Discard Dialog
                </Button>
                <DiscardChangesDialog
                  open={showDiscardDialog}
                  onOpenChange={setShowDiscardDialog}
                  onContinueEditing={() => setShowDiscardDialog(false)}
                  onDiscardAndExit={() => {
                    toast.info("Alterações descartadas");
                    setShowDiscardDialog(false);
                  }}
                />
              </div>
            </ComponentShowcase>
          </div>
        </TabsContent>

        {/* Navigation & Headers */}
        <TabsContent value="navigation" className="space-y-4">
          <div className="grid gap-4">
            <ComponentShowcase {...componentUsageData["PageHeader"]} name="PageHeader">
              <PageHeader
                title="Título da Página"
                description="Descrição detalhada do que esta página faz"
                actions={
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Ação
                  </Button>
                }
              />
            </ComponentShowcase>

            <ComponentShowcase {...componentUsageData["HelpTooltip"]} name="HelpTooltip">
              <div className="flex items-center gap-2">
                <span className="text-sm">Campo com ajuda</span>
                <HelpTooltip content="Esta é uma explicação detalhada sobre este campo e como ele deve ser preenchido." />
              </div>
            </ComponentShowcase>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
