import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Ban } from 'lucide-react';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import {
  TeamObjectiveFormFields,
  useTeamObjectiveForm,
  type TeamObjectiveFormDialogProps,
} from './team-objective-form';

export function TeamObjectiveFormDialog({
  open,
  onOpenChange,
  objective,
  teams: propsTeams,
  orgObjectives,
}: TeamObjectiveFormDialogProps) {
  const form = useTeamObjectiveForm({
    open,
    onOpenChange,
    objective,
    propsTeams,
    orgObjectives,
  });

  // Defense in depth: check if user can manage this team's OKRs
  if (form.isEditing && !form.isLoadingPermission && !form.canManageThisTeam) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {form.isEditing ? 'Editar Objetivo do Time' : 'Novo Objetivo de Time'}
            </DialogTitle>
            {!form.isEditing && (
              <DialogDescription>
                Crie um objetivo vinculado a um OKR organizacional. O prazo será definido pelo ciclo selecionado.
              </DialogDescription>
            )}
          </DialogHeader>
          <form onSubmit={form.handleSubmit}>
            <TeamObjectiveFormFields
              isEditing={form.isEditing}
              isPending={form.isPending}
              hasManageableTeams={form.hasManageableTeams}
              isLoadingManageable={form.isLoadingManageable}
              isTeamSelectReadOnly={form.isTeamSelectReadOnly}
              title={form.title}
              setTitle={form.setTitle}
              description={form.description}
              setDescription={form.setDescription}
              teamId={form.teamId}
              setTeamId={form.setTeamId}
              orgObjectiveId={form.orgObjectiveId}
              setOrgObjectiveId={form.setOrgObjectiveId}
              cycleId={form.cycleId}
              setCycleId={form.setCycleId}
              status={form.status}
              setStatus={form.setStatus}
              isShared={form.isShared}
              setIsShared={form.setIsShared}
              contributingTeamIds={form.contributingTeamIds}
              setContributingTeamIds={form.setContributingTeamIds}
              responsibilityModel={form.responsibilityModel}
              setResponsibilityModel={form.setResponsibilityModel}
              allowedTeamsForCreate={form.allowedTeamsForCreate}
              hierarchicalTeams={form.hierarchicalTeams}
              orgObjectiveOptions={form.orgObjectiveOptions}
              cycles={form.cycles}
              selectedPrimaryTeamName={form.selectedPrimaryTeamName}
              objectiveTeamId={objective?.team_id}
            />
            <DialogFooter className={form.isEditing ? "flex-col-reverse sm:flex-row sm:justify-between gap-2" : ""}>
              {form.isEditing && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => form.setShowCancelConfirm(true)}
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Cancelar OKR
                </Button>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={form.isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" isLoading={form.isPending}>
                  {form.isEditing ? 'Salvar' : 'Criar Objetivo'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {form.isEditing && (
        <DeleteConfirmDialog
          open={form.showCancelConfirm}
          onOpenChange={form.setShowCancelConfirm}
          onConfirm={form.handleCancelOkr}
          title="Cancelar Objetivo do Time"
          description="Tem certeza que deseja cancelar este objetivo? O histórico e check-ins serão preservados, mas o objetivo ficará com status 'Cancelado'."
          isLoading={form.cancelMutation.isPending}
        />
      )}
    </>
  );
}
