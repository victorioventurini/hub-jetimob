import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAssetPermissions } from "../../hooks/useAssetPermissions";
import { useBu } from "@/contexts/BuContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { PERMISSION_ROLE_LABELS, type AssetPermissionRole } from "../../types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Profile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  photo_url: string | null;
  work_email: string | null;
}

const schema = z.object({
  user_id: z.string().min(1, "Selecione um usuário"),
  role: z.string().min(1, "Selecione uma permissão"),
});

type FormData = z.infer<typeof schema>;

interface AddPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPermissionDialog({ open, onOpenChange }: AddPermissionDialogProps) {
  const { addPermission, isAddingPermission, allPermissions } = useAssetPermissions();
  const { currentBu } = useBu();
  const [search, setSearch] = useState("");

  // Fetch profiles for the current BU
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["profiles-for-assets", currentBu?.id],
    enabled: !!currentBu?.id,
    queryFn: async () => {
      if (!currentBu?.id) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, display_name, photo_url, work_email")
        .eq("bu_id", currentBu.id)
        .is("deleted_at", null)
        .order("first_name");

      if (error) throw error;
      return data as Profile[];
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      user_id: "",
      role: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset();
      setSearch("");
    }
  }, [open, form]);

  // Filtrar usuários que já têm permissão
  const existingUserIds = allPermissions.map((p) => p.user_id);
  const availableProfiles = profiles.filter(
    (p) =>
      !existingUserIds.includes(p.user_id) &&
      (p.display_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.work_email?.toLowerCase().includes(search.toLowerCase()) ||
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()))
  );

  const onSubmit = (data: FormData) => {
    addPermission({
      userId: data.user_id,
      role: data.role as AssetPermissionRole,
    });
    onOpenChange(false);
  };

  const selectedProfile = profiles.find((p) => p.user_id === form.watch("user_id"));

  const getProfileName = (profile: Profile) =>
    profile.display_name || `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Sem nome";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Permissão</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <FormLabel>Buscar Usuário</FormLabel>
              <Input
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuário *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingProfiles ? "Carregando..." : "Selecione..."}>
                          {selectedProfile && (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={selectedProfile.photo_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {getProfileName(selectedProfile).slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span>{getProfileName(selectedProfile)}</span>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableProfiles
                        .filter((profile) => profile.user_id)
                        .slice(0, 20)
                        .map((profile) => (
                          <SelectItem 
                            key={profile.user_id!} 
                            value={profile.user_id!}
                            textValue={getProfileName(profile)}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={profile.photo_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {getProfileName(profile).slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p>{getProfileName(profile)}</p>
                                <p className="text-xs text-muted-foreground">{profile.work_email}</p>
                              </div>
                            </div>
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
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permissão *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(PERMISSION_ROLE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isAddingPermission}>
                {isAddingPermission ? "Adicionando..." : "Adicionar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
