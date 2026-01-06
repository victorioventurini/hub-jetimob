import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Key } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AssetKeyring } from "../../types";
import { KEYRING_STATUS_LABELS } from "../../types";
import { KeyringDetailDialog } from "./KeyringDetailDialog";

interface KeyringsListProps {
  keyrings: AssetKeyring[];
}

const statusColors: Record<string, string> = {
  available: "bg-green-500/10 text-green-700 border-green-200",
  loaned: "bg-blue-500/10 text-blue-700 border-blue-200",
  lost: "bg-red-500/10 text-red-700 border-red-200",
  retired: "bg-gray-500/10 text-gray-700 border-gray-200",
};

export function KeyringsList({ keyrings }: KeyringsListProps) {
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
              <TableHead>Chaveiro</TableHead>
              <TableHead>Tag</TableHead>
              <TableHead>Claviculário</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keyrings.map((keyring) => (
              <TableRow
                key={keyring.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleOpenDetail(keyring)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
                      <Key className="h-4 w-4 text-amber-600" />
                    </div>
                    <span className="font-medium">{keyring.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {keyring.tag_number}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {keyring.claviculary ? (
                    <>
                      {keyring.claviculary.name}
                      {keyring.hook && ` - Gancho ${keyring.hook.hook_number}`}
                    </>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {keyring.current_user ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={keyring.current_user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {keyring.current_user.full_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{keyring.current_user.full_name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn(statusColors[keyring.status])}>
                    {KEYRING_STATUS_LABELS[keyring.status]}
                  </Badge>
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
