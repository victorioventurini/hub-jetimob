import { useEffect, useMemo, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  useTicketCategories,
  useAvailableExternalContacts,
  usePartnerCategories,
  usePartnerSubcategories,
  useHasPartnerServices,
  usePartnersByCategory,
  useInternalRoutingMatch,
} from "@/modules/tickets/hooks";
import type { CreateTicketFormData } from "./schema";

export function useTicketFormDerivations(form: UseFormReturn<CreateTicketFormData>) {
  const selectedType = form.watch("type");
  const selectedPartnerId = form.watch("external_company_id");
  const selectedCategoryId = form.watch("category_id");
  const selectedSubcategoryId = form.watch("subcategory_id");

  const { data: allCategories = [] } = useTicketCategories();

  const internalRoutingMatch = useInternalRoutingMatch(
    selectedType === "internal" ? selectedCategoryId : undefined,
    selectedType === "internal" ? selectedSubcategoryId : undefined,
  );

  const { data: partnersByCategoryRaw = [], isLoading: loadingPartnersByCategory } =
    usePartnersByCategory(selectedType === "external" ? selectedCategoryId : undefined);
  const partnersByCategory = useMemo(
    () => [...partnersByCategoryRaw].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "pt-BR")),
    [partnersByCategoryRaw],
  );

  const { hasServices: partnerHasServices, isLoading: loadingPartnerServices } = useHasPartnerServices(
    selectedType === "external" ? selectedPartnerId : undefined,
  );
  const { data: partnerCategories = [] } = usePartnerCategories(
    selectedType === "external" ? selectedPartnerId : undefined,
  );
  const { data: partnerSubcategories = [] } = usePartnerSubcategories(
    selectedType === "external" ? selectedPartnerId : undefined,
    selectedCategoryId,
  );

  const [selectedExternalContactId, setSelectedExternalContactId] = useState<string | undefined>(undefined);
  const [externalContactSource, setExternalContactSource] = useState<"capability" | "fallback" | "none">("none");

  const {
    contacts: availableContactsRaw,
    source: contactsSource,
    isLoading: loadingContacts,
  } = useAvailableExternalContacts(
    selectedType === "external" ? selectedPartnerId : undefined,
    selectedSubcategoryId,
    selectedCategoryId,
  );
  const availableContacts = useMemo(
    () => [...availableContactsRaw].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "pt-BR")),
    [availableContactsRaw],
  );

  useEffect(() => {
    if (selectedType === "external" && availableContacts.length === 1 && !selectedExternalContactId) {
      setSelectedExternalContactId(availableContacts[0].id);
      setExternalContactSource(contactsSource);
    }
  }, [selectedType, availableContacts, selectedExternalContactId, contactsSource]);

  useEffect(() => {
    setSelectedExternalContactId(undefined);
    setExternalContactSource("none");
  }, [selectedPartnerId, selectedSubcategoryId]);

  useEffect(() => {
    if (selectedType === "external" && partnersByCategory.length === 1 && !selectedPartnerId) {
      form.setValue("external_company_id", partnersByCategory[0].id);
    }
  }, [selectedType, partnersByCategory, selectedPartnerId, form]);

  const selectedPartnerCategory = useMemo(
    () => partnerCategories.find((c) => c.category_id === selectedCategoryId),
    [partnerCategories, selectedCategoryId],
  );
  const isGeneralistCategory = selectedPartnerCategory?.is_generalist ?? false;

  useEffect(() => {
    if (selectedType === "external") {
      form.setValue("external_company_id", undefined);
      form.setValue("subcategory_id", undefined);
    }
  }, [selectedCategoryId, selectedType, form]);

  useEffect(() => {
    form.setValue("category_id", undefined);
    form.setValue("external_company_id", undefined);
    form.setValue("subcategory_id", undefined);
  }, [selectedType, form]);

  useEffect(() => {
    if (selectedType === "external") {
      form.setValue("subcategory_id", undefined);
    }
  }, [selectedPartnerId, selectedType, form]);

  const filteredCategories = useMemo(() => {
    let categories = allCategories;
    if (selectedType === "internal") {
      categories = allCategories.filter((cat) => cat.scope === "internal" || cat.scope === "both");
    } else if (selectedType === "external") {
      categories = allCategories.filter((cat) => cat.scope === "external" || cat.scope === "both");
    }
    return [...categories].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "pt-BR"));
  }, [selectedType, allCategories]);

  const availableSubcategories = useMemo(() => {
    let subcategories: { id: string; name: string; default_initial_message?: string | null }[] = [];
    if (selectedType === "internal" && selectedCategoryId) {
      const category = allCategories.find((c) => c.id === selectedCategoryId);
      subcategories = category?.subcategories || [];
    } else if (selectedType === "external" && selectedPartnerId && selectedCategoryId) {
      if (isGeneralistCategory) {
        const category = allCategories.find((c) => c.id === selectedCategoryId);
        subcategories = category?.subcategories || [];
      } else {
        subcategories = partnerSubcategories.map((ps) => {
          const category = allCategories.find((c) => c.id === selectedCategoryId);
          const originalSubcat = category?.subcategories?.find((s) => s.id === ps.subcategory_id);
          return {
            id: ps.subcategory_id,
            name: ps.subcategory_name,
            default_initial_message: originalSubcat?.default_initial_message,
          };
        });
      }
    }
    return [...subcategories].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "pt-BR"));
  }, [selectedType, selectedPartnerId, selectedCategoryId, isGeneralistCategory, partnerSubcategories, allCategories]);

  useEffect(() => {
    if (!selectedSubcategoryId) return;
    const selectedSubcategory = availableSubcategories.find((s) => s.id === selectedSubcategoryId);
    if (!selectedSubcategory?.default_initial_message) return;
    const currentMessage = form.getValues("initial_message");
    if (!currentMessage || currentMessage.trim() === "") {
      form.setValue("initial_message", selectedSubcategory.default_initial_message);
    }
  }, [selectedSubcategoryId, availableSubcategories, form]);

  return {
    selectedType,
    selectedPartnerId,
    selectedCategoryId,
    selectedSubcategoryId,
    internalRoutingMatch,
    partnersByCategory,
    loadingPartnersByCategory,
    partnerHasServices,
    loadingPartnerServices,
    isGeneralistCategory,
    filteredCategories,
    availableSubcategories,
    availableContacts,
    contactsSource,
    loadingContacts,
    selectedExternalContactId,
    setSelectedExternalContactId,
    externalContactSource,
    setExternalContactSource,
  };
}
