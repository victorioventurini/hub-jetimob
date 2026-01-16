import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileStack, Shield, Clock, User, Zap } from "lucide-react";
import { usePermissionExplanation } from "../hooks";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PermissionExplanationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  permissionKey: string | null;
}

export function PermissionExplanationDrawer({
  open,
  onOpenChange,
  userId,
  permissionKey,
}: PermissionExplanationDrawerProps) {
  const { explanations, isLoading } = usePermissionExplanation(userId, permissionKey);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-lg">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Origem da Permissão
            </DrawerTitle>
            <DrawerDescription>
              {permissionKey && (
                <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                  {permissionKey}
                </code>
              )}
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 pb-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : explanations.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Não foi possível determinar a origem desta permissão.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {explanations.map((exp, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    {/* Source Type Badge */}
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant={exp.source_type === "template" ? "default" : "secondary"}
                        className="gap-1"
                      >
                        {exp.source_type === "template" ? (
                          <FileStack className="h-3 w-3" />
                        ) : (
                          <Shield className="h-3 w-3" />
                        )}
                        {exp.source_type === "template" ? "Template" : "Override"}
                      </Badge>
                      {exp.is_auto_assigned && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Zap className="h-3 w-3" />
                          Auto-atribuído
                        </Badge>
                      )}
                    </div>

                    {/* Source Name */}
                    <div>
                      <span className="text-sm font-medium">{exp.source_name}</span>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(exp.granted_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {exp.granted_by_name}
                      </div>
                    </div>
                  </div>
                ))}

                <p className="text-xs text-muted-foreground text-center mt-4">
                  Esta permissão pode vir de múltiplas fontes (templates ou overrides).
                </p>
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
