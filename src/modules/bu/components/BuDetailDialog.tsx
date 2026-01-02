import { Building2, Globe, Edit2, Calendar, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { BuUnit } from "../types";
import { formatCNPJ } from "../utils/cnpjMask";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BuDetailDialogProps {
  bu: BuUnit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

export function BuDetailDialog({
  bu,
  open,
  onOpenChange,
  onEdit,
}: BuDetailDialogProps) {
  if (!bu) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 rounded-xl">
              <AvatarImage
                src={bu.symbol_url || undefined}
                alt={bu.name}
                className="object-contain"
              />
              <AvatarFallback
                className="rounded-xl text-white text-xl font-bold"
                style={{ backgroundColor: bu.primary_color || "#0A3D62" }}
              >
                {bu.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-xl">{bu.name}</DialogTitle>
              <DialogDescription>
                {bu.legal_entity || "Business Unit"}
              </DialogDescription>
              <Badge
                variant={bu.status === "active" ? "default" : "secondary"}
                className="mt-2"
              >
                {bu.status === "active" ? "Ativa" : "Inativa"}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {bu.description && (
            <p className="text-sm text-muted-foreground">{bu.description}</p>
          )}

          <Separator />

          {/* CNPJ */}
          {bu.cnpj && (
            <div className="flex items-center gap-3">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">CNPJ</p>
                <p className="font-mono text-sm">{formatCNPJ(bu.cnpj)}</p>
              </div>
            </div>
          )}

          {/* Domains */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4" />
              <span>Domínios de E-mail Autorizados</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(bu.allowed_email_domains || []).map((domain) => (
                <Badge key={domain} variant="outline">
                  @{domain}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Branding */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Identidade Visual</p>
            <div className="flex items-center gap-4">
              {/* Logo */}
              {bu.logo_url && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Logotipo</p>
                  <img
                    src={bu.logo_url}
                    alt="Logo"
                    className="h-12 object-contain"
                  />
                </div>
              )}
              {/* Colors */}
              <div className="flex gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Primária</p>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-6 w-6 rounded border"
                      style={{ backgroundColor: bu.primary_color || "#0A3D62" }}
                    />
                    <span className="text-xs font-mono">
                      {bu.primary_color || "#0A3D62"}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Secundária</p>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-6 w-6 rounded border"
                      style={{ backgroundColor: bu.secondary_color || "#EAF2FF" }}
                    />
                    <span className="text-xs font-mono">
                      {bu.secondary_color || "#EAF2FF"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Timestamps */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              Criada em{" "}
              {format(new Date(bu.created_at), "dd 'de' MMMM 'de' yyyy", {
                locale: ptBR,
              })}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={onEdit} className="gap-2">
            <Edit2 className="h-4 w-4" />
            Editar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
