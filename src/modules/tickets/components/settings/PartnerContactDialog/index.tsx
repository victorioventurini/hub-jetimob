/**
 * Partner Contact Dialog with multi-step flow
 * 
 * Flow:
 * 1. Email verification step - check if email exists globally
 * 2a. If exists: Show contact info and "Activate in this BU" button
 * 2b. If new: Show full registration form
 * 
 * Edit mode: Show tabbed interface with data and capabilities
 */
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBu } from "@/contexts/BuContext";
import { useUpdatePartnerContact } from "../../../hooks";
import type { PartnerContact, PartnerCompany } from "../../../types";
import { ContactCapabilitiesList } from "../ContactCapabilitiesList";
import { EmailVerificationStep } from "./EmailVerificationStep";
import { ExistingContactStep } from "./ExistingContactStep";
import { ContactFormStep } from "./ContactFormStep";
import { EditContactForm } from "./EditContactForm";

export type DialogStep = "email" | "existing" | "form";

interface PartnerContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: PartnerContact | null;
  companies: PartnerCompany[];
  defaultCompanyId?: string;
}

export function PartnerContactDialog({
  open,
  onOpenChange,
  contact,
  companies,
  defaultCompanyId,
}: PartnerContactDialogProps) {
  const isEditMode = !!contact;
  const { currentBu } = useBu();
  const { mutate: updateContact, isPending: isUpdating } = useUpdatePartnerContact();

  const [step, setStep] = useState<DialogStep>("email");
  const [verifiedEmail, setVerifiedEmail] = useState<string>("");
  const [existingContactId, setExistingContactId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("data");

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (!isEditMode) {
        setStep("email");
        setVerifiedEmail("");
        setExistingContactId(null);
      }
      setActiveTab("data");
    }
  }, [open, isEditMode]);

  const handleEmailVerified = (email: string, contactId: string | null) => {
    setVerifiedEmail(email);
    if (contactId) {
      setExistingContactId(contactId);
      setStep("existing");
    } else {
      setStep("form");
    }
  };

  const handleBack = () => {
    setStep("email");
    setExistingContactId(null);
  };

  const handleSuccess = () => {
    onOpenChange(false);
  };

  const dialogTitle = isEditMode
    ? "Editar Contato"
    : step === "email"
    ? "Novo Contato"
    : step === "existing"
    ? "Contato Encontrado"
    : "Cadastrar Contato";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        {isEditMode ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="data">Dados</TabsTrigger>
              <TabsTrigger value="capabilities">Capacidades</TabsTrigger>
            </TabsList>

            <TabsContent value="data" className="mt-4">
              <EditContactForm
                contact={contact}
                companies={companies}
                onCancel={() => onOpenChange(false)}
                onSuccess={handleSuccess}
                isUpdating={isUpdating}
                updateContact={updateContact}
              />
            </TabsContent>

            <TabsContent value="capabilities" className="mt-4">
              <ContactCapabilitiesList
                contactId={contact.id}
                companyId={contact.external_company_id}
              />
              <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                  onClick={() => onOpenChange(false)}
                >
                  Fechar
                </button>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <>
            {step === "email" && (
              <EmailVerificationStep
                companies={companies}
                defaultCompanyId={defaultCompanyId}
                currentBuId={currentBu?.id ?? null}
                onVerified={handleEmailVerified}
                onCancel={() => onOpenChange(false)}
              />
            )}

            {step === "existing" && existingContactId && (
              <ExistingContactStep
                contactId={existingContactId}
                currentBuId={currentBu?.id ?? null}
                currentBuName={currentBu?.name ?? ""}
                onBack={handleBack}
                onSuccess={handleSuccess}
              />
            )}

            {step === "form" && (
              <ContactFormStep
                email={verifiedEmail}
                companies={companies}
                defaultCompanyId={defaultCompanyId}
                onBack={handleBack}
                onSuccess={handleSuccess}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
