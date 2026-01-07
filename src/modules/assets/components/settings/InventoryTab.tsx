import { useState } from "react";
import { Package, Upload, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InventoryImportDialog } from "./InventoryImportDialog";

export function InventoryTab() {
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const handleDownloadTemplate = () => {
    const link = document.createElement("a");
    link.href = "/templates/inventory-import-template.csv";
    link.download = "inventory-import-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Importação de Inventário
        </CardTitle>
        <CardDescription>
          Importe itens de inventário em massa a partir de um arquivo CSV
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Instructions */}
        <div className="p-4 bg-muted rounded-lg space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Como importar
          </h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Baixe o template CSV clicando no botão abaixo</li>
            <li>Preencha os dados seguindo o modelo (primeira linha é cabeçalho)</li>
            <li>Salve o arquivo mantendo o formato CSV (UTF-8)</li>
            <li>Clique em "Importar CSV" e selecione o arquivo</li>
          </ol>
        </div>

        {/* Template Info */}
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="font-medium">Campos do Template</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-mono text-xs bg-muted px-1 rounded">internal_code</span>
              <span className="text-muted-foreground ml-2">Obrigatório</span>
            </div>
            <div>
              <span className="font-mono text-xs bg-muted px-1 rounded">name</span>
              <span className="text-muted-foreground ml-2">Obrigatório</span>
            </div>
            <div>
              <span className="font-mono text-xs bg-muted px-1 rounded">category</span>
              <span className="text-muted-foreground ml-2">Categoria pai</span>
            </div>
            <div>
              <span className="font-mono text-xs bg-muted px-1 rounded">subcategory</span>
              <span className="text-muted-foreground ml-2">Subcategoria</span>
            </div>
            <div>
              <span className="font-mono text-xs bg-muted px-1 rounded">description</span>
              <span className="text-muted-foreground ml-2">Descrição</span>
            </div>
            <div>
              <span className="font-mono text-xs bg-muted px-1 rounded">serial_number</span>
              <span className="text-muted-foreground ml-2">Nº série</span>
            </div>
            <div>
              <span className="font-mono text-xs bg-muted px-1 rounded">brand</span>
              <span className="text-muted-foreground ml-2">Marca</span>
            </div>
            <div>
              <span className="font-mono text-xs bg-muted px-1 rounded">model</span>
              <span className="text-muted-foreground ml-2">Modelo</span>
            </div>
            <div>
              <span className="font-mono text-xs bg-muted px-1 rounded">location</span>
              <span className="text-muted-foreground ml-2">Localização</span>
            </div>
            <div>
              <span className="font-mono text-xs bg-muted px-1 rounded">acquired_at</span>
              <span className="text-muted-foreground ml-2">YYYY-MM-DD</span>
            </div>
            <div>
              <span className="font-mono text-xs bg-muted px-1 rounded">acquisition_value</span>
              <span className="text-muted-foreground ml-2">Valor</span>
            </div>
            <div>
              <span className="font-mono text-xs bg-muted px-1 rounded">quantity</span>
              <span className="text-muted-foreground ml-2">Padrão: 1</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            * Categorias e localizações devem existir previamente no sistema
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Baixar Template
          </Button>
          <Button onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar CSV
          </Button>
        </div>
      </CardContent>

      <InventoryImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
    </Card>
  );
}
