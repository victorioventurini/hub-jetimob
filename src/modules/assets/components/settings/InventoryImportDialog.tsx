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

// CSV row schema
const csvRowSchema = z.object({
  internal_code: z.string().min(1, "Código interno é obrigatório"),
  name: z.string().min(1, "Nome é obrigatório"),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  description: z.string().optional(),
  serial_number: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  location: z.string().optional(),
  acquired_at: z.string().optional(),
  acquisition_value: z.string().optional(),
  quantity: z.string().optional(),
  work_email: z.string().optional(),
  notes: z.string().optional(),
});

type CsvRow = z.infer<typeof csvRowSchema>;

interface ImportResult {
  totalRows: number;
  itemsCreated: number;
  itemsSkipped: number;
  ignoredRows: Array<{ row: number; reason: string }>;
  warnings: Array<{ row: number; message: string }>;
}

interface InventoryImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InventoryImportDialog({ open, onOpenChange }: InventoryImportDialogProps) {
  const { currentBu } = useBu();
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const normalizeString = (str: string): string => {
    return str.trim().replace(/\s+/g, " ");
  };

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    // Try YYYY-MM-DD format
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [, year, month, day] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    // Try DD/MM/YYYY format
    const match2 = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match2) {
      const [, day, month, year] = match2;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    return null;
  };

  const parseNumber = (numStr: string): number | null => {
    if (!numStr) return null;
    const cleaned = numStr.replace(/[^\d.,]/g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  const handleImport = async () => {
    if (!file || !currentBu) return;

    setIsImporting(true);
    setProgress(0);
    setError(null);

    try {
      const content = await file.text();
      const rows = parseCSV(content);

      const importResult: ImportResult = {
        totalRows: rows.length,
        itemsCreated: 0,
        itemsSkipped: 0,
        ignoredRows: [],
        warnings: [],
      };

      // Fetch existing categories for this BU
      const { data: existingCategories } = await supabase
        .from("asset_categories")
        .select("id, name, parent_id")
        .eq("bu_id", currentBu.id)
        .is("deleted_at", null);

      // Build category maps
      const parentCategoriesMap = new Map<string, string>(); // name (lowercase) -> id
      const subcategoriesMap = new Map<string, string>(); // "parentName:subcatName" (lowercase) -> id

      existingCategories?.forEach((cat) => {
        if (!cat.parent_id) {
          parentCategoriesMap.set(cat.name.toLowerCase(), cat.id);
        }
      });

      existingCategories?.forEach((cat) => {
        if (cat.parent_id) {
          const parentCat = existingCategories.find(c => c.id === cat.parent_id);
          if (parentCat) {
            subcategoriesMap.set(`${parentCat.name.toLowerCase()}:${cat.name.toLowerCase()}`, cat.id);
          }
        }
      });

      // Fetch existing locations for this BU
      const { data: existingLocations } = await supabase
        .from("bu_locations")
        .select("id, name")
        .eq("bu_id", currentBu.id)
        .is("deleted_at", null);

      const locationsMap = new Map<string, string>(); // name (lowercase) -> id
      existingLocations?.forEach((loc) => {
        locationsMap.set(loc.name.toLowerCase(), loc.id);
      });

      // Fetch existing users (profiles) for this BU using canonical view
      const { data: existingUsers } = await supabase
        .from("v_bu_active_profiles")
        .select("id, work_email")
        .eq("bu_id", currentBu.id);

      const usersMap = new Map<string, string>(); // email (lowercase) -> id
      existingUsers?.forEach((user) => {
        if (user.work_email) {
          usersMap.set(user.work_email.toLowerCase(), user.id);
        }
      });

      // Fetch existing inventory codes
      const { data: existingInventory } = await supabase
        .from("asset_inventory")
        .select("internal_code")
        .eq("bu_id", currentBu.id)
        .is("deleted_at", null);

      const existingCodes = new Set(existingInventory?.map((i) => i.internal_code.toLowerCase()));

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const rawRow = rows[i];
        setProgress(Math.round(((i + 1) / rows.length) * 100));

        // Validate required fields
        const internalCode = normalizeString(rawRow.internal_code || "");
        const name = normalizeString(rawRow.name || "");

        if (!internalCode) {
          importResult.ignoredRows.push({
            row: i + 2,
            reason: "Código interno vazio",
          });
          continue;
        }

        if (!name) {
          importResult.ignoredRows.push({
            row: i + 2,
            reason: "Nome vazio",
          });
          continue;
        }

        // Check for duplicate code
        if (existingCodes.has(internalCode.toLowerCase())) {
          importResult.itemsSkipped++;
          importResult.ignoredRows.push({
            row: i + 2,
            reason: `Código '${internalCode}' já existe`,
          });
          continue;
        }

        // Resolve category_id
        let categoryId: string | null = null;
        const categoryName = normalizeString(rawRow.category || "");
        const subcategoryName = normalizeString(rawRow.subcategory || "");

        if (subcategoryName && categoryName) {
          const subcatKey = `${categoryName.toLowerCase()}:${subcategoryName.toLowerCase()}`;
          categoryId = subcategoriesMap.get(subcatKey) || null;
          if (!categoryId) {
            importResult.warnings.push({
              row: i + 2,
              message: `Subcategoria '${subcategoryName}' não encontrada em '${categoryName}'`,
            });
            // Try to use parent category
            categoryId = parentCategoriesMap.get(categoryName.toLowerCase()) || null;
          }
        } else if (categoryName) {
          categoryId = parentCategoriesMap.get(categoryName.toLowerCase()) || null;
          if (!categoryId) {
            importResult.warnings.push({
              row: i + 2,
              message: `Categoria '${categoryName}' não encontrada`,
            });
          }
        }

        // Resolve location_id
        let locationId: string | null = null;
        const locationName = normalizeString(rawRow.location || "");
        if (locationName) {
          locationId = locationsMap.get(locationName.toLowerCase()) || null;
          if (!locationId) {
            importResult.warnings.push({
              row: i + 2,
              message: `Localização '${locationName}' não encontrada`,
            });
          }
        }

        // Resolve assigned user by work_email
        let assignedUserId: string | null = null;
        const workEmail = normalizeString(rawRow.work_email || "");
        if (workEmail) {
          assignedUserId = usersMap.get(workEmail.toLowerCase()) || null;
          if (!assignedUserId) {
            importResult.warnings.push({
              row: i + 2,
              message: `Usuário com email '${workEmail}' não encontrado na BU`,
            });
          }
        }

        // Parse dates and numbers
        const acquiredAt = parseDate(rawRow.acquired_at || "");
        if (rawRow.acquired_at && !acquiredAt) {
          importResult.warnings.push({
            row: i + 2,
            message: `Data de aquisição inválida: '${rawRow.acquired_at}'`,
          });
        }

        const acquisitionValue = parseNumber(rawRow.acquisition_value || "");
        if (rawRow.acquisition_value && acquisitionValue === null) {
          importResult.warnings.push({
            row: i + 2,
            message: `Valor de aquisição inválido: '${rawRow.acquisition_value}'`,
          });
        }

        const quantity = parseNumber(rawRow.quantity || "") || 1;

        // Determine holder type and status based on assignment
        const holderType = assignedUserId ? "user" as const : "location" as const;
        const status = assignedUserId ? "loaned" as const : "available" as const;

        // Insert into database
        const { error: insertError } = await supabase.from("asset_inventory").insert([{
          bu_id: currentBu.id,
          internal_code: internalCode,
          name: name,
          description: normalizeString(rawRow.description || "") || null,
          serial_number: normalizeString(rawRow.serial_number || "") || null,
          brand: normalizeString(rawRow.brand || "") || null,
          model: normalizeString(rawRow.model || "") || null,
          category_id: categoryId,
          home_location_id: locationId,
          current_location_id: assignedUserId ? null : locationId,
          current_user_id: assignedUserId,
          assigned_at: assignedUserId ? new Date().toISOString() : null,
          acquired_at: acquiredAt,
          acquisition_value: acquisitionValue,
          quantity_total: quantity,
          quantity_available: quantity,
          notes: normalizeString(rawRow.notes || "") || null,
          status: status,
          current_holder_type: holderType,
        }]);

        if (insertError) {
          importResult.ignoredRows.push({
            row: i + 2,
            reason: `Erro ao inserir: ${insertError.message}`,
          });
          continue;
        }

        // Mark code as used
        existingCodes.add(internalCode.toLowerCase());
        importResult.itemsCreated++;
      }

      setResult(importResult);

      // Invalidate cache to refresh the list
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.inventory.all(currentBu?.id ?? null), refetchType: 'active' });

    } catch (err) {
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
    link.href = "/templates/inventory-import-template.csv";
    link.download = "inventory-import-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Inventário</DialogTitle>
          <DialogDescription>
            Importe itens de inventário a partir de um arquivo CSV.
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
                Colunas: internal_code, name, category, subcategory, ...
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
                  <p className="text-2xl font-semibold text-success">{result.itemsCreated}</p>
                  <p className="text-xs text-muted-foreground">Criados</p>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-semibold text-warning">{result.itemsSkipped}</p>
                  <p className="text-xs text-muted-foreground">Duplicados</p>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-semibold text-destructive">{result.ignoredRows.length - result.itemsSkipped}</p>
                  <p className="text-xs text-muted-foreground">Erros</p>
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
              <Button onClick={handleImport} disabled={!file || isImporting}>
                {isImporting ? "Importando..." : "Importar"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
