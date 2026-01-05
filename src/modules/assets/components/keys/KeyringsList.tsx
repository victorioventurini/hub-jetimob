import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Key, User } from "lucide-react";
import { cn } from "@/lib/utils";
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {keyrings.map((keyring) => (
          <Card
            key={keyring.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleOpenDetail(keyring)}
          >
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
                    <Key className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{keyring.name}</h3>
                    <p className="text-sm text-muted-foreground">Tag: {keyring.tag_number}</p>
                  </div>
                </div>
                <Badge variant="outline" className={cn("shrink-0", statusColors[keyring.status])}>
                  {KEYRING_STATUS_LABELS[keyring.status]}
                </Badge>
              </div>

              {keyring.claviculary && (
                <p className="text-sm text-muted-foreground mt-3">
                  Claviculário: {keyring.claviculary.name}
                  {keyring.hook && ` - Gancho ${keyring.hook.hook_number}`}
                </p>
              )}

              {keyring.current_user && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={keyring.current_user.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {keyring.current_user.full_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground truncate">
                    {keyring.current_user.full_name}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <KeyringDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        keyring={selectedKeyring}
      />
    </>
  );
}
