// ============================================================
// USER GLOBAL SHEET - Configurações de um usuário
// ============================================================

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  User,
  Mail,
  Calendar,
  Building2,
  Shield,
  RotateCcw,
  CheckCircle,
  Clock,
  UserX,
  UserCheck,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BuAccessManager } from "./BuAccessManager";
import { ResetOnboardingDialog } from "./ResetOnboardingDialog";
import { useUpdateGlobalRole, useReactivateUser } from "../hooks/useUserGlobalActions";
import { useAuth } from "@/hooks/useAuth";
import type { GlobalUser } from "../types";

interface UserGlobalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: GlobalUser | null;
}

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  "": "Sem acesso global",
};

export function UserGlobalSheet({ open, onOpenChange, user }: UserGlobalSheetProps) {
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const updateGlobalRole = useUpdateGlobalRole();
  const reactivateUser = useReactivateUser();
  const { role: currentUserRole } = useAuth();

  if (!user) return null;

  const isTerminated = user.employment_status === "terminated" || !!user.deleted_at;

  const handleRoleChange = (newRole: string) => {
    if (!user.user_id) return;
    updateGlobalRole.mutate({
      userId: user.user_id,
      role: newRole === "none" ? null : newRole,
    });
  };

  const handleReactivate = () => {
    reactivateUser.mutate(user.profile_id, {
      onSuccess: () => {
        setReactivateDialogOpen(false);
        onOpenChange(false);
      },
    });
  };

  const canEditSuperAdmin = currentUserRole === "super_admin";
  const isCurrentUserSuperAdmin = currentUserRole === "super_admin";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {user.display_name || "Usuário"}
              {isTerminated && (
                <Badge variant="destructive" className="ml-2">
                  <UserX className="h-3 w-3 mr-1" />
                  Removido
                </Badge>
              )}
            </SheetTitle>
            <SheetDescription>
              Gerenciar acessos e configurações do usuário
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6">
            {/* Alerta de usuário removido */}
            {isTerminated && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <div className="flex items-start gap-3">
                  <UserX className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-destructive">
                      Este usuário foi removido
                    </p>
                    <p className="text-xs text-muted-foreground">
                      O usuário não tem mais acesso ao sistema. Você pode reativá-lo
                      usando o botão abaixo.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Informações Básicas */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                Informações
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{user.work_email || "Sem email"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>
                    BU Principal: {user.primary_bu_name || "Não definida"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Último acesso:{" "}
                    {user.last_sign_in_at
                      ? format(new Date(user.last_sign_in_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })
                      : "Nunca acessou"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {isTerminated ? (
                    <>
                      <UserX className="h-4 w-4 text-destructive" />
                      <span className="text-destructive">Usuário removido</span>
                    </>
                  ) : user.onboarding_completed ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-status-green" />
                      <span>Onboarding concluído</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 text-status-yellow" />
                      <span>Onboarding pendente</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Role Global */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Role Global</Label>
              </div>
              <Select
                value={user.global_role || "none"}
                onValueChange={handleRoleChange}
                disabled={updateGlobalRole.isPending || !user.user_id || isTerminated}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem acesso global</SelectItem>
                  <SelectItem value="collaborator">Colaborador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  {(canEditSuperAdmin || user.global_role === "super_admin") && (
                    <SelectItem value="super_admin" disabled={!isCurrentUserSuperAdmin}>
                      Super Admin
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Role global define acesso às configurações do Hub. Apenas Super
                Admins podem promover outros a Super Admin.
              </p>
            </div>

            <Separator />

            {/* Acesso a BUs */}
            {user.user_id && !isTerminated && (
              <BuAccessManager
                userId={user.user_id}
                buAccesses={user.bu_accesses}
              />
            )}

            {user.user_id && !isTerminated && <Separator />}

            {/* Ações */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                Ações
              </h4>
              
              {isTerminated ? (
                <Button
                  variant="default"
                  className="w-full justify-start"
                  onClick={() => setReactivateDialogOpen(true)}
                  disabled={reactivateUser.isPending}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Reativar Usuário
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setResetDialogOpen(true)}
                    disabled={!user.onboarding_completed}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Resetar Onboarding
                  </Button>
                  {!user.onboarding_completed && (
                    <p className="text-xs text-muted-foreground">
                      Usuário ainda não completou o onboarding.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ResetOnboardingDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        profileId={user.profile_id}
        userName={user.display_name}
      />

      {/* Dialog de reativação */}
      <AlertDialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reativar usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja reativar <strong>{user.display_name}</strong>?
              O usuário voltará a ter acesso ao sistema com o status ativo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReactivate}
              disabled={reactivateUser.isPending}
            >
              {reactivateUser.isPending ? "Reativando..." : "Reativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
