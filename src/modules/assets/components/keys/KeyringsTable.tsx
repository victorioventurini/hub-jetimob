/**
 * KeyringsTable - Table view for keyrings listing
 * Displays keyrings in a structured table format with columns
 * Follows the same pattern as TicketsTable for visual consistency
 */

import { useState } from "react";
import { formatDistanceToNow, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Key } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssetKeyring } from "../../types";
import { KEYRING_STATUS_LABELS } from "../../types";
import { KeyringDetailDialog } from "./KeyringDetailDialog";
import { ASSET_STATUS_STYLES, type AssetStatusKey } from "@/lib/colors";

interface KeyringsTableProps {
  keyrings: AssetKeyring[];
}

const getStatusColor = (status: string): string => {
  return ASSET_STATUS_STYLES[status as AssetStatusKey]?.badge || ASSET_STATUS_STYLES.retired.badge;
};

// Safe date formatter to prevent RangeError on invalid dates
const formatUpdatedAt = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "—";
  const date = parseISO(dateStr);
  if (!isValid(date)) return "—";
  return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
};

export function KeyringsTable({ keyrings }: KeyringsTableProps) {
  const [selectedKeyring, setSelectedKeyring] = useState<AssetKeyring | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const handleOpenDetail = (keyring: AssetKeyring) => {
    setSelectedKeyring(keyring);
    setDetailDialogOpen(true);
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Chaveiro</TableHead>
              <TableHead>Observações</TableHead>
              <TableHead>Claviculário</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Atualizado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keyrings.map((keyring) => (
              <TableRow
                key={keyring.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleOpenDetail(keyring)}
              >
                {/* Chaveiro - Tag e ícone */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-md bg-status-amber-muted flex items-center justify-center">
                      <Key className="h-4 w-4 text-status-amber" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-medium">{keyring.tag_number}</span>
                      {keyring.name && keyring.name !== keyring.tag_number && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {keyring.name}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Observações */}
                <TableCell>
                  <span className="text-sm text-muted-foreground line-clamp-1">
                    {keyring.notes || "—"}
                  </span>
                </TableCell>

                {/* Claviculário */}
                <TableCell>
                  {keyring.claviculary ? (
                    <span className="text-sm">
                      {keyring.claviculary.name}
                      {keyring.hook && (
                        <span className="text-muted-foreground"> - Gancho {keyring.hook.hook_number}</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Responsável */}
                <TableCell>
                  {keyring.current_user ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={keyring.current_user.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {keyring.current_user.full_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm line-clamp-1">{keyring.current_user.full_name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge variant="outline" className={cn("text-xs", getStatusColor(keyring.status))}>
                    {KEYRING_STATUS_LABELS[keyring.status]}
                  </Badge>
                </TableCell>

                {/* Atualizado */}
                <TableCell className="text-right">
                  <span className="text-sm text-muted-foreground">
                    {formatUpdatedAt(keyring.updated_at)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <KeyringDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        keyring={selectedKeyring}
      />
    </>
  );
}
