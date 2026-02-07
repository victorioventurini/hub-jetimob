/**
 * PartnerContactImportDialog
 * 
 * Importador de contatos externos a partir de CSV.
 * Segue padrão do InventoryImportDialog.
 * 
 * TCR v2.46.0: partner_contacts é GLOBAL por email.
 * Usa partner_contact_bu_associations para vínculo com BU.
 */

import { useState, useRef } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2, X, Download } from "lucide-react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useIdentity } from "@/hooks/useIdentity";
import { useTicketCategories } from "../../hooks";

// CSV row schema
const csvRowSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  categories: z.string().optional(),
});

type CsvRow = z.infer<typeof csvRowSchema>;

interface ImportResult {
  totalRows: number;
  contactsCreated: number;
  contactsLinked: number;
  capabilitiesCreated: number;
  ignoredRows: Array<{ row: number; reason: string }>;
  warnings: Array<{ row: number; message: string }>;
}

interface PartnerContactImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
}

export function PartnerContactImportDialog({ 
  open, 
  onOpenChange, 
  companyId,
  companyName,
}: PartnerContactImportDialogProps) {
  const { currentBu } = useBu();
  const { realProfileId } = useIdentity();
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories for capability resolution
  const { data: categories = [] } = useTicketCategories("external");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        setError("Por favor, selecione um arquivo CSV");
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const parseCSV = (content: string): Array<Record<string, string>> => {
    const lines = content.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));

    return lines.slice(1).map((line) => {
      // Handle quoted values with commas inside
      const values: string[] = [];
      let current = "";
      let inQuotes = false;
      
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim().replace(/"/g, ""));
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/"/g, ""));

      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      return row;
    });
  };

  const normalizeEmail = (email: string): string => {
    return email.trim().toLowerCase();
  };

  const normalizeString = (str: string): string => {
    return str.trim().replace(/\s+/g, " ");
  };

  const parseCategories = (categoriesStr: string): Array<{ categoryName: string; subcategoryName: string | null }> => {
    if (!categoriesStr.trim()) return [];
    
    return categoriesStr.split(";").map((item) => {
      const trimmed = item.trim();
      if (trimmed.includes(">")) {
        const [catPart, subPart] = trimmed.split(">").map(s => s.trim());
        return { categoryName: catPart, subcategoryName: subPart || null };
      }
      return { categoryName: trimmed, subcategoryName: null };
    }).filter(item => item.categoryName);
  };

  const handleImport = async () => {
    if (!file || !currentBu || !realProfileId) return;

    setIsImporting(true);
    setProgress(0);
    setError(null);

    try {
      const content = await file.text();
      const rows = parseCSV(content);

      const importResult: ImportResult = {
        totalRows: rows.length,
        contactsCreated: 0,
        contactsLinked: 0,
        capabilitiesCreated: 0,
        ignoredRows: [],
        warnings: [],
      };

      // Build category maps for capability resolution
      const categoryMap = new Map<string, string>(); // name (lowercase) -> id
      const subcategoryMap = new Map<string, { id: string; categoryId: string }>(); // "catName:subName" -> { id, categoryId }

      categories.forEach((cat) => {
        categoryMap.set(cat.name.toLowerCase(), cat.id);
        cat.subcategories?.forEach((sub) => {
          subcategoryMap.set(`${cat.name.toLowerCase()}:${sub.name.toLowerCase()}`, {
            id: sub.id,
            categoryId: cat.id,
          });
        });
      });

      // Fetch existing contacts by email (global check)
      const emailsToCheck = rows.map((r) => normalizeEmail(r.email || "")).filter(Boolean);
      
      const { data: existingContacts } = await supabase
        .from("partner_contacts")
        .select("id, email")
        .in("email", emailsToCheck)
        .is("deleted_at", null);

      const existingContactsMap = new Map<string, string>();
      existingContacts?.forEach((c) => {
        existingContactsMap.set(c.email.toLowerCase(), c.id);
      });

      // Fetch existing BU associations for this BU
      const { data: existingAssociations } = await supabase
        .from("partner_contact_bu_associations")
        .select("partner_contact_id")
        .eq("bu_id", currentBu.id)
        .is("deleted_at", null);

      const existingAssociationsSet = new Set(existingAssociations?.map((a) => a.partner_contact_id));

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const rawRow = rows[i];
        setProgress(Math.round(((i + 1) / rows.length) * 100));

        const name = normalizeString(rawRow.name || "");
        const email = normalizeEmail(rawRow.email || "");
        const phone = normalizeString(rawRow.phone || "") || null;
        const status = (rawRow.status === "inactive" ? "inactive" : "active") as "active" | "inactive";
        const categoriesStr = rawRow.categories || "";

        // Validate required fields
        if (!name) {
          importResult.ignoredRows.push({
            row: i + 2,
            reason: "Nome vazio",
          });
          continue;
        }

        if (!email) {
          importResult.ignoredRows.push({
            row: i + 2,
            reason: "Email vazio",
          });
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          importResult.ignoredRows.push({
            row: i + 2,
            reason: `Email inválido: ${email}`,
          });
          continue;
        }

        let contactId: string;
        const existingContactId = existingContactsMap.get(email);

        if (existingContactId) {
          // Contact already exists globally
          contactId = existingContactId;
          
          // Check if already associated with this BU
          if (!existingAssociationsSet.has(existingContactId)) {
            // Create BU association
            const { error: assocError } = await supabase
              .from("partner_contact_bu_associations")
              .insert({
                partner_contact_id: existingContactId,
                bu_id: currentBu.id,
                is_active: true,
                created_by: realProfileId,
              });

            if (assocError) {
              importResult.warnings.push({
                row: i + 2,
                message: `Erro ao associar contato existente à BU: ${assocError.message}`,
              });
            } else {
              existingAssociationsSet.add(existingContactId);
              importResult.contactsLinked++;
              importResult.warnings.push({
                row: i + 2,
                message: `Contato já existente (${email}), associado à BU atual`,
              });
            }
          } else {
            importResult.warnings.push({
              row: i + 2,
              message: `Contato já existente e já associado à BU: ${email}`,
            });
          }
        } else {
          // Create new contact
          const { data: newContact, error: createError } = await supabase
            .from("partner_contacts")
            .insert({
              bu_id: currentBu.id, // DEPRECATED but kept for backward compat
              external_company_id: companyId,
              name,
              email,
              phone,
              status,
            })
            .select("id")
            .single();

          if (createError) {
            importResult.ignoredRows.push({
              row: i + 2,
              reason: `Erro ao criar contato: ${createError.message}`,
            });
            continue;
          }

          contactId = newContact.id;
          existingContactsMap.set(email, contactId);

          // Create BU association for new contact
          const { error: assocError } = await supabase
            .from("partner_contact_bu_associations")
            .insert({
              partner_contact_id: contactId,
              bu_id: currentBu.id,
              is_active: true,
              created_by: realProfileId,
            });

          if (assocError) {
            importResult.warnings.push({
              row: i + 2,
              message: `Contato criado mas erro na associação BU: ${assocError.message}`,
            });
          }

          existingAssociationsSet.add(contactId);
          importResult.contactsCreated++;
        }

        // Parse and create capabilities
        const parsedCategories = parseCategories(categoriesStr);
        
        for (const { categoryName, subcategoryName } of parsedCategories) {
          let categoryId: string | null = null;
          let subcategoryId: string | null = null;

          if (subcategoryName) {
            const subKey = `${categoryName.toLowerCase()}:${subcategoryName.toLowerCase()}`;
            const subInfo = subcategoryMap.get(subKey);
            if (subInfo) {
              categoryId = subInfo.categoryId;
              subcategoryId = subInfo.id;
            } else {
              importResult.warnings.push({
                row: i + 2,
                message: `Subcategoria '${subcategoryName}' não encontrada em '${categoryName}'`,
              });
              // Try to use parent category as generalist
              categoryId = categoryMap.get(categoryName.toLowerCase()) || null;
            }
          } else {
            categoryId = categoryMap.get(categoryName.toLowerCase()) || null;
            if (!categoryId) {
              importResult.warnings.push({
                row: i + 2,
                message: `Categoria '${categoryName}' não encontrada`,
              });
            }
          }

          if (categoryId) {
            const { error: capError } = await supabase
              .from("partner_contact_capabilities")
              .insert({
                bu_id: currentBu.id,
                external_company_id: companyId,
                contact_id: contactId,
                category_id: categoryId,
                subcategory_id: subcategoryId,
                created_by: realProfileId,
              });

            if (capError) {
              // May be duplicate, just warn
              if (!capError.message.includes("duplicate")) {
                importResult.warnings.push({
                  row: i + 2,
                  message: `Erro ao criar capacidade: ${capError.message}`,
                });
              }
            } else {
              importResult.capabilitiesCreated++;
            }
          }
        }
      }

      setResult(importResult);

      // Invalidate caches
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tickets.partnerContacts(currentBu?.id ?? null, companyId), 
        refetchType: 'active' 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tickets.contactCapabilitiesPrefix(), 
        refetchType: 'active' 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tickets.companyContactCapabilitiesPrefix(), 
        refetchType: 'active' 
      });

    } catch (err) {
      console.error("[PartnerContactImportDialog] Import error:", err);
      setError(err instanceof Error ? err.message : "Erro ao processar arquivo");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
    onOpenChange(false);
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement("a");
    link.href = "/templates/partner-contacts-import-template.csv";
    link.download = "partner-contacts-import-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Contatos</DialogTitle>
          <DialogDescription>
            Importe contatos para <strong>{companyName}</strong> a partir de um arquivo CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          {!result && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">Modelo de importação</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Baixar Template
              </Button>
            </div>
          )}

          {/* File Upload Area */}
          {!result && (
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Clique para selecionar ou arraste um arquivo CSV
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Colunas: name, email, phone, status, categories
              </p>
            </div>
          )}

          {/* Selected File */}
          {file && !result && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
              <span className="flex-1 text-sm truncate">{file.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Progress */}
          {isImporting && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Processando... {progress}%
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Result Summary */}
          {result && (
            <div className="space-y-4">
              <Alert className="border-status-green/30 bg-status-green-muted">
                <CheckCircle2 className="h-4 w-4 text-status-green" />
                <AlertTitle className="text-status-green-muted-foreground">Importação Concluída</AlertTitle>
                <AlertDescription className="text-status-green-muted-foreground/80">
                  {result.totalRows} linhas processadas
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-semibold text-success">{result.contactsCreated}</p>
                  <p className="text-xs text-muted-foreground">Criados</p>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-semibold text-primary">{result.contactsLinked}</p>
                  <p className="text-xs text-muted-foreground">Vinculados</p>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-semibold text-muted-foreground">{result.capabilitiesCreated}</p>
                  <p className="text-xs text-muted-foreground">Capacidades</p>
                </div>
              </div>

              {result.warnings.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    <span className="text-sm font-medium">
                      {result.warnings.length} aviso(s)
                    </span>
                  </div>
                  <ScrollArea className="h-24 rounded-md border p-2">
                    <div className="space-y-1">
                      {result.warnings.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="shrink-0">
                            Linha {item.row}
                          </Badge>
                          <span className="text-muted-foreground">{item.message}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {result.ignoredRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium">
                      {result.ignoredRows.length} linha(s) ignorada(s)
                    </span>
                  </div>
                  <ScrollArea className="h-24 rounded-md border p-2">
                    <div className="space-y-1">
                      {result.ignoredRows.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="shrink-0">
                            Linha {item.row}
                          </Badge>
                          <span className="text-muted-foreground">{item.reason}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {result ? (
            <Button onClick={handleClose}>Fechar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={!file || isImporting || !companyId}>
                {isImporting ? "Importando..." : "Importar"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
