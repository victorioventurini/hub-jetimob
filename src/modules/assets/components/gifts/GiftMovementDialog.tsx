import { useEffect } from "react";
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
import { AlertTriangle, ArrowDown, ArrowUp, Settings2 } from "lucide-react";
import { useGifts } from "../../hooks";
import { useAuth } from "@/hooks/useAuth";
import type { AssetGiftItem, GiftMovementType, GiftDestinationType } from "../../types";
import { GIFT_MOVEMENT_TYPE_LABELS, GIFT_DESTINATION_TYPE_LABELS } from "../../types";

const schema = z.object({
  movement_type: z.enum(["in", "out", "adjustment"]),
  gift_item_id: z.string().min(1, "Selecione o item"),
  batch_id: z.string().optional(),
  quantity: z.coerce.number().min(1, "Quantidade mínima: 1"),
  destination_type: z.enum(["event", "campaign", "person", "other"]).optional(),
  destination_description: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface GiftMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: GiftMovementType;
  preselectedItem?: AssetGiftItem | null;
}

export function GiftMovementDialog({
  open,
  onOpenChange,
  initialType = "out",
  preselectedItem,
}: GiftMovementDialogProps) {
  const { user } = useAuth();
  const { items, batches, createMovement, isCreatingMovement, getItemTotals } = useGifts();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      movement_type: initialType,
      gift_item_id: preselectedItem?.id || "",
      batch_id: undefined,
      quantity: 1,
      destination_type: undefined,
      destination_description: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        movement_type: initialType,
        gift_item_id: preselectedItem?.id || "",
        batch_id: undefined,
        quantity: 1,
        destination_type: undefined,
        destination_description: "",
        notes: "",
      });
    }
  }, [open, initialType, preselectedItem, form]);

  const movementType = form.watch("movement_type");
  const selectedItemId = form.watch("gift_item_id");
  const selectedBatchId = form.watch("batch_id");

  const itemBatches = batches.filter((b) => b.gift_item_id === selectedItemId);
  const { availableQuantity } = selectedItemId ? getItemTotals(selectedItemId) : { availableQuantity: 0 };
  
  const selectedBatch = itemBatches.find((b) => b.id === selectedBatchId);
  const maxQuantity = selectedBatch ? selectedBatch.quantity_available : availableQuantity;

  const onSubmit = (data: FormData) => {
    createMovement({
      gift_item_id: data.gift_item_id,
      batch_id: data.batch_id || undefined,
      movement_type: data.movement_type,
      quantity: data.quantity,
      destination_type: data.movement_type === "out" ? data.destination_type : undefined,
      destination_description: data.movement_type === "out" ? data.destination_description : undefined,
      notes: data.notes || undefined,
    });
    onOpenChange(false);
  };

  const getIcon = () => {
    switch (movementType) {
      case "in": return <ArrowDown className="h-5 w-5" />;
      case "out": return <ArrowUp className="h-5 w-5" />;
      default: return <Settings2 className="h-5 w-5" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {GIFT_MOVEMENT_TYPE_LABELS[movementType]} de Brinde
          </DialogTitle>
          <DialogDescription>Registre a movimentação de estoque</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="movement_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="in">Entrada</SelectItem>
                      <SelectItem value="out">Saída</SelectItem>
                      <SelectItem value="adjustment">Ajuste</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gift_item_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o item..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {items.filter(i => i.status === "active").map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {itemBatches.length > 0 && (
              <FormField
                control={form.control}
                name="batch_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lote (opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o lote..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {itemBatches.map((batch) => (
                          <SelectItem key={batch.id} value={batch.id}>
                            {batch.batch_code || "Sem código"} ({batch.quantity_available} disp.)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade *</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={movementType === "out" ? maxQuantity : undefined} {...field} />
                  </FormControl>
                  {movementType === "out" && selectedItemId && (
                    <p className="text-xs text-muted-foreground">Disponível: {maxQuantity}</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {movementType === "out" && (
              <>
                <FormField
                  control={form.control}
                  name="destination_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destino *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Tipo de destino..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(GIFT_DESTINATION_TYPE_LABELS) as GiftDestinationType[]).map((type) => (
                            <SelectItem key={type} value={type}>
                              {GIFT_DESTINATION_TYPE_LABELS[type]}
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
                  name="destination_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição do Destino</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Evento de fim de ano..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {movementType === "out" && form.watch("quantity") > maxQuantity && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>Estoque insuficiente para esta quantidade.</AlertDescription>
                  </Alert>
                )}
              </>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
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
                disabled={isCreatingMovement || (movementType === "out" && form.watch("quantity") > maxQuantity)}
              >
                {isCreatingMovement ? "Salvando..." : "Confirmar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
