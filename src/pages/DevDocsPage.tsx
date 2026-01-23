import { useState } from "react";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  BookOpen, 
  Shield, 
  Database, 
  FileCode, 
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Copy,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// =====================================================
// PRE-CHECKLIST ITEMS
// =====================================================

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  docLink?: string;
  critical?: boolean;
}

const PRE_IMPLEMENTATION_CHECKLIST: ChecklistItem[] = [
  {
    id: "tcr",
    label: "Consultar TECHNICAL_CONTEXT_REGISTRY.md",
    description: "Verificar arquitetura, padrões ativos e versão atual do sistema",
    docLink: "/docs/TECHNICAL_CONTEXT_REGISTRY.md",
    critical: true,
  },
  {
    id: "identity",
    label: "Verificar IDENTITY_CONVENTION.md",
    description: "Se envolver usuários/perfis, verificar se coluna usa profiles.id ou auth.users.id",
    docLink: "/docs/IDENTITY_CONVENTION.md",
    critical: true,
  },
  {
    id: "cheatsheet",
    label: "Consultar IDENTITY_CHEAT_SHEET.md",
    description: "Lista rápida de colunas legadas e JOINs corretos",
    docLink: "/docs/IDENTITY_CHEAT_SHEET.md",
    critical: true,
  },
  {
    id: "permissions",
    label: "Verificar PERMISSIONS_AND_RBAC_MODEL.md",
    description: "Se envolver permissões, usar permission keys (nunca hardcode roles)",
    docLink: "/docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md",
  },
  {
    id: "data_model",
    label: "Consultar DATA_MODEL_REGISTRY.md",
    description: "Nunca inventar nomes de tabela/view/função. Usar exclusivamente o registry.",
    docLink: "/docs/canonical/DATA_MODEL_REGISTRY.md",
    critical: true,
  },
  {
    id: "dev_standards",
    label: "Revisar DEVELOPMENT_STANDARDS.md",
    description: "PRE-BU/POST-BU, Query Keys, URL State, limites de código",
    docLink: "/docs/canonical/DEVELOPMENT_STANDARDS.md",
  },
  {
    id: "existing_impl",
    label: "Buscar implementação similar",
    description: "Antes de criar novo, verificar se já existe hook/componente no codebase",
  },
];

// =====================================================
// QUICK REFERENCE - LEGACY COLUMNS
// =====================================================

const LEGACY_COLUMNS = [
  { table: "ticket_participants", column: "profile_id ✅", stores: "profiles.id", join: "ON p.id = tp.profile_id" },
  { table: "tickets", column: "owner_user_id", stores: "profiles.id", join: "ON p.id = t.owner_user_id" },
  { table: "okr_checkins", column: "user_id", stores: "profiles.id", join: "ON p.id = c.user_id" },
  { table: "teams", column: "leader_user_id", stores: "profiles.id", join: "ON p.id = t.leader_user_id" },
  { table: "asset_inventory", column: "current_user_id", stores: "profiles.id", join: "ON p.id = a.current_user_id" },
];

const AUTH_COLUMNS = [
  { table: "bu_user_memberships", column: "user_id", stores: "auth.users.id" },
  { table: "notifications", column: "user_id", stores: "auth.users.id" },
  { table: "partner_contacts", column: "user_id", stores: "auth.users.id" },
];

// =====================================================
// COMPONENT
// =====================================================

export default function DevDocsPage() {
  const { toast } = useToast();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const resetChecklist = () => {
    setCheckedItems(new Set());
    toast({ title: "Checklist resetado" });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  const completedCount = checkedItems.size;
  const totalCount = PRE_IMPLEMENTATION_CHECKLIST.length;
  const allCompleted = completedCount === totalCount;

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Dev Docs & Checklist"
          description="Pre-checklist obrigatório e referência rápida para desenvolvimento"
        />

        {/* Pre-Implementation Checklist */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Pre-Implementation Checklist
              </CardTitle>
              <CardDescription>
                Complete ANTES de qualquer implementação
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={allCompleted ? "default" : "secondary"}>
                {completedCount}/{totalCount}
              </Badge>
              <Button variant="ghost" size="sm" onClick={resetChecklist}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {PRE_IMPLEMENTATION_CHECKLIST.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  checkedItems.has(item.id)
                    ? "bg-success/10 border-success/30"
                    : item.critical
                    ? "bg-destructive/5 border-destructive/20"
                    : "bg-muted/30"
                }`}
              >
                <Checkbox
                  id={item.id}
                  checked={checkedItems.has(item.id)}
                  onCheckedChange={() => toggleItem(item.id)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <label
                    htmlFor={item.id}
                    className="flex items-center gap-2 font-medium cursor-pointer"
                  >
                    {checkedItems.has(item.id) ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : item.critical ? (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    ) : null}
                    {item.label}
                    {item.critical && !checkedItems.has(item.id) && (
                      <Badge variant="destructive" className="text-xs">CRÍTICO</Badge>
                    )}
                  </label>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                {item.docLink && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={item.docLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Reference Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Legacy Columns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Colunas Legadas (profiles.id)
              </CardTitle>
              <CardDescription>
                Têm nome "user_id" mas armazenam profiles.id
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {LEGACY_COLUMNS.map((col, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-destructive/5 rounded text-sm"
                  >
                    <code className="text-destructive">
                      {col.table}.{col.column}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(col.join)}
                      title="Copiar JOIN correto"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Auth Columns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-success">
                <Database className="h-5 w-5" />
                Colunas auth.users.id
              </CardTitle>
              <CardDescription>
                Estas realmente armazenam auth.users.id
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {AUTH_COLUMNS.map((col, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-success/5 rounded text-sm"
                  >
                    <code className="text-success">
                      {col.table}.{col.column}
                    </code>
                    <Badge variant="outline" className="text-xs">
                      {col.stores}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SQL Functions Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              Funções SQL Canônicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-3 bg-muted rounded-lg">
                <code className="text-sm font-mono text-primary">auth.uid()</code>
                <p className="text-xs text-muted-foreground mt-1">
                  Retorna auth.users.id da sessão
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg border-2 border-primary/30">
                <code className="text-sm font-mono text-primary">my_profile_id()</code>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>USE PARA COLUNAS LEGADAS</strong>
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <code className="text-sm font-mono text-primary">get_user_partner_contact_id()</code>
                <p className="text-xs text-muted-foreground mt-1">
                  Retorna partner_contact.id do auth.uid()
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audit Commands */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Scripts de Auditoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { cmd: "npx tsx scripts/audit-identity-convention.ts", desc: "Violações de identity" },
                { cmd: "npx tsx scripts/audit-querykeys.ts", desc: "QueryKeys hardcoded" },
                { cmd: "npx tsx scripts/audit-overfetch.ts", desc: "select('*') e sem paginação" },
                { cmd: "npx tsx scripts/run-compliance-checks.ts", desc: "Todos os audits" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 bg-muted rounded"
                >
                  <div>
                    <code className="text-sm font-mono">{item.cmd}</code>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(item.cmd)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Separator />

        <p className="text-sm text-muted-foreground text-center">
          Última atualização: 2026-01-21 | TCR v2.49.0
        </p>
      </div>
    </HubLayout>
  );
}
