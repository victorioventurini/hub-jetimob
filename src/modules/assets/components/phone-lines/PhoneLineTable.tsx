/**
 * PhoneLineTable — Table view for phone lines listing.
 * Follows InventoryTable pattern.
 */

import { formatPhoneDisplay } from "@/lib/phone";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, UserPlus, UserMinus, Link as LinkIcon } from "lucide-react";
import type { PhoneLine } from "../../hooks/usePhoneLines";

const STATUS_LABELS: Record<string, string> = {
  available: "Disponível",
  loaned: "Emprestado",
};

const PLAN_LABELS: Record<string, string> = {
  prepaid: "Pré-pago",
  postpaid: "Pós-pago",
};

interface PhoneLineTableProps {
  items: PhoneLine[];
  canManage: boolean;
  onEdit: (item: PhoneLine) => void;
  onDelete: (item: PhoneLine) => void;
  onLoan: (item: PhoneLine) => void;
  onReturn: (item: PhoneLine) => void;
}

export function PhoneLineTable({
  items,
  canManage,
  onEdit,
  onDelete,
  onLoan,
  onReturn,
}: PhoneLineTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Número</TableHead>
            <TableHead>Operadora</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Asset Vinculado</TableHead>
            {canManage && <TableHead className="w-[60px]" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-sm">
                {formatPhoneDisplay(item.phone_number)}
              </TableCell>
              <TableCell>{item.carrier ?? "—"}</TableCell>
              <TableCell>{PLAN_LABELS[item.plan_type] ?? item.plan_type}</TableCell>
              <TableCell>
                <StatusBadge
                  status={item.status}
                  label={STATUS_LABELS[item.status] ?? item.status}
                  variant={item.status === "available" ? "success" : "warning"}
                />
              </TableCell>
              <TableCell>
                {item.current_user ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={item.current_user.photo_url ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {(item.current_user.display_name ?? "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate max-w-[150px]">
                      {item.current_user.display_name ?? "Sem nome"}
                    </span>
                  </div>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                {item.linked_asset ? (
                  <div className="flex items-center gap-1.5 text-sm">
                    <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate max-w-[150px]">
                      {item.linked_asset.internal_code} — {item.linked_asset.name}
                    </span>
                  </div>
                ) : (
                  "—"
                )}
              </TableCell>
              {canManage && (
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(item)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      {item.status === "available" && (
                        <DropdownMenuItem onClick={() => onLoan(item)}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Emprestar
                        </DropdownMenuItem>
                      )}
                      {item.status === "loaned" && (
                        <DropdownMenuItem onClick={() => onReturn(item)}>
                          <UserMinus className="h-4 w-4 mr-2" />
                          Devolver
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => onDelete(item)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
