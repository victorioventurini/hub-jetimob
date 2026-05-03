/**
 * KpiDetailDialog — Dialog wrapper para KpiDetailContent
 * Refatorado em v2.90.0 para reutilizar KpiDetailContent.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KpiDetailContent } from "./KpiDetailContent";

interface KpiDetailDialogProps {
  kpiId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KpiDetailDialog({ kpiId, open, onOpenChange }: KpiDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-auto sm:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        {kpiId ? (
          <div className="min-w-0">
            <KpiDetailContent kpiId={kpiId} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
