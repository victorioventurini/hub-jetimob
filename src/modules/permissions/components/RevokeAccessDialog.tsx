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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useRevokeBuAccess } from "../hooks/useRevokeBuAccess";
import { useBu } from "@/contexts/BuContext";

interface RevokeAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    user_id: string;
    profile_id: string;
    role_in_bu: string | null;
    profiles: {
      display_name: string;
      work_email: string;
      photo_url: string | null;
    };
  } | null;
  onSuccess?: () => void;
}

export function RevokeAccessDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: RevokeAccessDialogProps) {
  const { currentBu } = useBu();
  const revokeAccess = useRevokeBuAccess();

  const handleRevoke = async () => {
    if (!user) return;

    await revokeAccess.mutateAsync({
      userId: user.user_id,
      userName: user.profiles.display_name,
    });

    onOpenChange(false);
    onSuccess?.();
  };

  const initials = user?.profiles.display_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  const isAdmin = user?.role_in_bu === "admin";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Revogar Acesso à BU
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Tem certeza que deseja revogar o acesso deste usuário à BU{" "}
                <strong>{currentBu?.name}</strong>?
              </p>

              {user && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.profiles.photo_url || undefined} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.profiles.display_name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.profiles.work_email}
                    </p>
                  </div>
                  {isAdmin && (
                    <Badge variant="destructive">Admin</Badge>
                  )}
                </div>
              )}

              <div className="text-sm space-y-2 text-muted-foreground">
                <p>⚠️ Esta ação irá:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Remover o acesso do usuário a esta BU</li>
                  <li>O usuário não poderá mais selecionar esta BU no login</li>
                  <li>O perfil do usuário será mantido (não será deletado)</li>
                </ul>
              </div>

              {isAdmin && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                  <strong>Atenção:</strong> Este usuário é administrador da BU. 
                  Ao revogar o acesso, ele perderá todos os privilégios administrativos.
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={revokeAccess.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRevoke}
            disabled={revokeAccess.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {revokeAccess.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Revogando...
              </>
            ) : (
              "Revogar Acesso"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
