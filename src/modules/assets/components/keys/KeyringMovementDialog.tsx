import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ArrowRightLeft, User, MapPin, XCircle, Key } from "lucide-react";
import { useKeys } from "../../hooks/useKeys";
import { useAssetProfiles } from "../../hooks/useProfiles";
import { useAssetPermissionsV2 } from "../../hooks/useAssetPermissionsV2";
import { useIdentity } from "@/hooks/useIdentity";
import type { AssetKeyring, AssetHook, KeyMovementType } from "../../types";
import { KEY_MOVEMENT_TYPE_LABELS } from "../../types";

interface KeyringMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyring: AssetKeyring;
  initialType?: KeyMovementType;
}

export function KeyringMovementDialog({
  open,
  onOpenChange,
  keyring,
  initialType,
}: KeyringMovementDialogProps) {
  const { profileId } = useIdentity();
  const { clavicularies, getHooks, createKeyMovement, isCreatingKeyMovement } = useKeys();
  const { profiles } = useAssetProfiles();
  const { isKeysAdmin } = useAssetPermissionsV2();

  const [movementType, setMovementType] = useState<KeyMovementType>(initialType || "checkout");
  const [availableHooks, setAvailableHooks] = useState<AssetHook[]>([]);
  const [loadingHooks, setLoadingHooks] = useState(false);
  const [overrideHook, setOverrideHook] = useState(false);

  // Determine available movement types based on current keyring status
  const availableTypes: KeyMovementType[] = [];
  if (keyring.status === "available") {
    availableTypes.push("checkout", "transfer");
  } else if (keyring.status === "loaned") {
    availableTypes.push("return", "transfer");
  }
  if (isKeysAdmin) {
    availableTypes.push("lost", "retired");
  }

  const schema = z.object({
    movement_type: z.enum(["checkout", "return", "transfer", "lost", "retired"]),
    user_id: z.string().optional(),
    to_claviculary_id: z.string().optional(),
    to_hook_id: z.string().optional(),
    authorized_by_user_id: z.string().optional(),
    due_at: z.string().optional(),
    notes: z.string().optional(),
    override_hook: z.boolean().optional(),
  });

  type FormData = z.infer<typeof schema>;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      movement_type: movementType,
      user_id: "",
      to_claviculary_id: keyring.claviculary_id || "",
      to_hook_id: "",
      authorized_by_user_id: profileId || "",
      due_at: "",
      notes: "",
      override_hook: false,
    },
  });

  useEffect(() => {
    if (open) {
      const type = initialType || availableTypes[0] || "checkout";
      setMovementType(type);
      setOverrideHook(false);
      form.reset({
        movement_type: type,
        user_id: "",
        to_claviculary_id: keyring.claviculary_id || "",
        to_hook_id: "",
        authorized_by_user_id: profileId || "",
        due_at: "",
        notes: "",
        override_hook: false,
      });
    }
  }, [open, initialType, keyring, profileId, form]);

  const selectedClavicularyId = form.watch("to_claviculary_id");

  // Fetch available hooks when claviculary changes
  useEffect(() => {
    if (selectedClavicularyId && movementType === "return") {
      setLoadingHooks(true);
      getHooks(selectedClavicularyId).then((hooks) => {
        // For return, show all hooks, filter available unless overriding
        if (overrideHook) {
          setAvailableHooks(hooks);
        } else {
          // Prefer hook matching tag number
          const matchingHook = hooks.find(
            (h) => String(h.hook_number) === keyring.tag_number && !h.occupied
          );
          if (matchingHook) {
            setAvailableHooks([matchingHook]);
            form.setValue("to_hook_id", matchingHook.id);
          } else {
            setAvailableHooks(hooks.filter((h) => !h.occupied));
          }
        }
        setLoadingHooks(false);
      });
    } else {
      setAvailableHooks([]);
    }
  }, [selectedClavicularyId, movementType, overrideHook, getHooks, keyring.tag_number, form]);

  const handleTypeChange = (type: KeyMovementType) => {
    setMovementType(type);
    form.setValue("movement_type", type);
    setOverrideHook(false);
  };

  const onSubmit = async (data: FormData) => {
    const movementData: any = {
      keyring_id: keyring.id,
      movement_type: data.movement_type,
      notes: data.notes || undefined,
      from_claviculary_id: keyring.claviculary_id || undefined,
      from_hook_id: keyring.hook_id || undefined,
    };

    switch (data.movement_type) {
      case "checkout":
        movementData.user_id = data.user_id;
        movementData.authorized_by_user_id = data.authorized_by_user_id;
        movementData.due_at = data.due_at || undefined;
        break;

      case "return":
        movementData.to_claviculary_id = data.to_claviculary_id;
        movementData.to_hook_id = data.to_hook_id;
        break;

      case "transfer":
        if (keyring.status === "loaned") {
          movementData.user_id = data.user_id;
        } else {
          movementData.to_claviculary_id = data.to_claviculary_id;
          movementData.to_hook_id = data.to_hook_id;
        }
        movementData.authorized_by_user_id = data.authorized_by_user_id;
        break;

      case "lost":
      case "retired":
        movementData.authorized_by_user_id = data.authorized_by_user_id;
        break;
    }

    createKeyMovement(movementData);
    onOpenChange(false);
  };

  // Check if selected hook matches tag
  const selectedHookId = form.watch("to_hook_id");
  const selectedHook = availableHooks.find((h) => h.id === selectedHookId);
  const hookMismatch =
    selectedHook &&
    movementType === "return" &&
    String(selectedHook.hook_number) !== keyring.tag_number;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Movimentar: {keyring.name}
          </DialogTitle>
          <DialogDescription>
            Tag: {keyring.tag_number} • Status: {keyring.status}
          </DialogDescription>
        </DialogHeader>

        {availableTypes.length === 0 ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Chaveiro com status "{keyring.status}" não pode ser movimentado.
            </AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Movement Type */}
              <FormField
                control={form.control}
                name="movement_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Movimentação</FormLabel>
                    <Select
                      onValueChange={(val) => handleTypeChange(val as KeyMovementType)}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {KEY_MOVEMENT_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Checkout Fields */}
              {movementType === "checkout" && (
                <>
                  <FormField
                    control={form.control}
                    name="user_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Entregar para *
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o colaborador..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {profiles.map((profile) => (
                              <SelectItem 
                                key={profile.id} 
                                value={profile.id}
                                textValue={profile.full_name}
                              >
                                {profile.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="due_at"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prazo de Devolução</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormDescription>Opcional</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="authorized_by_user_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Autorizado por *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Quem autoriza..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {profiles.map((profile) => (
                              <SelectItem 
                                key={profile.id} 
                                value={profile.id}
                                textValue={profile.full_name}
                              >
                                {profile.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Return Fields */}
              {movementType === "return" && (
                <>
                  <FormField
                    control={form.control}
                    name="to_claviculary_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Claviculário de Destino *
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clavicularies.map((clav) => (
                              <SelectItem key={clav.id} value={clav.id}>
                                {clav.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedClavicularyId && (
                    <FormField
                      control={form.control}
                      name="to_hook_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gancho *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={loadingHooks || availableHooks.length === 0}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    loadingHooks
                                      ? "Carregando..."
                                      : availableHooks.length === 0
                                      ? "Sem ganchos disponíveis"
                                      : "Selecione..."
                                  }
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableHooks.map((hook) => (
                                <SelectItem key={hook.id} value={hook.id}>
                                  Gancho {hook.hook_number}
                                  {String(hook.hook_number) === keyring.tag_number && " (Recomendado)"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {hookMismatch && !overrideHook && (
                    <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        O gancho selecionado ({selectedHook?.hook_number}) não corresponde à tag do
                        chaveiro ({keyring.tag_number}).
                        {isKeysAdmin && (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="ml-2 h-auto p-0"
                            onClick={() => setOverrideHook(true)}
                          >
                            Permitir mesmo assim (Admin)
                          </Button>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}

              {/* Transfer Fields */}
              {movementType === "transfer" && (
                <>
                  {keyring.status === "loaned" ? (
                    <FormField
                      control={form.control}
                      name="user_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transferir para *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o colaborador..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {profiles
                                .filter((p) => p.id !== keyring.current_user_id)
                                .map((profile) => (
                                  <SelectItem 
                                    key={profile.id} 
                                    value={profile.id}
                                    textValue={profile.full_name}
                                  >
                                    {profile.full_name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <>
                      <FormField
                        control={form.control}
                        name="to_claviculary_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Claviculário de Destino</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {clavicularies
                                  .filter((c) => c.id !== keyring.claviculary_id)
                                  .map((clav) => (
                                    <SelectItem key={clav.id} value={clav.id}>
                                      {clav.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <FormField
                    control={form.control}
                    name="authorized_by_user_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Autorizado por *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Quem autoriza..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {profiles.map((profile) => (
                              <SelectItem 
                                key={profile.id} 
                                value={profile.id}
                                textValue={profile.full_name}
                              >
                                {profile.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Lost/Retired Fields */}
              {(movementType === "lost" || movementType === "retired") && (
                <>
                  <Alert variant={movementType === "lost" ? "destructive" : "default"}>
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      {movementType === "lost"
                        ? "O chaveiro será marcado como extraviado. Esta ação pode ser revertida."
                        : "O chaveiro será desativado permanentemente."}
                    </AlertDescription>
                  </Alert>

                  <FormField
                    control={form.control}
                    name="authorized_by_user_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Autorizado por *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Quem autoriza..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {profiles.map((profile) => (
                              <SelectItem 
                                key={profile.id} 
                                value={profile.id}
                                textValue={profile.full_name}
                              >
                                {profile.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Notes (always shown) */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {movementType === "lost" || movementType === "retired"
                        ? "Motivo *"
                        : "Observações"}
                    </FormLabel>
                    <FormControl>
                      <Textarea placeholder="Observações..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isCreatingKeyMovement ||
                    (hookMismatch && !overrideHook && movementType === "return")
                  }
                  variant={movementType === "lost" || movementType === "retired" ? "destructive" : "default"}
                >
                  {isCreatingKeyMovement ? "Salvando..." : "Confirmar"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
