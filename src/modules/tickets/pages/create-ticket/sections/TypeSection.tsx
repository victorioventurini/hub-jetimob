import type { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { CreateTicketFormData } from "../schema";

interface Props {
  form: UseFormReturn<CreateTicketFormData>;
  buName?: string;
}

export function TypeSection({ form, buName }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tipo de Ticket</CardTitle>
      </CardHeader>
      <CardContent>
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="grid grid-cols-2 gap-4"
                >
                  <Label
                    htmlFor="internal"
                    className={cn(
                      "flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-colors",
                      field.value === "internal"
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/50",
                    )}
                  >
                    <RadioGroupItem value="internal" id="internal" className="sr-only" />
                    <span className="font-medium">Interno</span>
                    <span className="text-xs text-muted-foreground text-center mt-1">
                      Entre usuários e times da {buName || "BU"}
                    </span>
                  </Label>
                  <Label
                    htmlFor="external"
                    className={cn(
                      "flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-colors",
                      field.value === "external"
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/50",
                    )}
                  >
                    <RadioGroupItem value="external" id="external" className="sr-only" />
                    <span className="font-medium">Externo</span>
                    <span className="text-xs text-muted-foreground text-center mt-1">
                      Com empresas parceiras
                    </span>
                  </Label>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
