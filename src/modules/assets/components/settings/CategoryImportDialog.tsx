import { useState, useRef } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2, X } from "lucide-react";
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
  category_name: z.string().min(1, "Nome da categoria é obrigatório"),
  subcategory_name: z.string().min(1, "Nome da subcategoria é obrigatório"),
  status: z.enum(["active", "inactive"]).default("active"),
});

type CsvRow = z.infer<typeof csvRowSchema>;

interface ImportResult {
  totalRows: number;
  categoriesCreated: number;
  categoriesReused: number;
  subcategoriesCreated: number;
  subcategoriesReused: number;
  ignoredRows: Array<{ row: number; reason: string }>;
}

interface CategoryImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryImportDialog({ open, onOpenChange }: CategoryImportDialogProps) {
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
      const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
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
        categoriesCreated: 0,
        categoriesReused: 0,
        subcategoriesCreated: 0,
        subcategoriesReused: 0,
        ignoredRows: [],
      };

      // Fetch existing categories for this BU
      const { data: existingCategories } = await supabase
        .from("asset_categories")
        .select("id, name, parent_id")
        .eq("bu_id", currentBu.id)
        .is("deleted_at", null);

      const categoriesMap = new Map<string, string>(); // name (lowercase) -> id
      const subcategoriesMap = new Map<string, string>(); // "categoryId:name" (lowercase) -> id

      existingCategories?.forEach((cat) => {
        if (!cat.parent_id) {
          categoriesMap.set(cat.name.toLowerCase(), cat.id);
        } else {
          subcategoriesMap.set(`${cat.parent_id}:${cat.name.toLowerCase()}`, cat.id);
        }
      });

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const rawRow = rows[i];
        setProgress(Math.round(((i + 1) / rows.length) * 100));

        // Validate row
        const categoryName = normalizeString(rawRow.category_name || "");
        const subcategoryName = normalizeString(rawRow.subcategory_name || "");
        const status = (rawRow.status || "active").toLowerCase();

        if (!categoryName) {
          importResult.ignoredRows.push({
            row: i + 2,
            reason: "Nome da categoria vazio",
          });
          continue;
        }

        if (!subcategoryName) {
          importResult.ignoredRows.push({
            row: i + 2,
            reason: "Nome da subcategoria vazio",
          });
          continue;
        }

        if (status !== "active" && status !== "inactive") {
          importResult.ignoredRows.push({
            row: i + 2,
            reason: `Status inválido: ${status}`,
          });
          continue;
        }

        // Get or create category
        let categoryId = categoriesMap.get(categoryName.toLowerCase());
        
        if (!categoryId) {
          // Create category
          const { data: newCategory, error: catError } = await supabase
            .from("asset_categories")
            .insert({
              bu_id: currentBu.id,
              name: categoryName,
              parent_id: null,
              status: status,
            })
            .select("id")
            .single();

          if (catError) {
            importResult.ignoredRows.push({
              row: i + 2,
              reason: `Erro ao criar categoria: ${catError.message}`,
            });
            continue;
          }

          categoryId = newCategory.id;
          categoriesMap.set(categoryName.toLowerCase(), categoryId);
          importResult.categoriesCreated++;
        } else {
          importResult.categoriesReused++;
        }

        // Get or create subcategory
        const subcatKey = `${categoryId}:${subcategoryName.toLowerCase()}`;
        let subcategoryId = subcategoriesMap.get(subcatKey);

        if (!subcategoryId) {
          // Create subcategory
          const { data: newSubcat, error: subcatError } = await supabase
            .from("asset_categories")
            .insert({
              bu_id: currentBu.id,
              name: subcategoryName,
              parent_id: categoryId,
              status: status,
            })
            .select("id")
            .single();

          if (subcatError) {
            importResult.ignoredRows.push({
              row: i + 2,
              reason: `Erro ao criar subcategoria: ${subcatError.message}`,
            });
            continue;
          }

          subcategoriesMap.set(subcatKey, newSubcat.id);
          importResult.subcategoriesCreated++;
        } else {
          importResult.subcategoriesReused++;
        }
      }

      setResult(importResult);
      
      // Invalidate cache to refresh the list
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.categories(currentBu?.id ?? null) });
      
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Categorias e Subcategorias</DialogTitle>
          <DialogDescription>
            Importe categorias e subcategorias a partir de um arquivo CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
                Colunas: category_name, subcategory_name, status
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

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Categorias Criadas</p>
                  <p className="text-2xl font-semibold">{result.categoriesCreated}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Categorias Reutilizadas</p>
                  <p className="text-2xl font-semibold">{result.categoriesReused}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Subcategorias Criadas</p>
                  <p className="text-2xl font-semibold">{result.subcategoriesCreated}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Subcategorias Reutilizadas</p>
                  <p className="text-2xl font-semibold">{result.subcategoriesReused}</p>
                </div>
              </div>

              {result.ignoredRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">
                      {result.ignoredRows.length} linha(s) ignorada(s)
                    </span>
                  </div>
                  <ScrollArea className="h-32 rounded-md border p-2">
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
