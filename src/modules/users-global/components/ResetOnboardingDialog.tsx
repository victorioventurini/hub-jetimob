// ============================================================
// RESET ONBOARDING DIALOG
// ============================================================

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
import { useResetOnboarding } from "../hooks";

interface ResetOnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string | null;
  userName: string | null;
}

export function ResetOnboardingDialog({
  open,
  onOpenChange,
  profileId,
  userName,
}: ResetOnboardingDialogProps) {
  const resetOnboarding = useResetOnboarding();

  const handleConfirm = () => {
    if (profileId) {
      resetOnboarding.mutate(profileId, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Resetar Onboarding</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja resetar o onboarding de{" "}
            <strong>{userName || "este usuário"}</strong>?
            <br />
            <br />
            O usuário precisará completar novamente o processo de onboarding no
            próximo acesso.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={resetOnboarding.isPending}
          >
            {resetOnboarding.isPending ? "Resetando..." : "Confirmar Reset"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
