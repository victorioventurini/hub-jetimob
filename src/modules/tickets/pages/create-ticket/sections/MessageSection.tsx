import type { RefObject } from "react";
import type { UseFormReturn } from "react-hook-form";
import { FileIcon, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { MentionInput, type ParsedMention } from "@/components/mentions";
import { type CreateTicketFormData, MAX_FILES, formatFileSize } from "../schema";

interface Props {
  form: UseFormReturn<CreateTicketFormData>;
  selectedType: "internal" | "external";
  selectedPartnerId?: string;
  setInitialMessageMentions: (m: ParsedMention[]) => void;
  attachments: File[];
  fileInputRef: RefObject<HTMLInputElement>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeAttachment: (i: number) => void;
}

export function MessageSection({
  form,
  selectedType,
  selectedPartnerId,
  setInitialMessageMentions,
  attachments,
  fileInputRef,
  handleFileSelect,
  removeAttachment,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mensagem Inicial</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="initial_message"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <MentionInput
                  value={field.value || ""}
                  onChange={(value, mentions) => {
                    field.onChange(value);
                    setInitialMessageMentions(mentions);
                  }}
                  context="internal+external"
                  partnerCompanyId={selectedType === "external" ? selectedPartnerId : null}
                  placeholder="Descreva os detalhes da demanda... Use @ para mencionar usuários"
                  rows={6}
                  className="min-h-[150px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Anexos</Label>
            <span className="text-xs text-muted-foreground">
              {attachments.length}/{MAX_FILES} arquivos (máx. 20MB cada)
            </span>
          </div>

          {attachments.length > 0 && (
            <div className="space-y-2">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-md border bg-muted/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      ({formatFileSize(file.size)})
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => removeAttachment(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {attachments.length < MAX_FILES && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                accept="*/*"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Adicionar anexo
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
