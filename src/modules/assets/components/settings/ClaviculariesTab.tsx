import { useState } from "react";
import { Plus, Key, Trash2, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-state";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useKeys } from "../../hooks/useKeys";
import { ClavicularyDialog } from "../keys/ClavicularyDialog";
import type { AssetClaviculary } from "../../types";

export function ClaviculariesTab() {
  const { clavicularies, isLoading } = useKeys();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClaviculary, setEditingClaviculary] = useState<AssetClaviculary | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingClaviculary(undefined);
    setDialogOpen(true);
  };

  const handleOpenEdit = (claviculary: AssetClaviculary) => {
    setEditingClaviculary(claviculary);
    setDialogOpen(true);
  };

  const handleCloseDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingClaviculary(undefined);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <LoadingSpinner size="lg" text="Carregando claviculários..." />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Claviculários</CardTitle>
            <CardDescription>
              Gerencie os claviculários (armários de chaves) da unidade
            </CardDescription>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Claviculário
          </Button>
        </CardHeader>
        <CardContent>
          {clavicularies.length === 0 ? (
            <EmptyState
              icon={Key}
              title="Nenhum claviculário cadastrado"
              description="Cadastre um claviculário para organizar os chaveiros."
              actionLabel="Novo Claviculário"
              onAction={handleOpenCreate}
              compact
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Ganchos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clavicularies.map((claviculary) => (
                  <TableRow key={claviculary.id}>
                    <TableCell className="font-medium">
                      {claviculary.name}
                    </TableCell>
                    <TableCell>
                      {claviculary.location ? (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {claviculary.location.name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {claviculary.notes || "Configurado"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={claviculary.status === "active" ? "default" : "secondary"}
                      >
                        {claviculary.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(claviculary)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(claviculary.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ClavicularyDialog 
        open={dialogOpen} 
        onOpenChange={handleCloseDialog} 
        claviculary={editingClaviculary}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover claviculário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os chaveiros associados ficarão sem claviculário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
