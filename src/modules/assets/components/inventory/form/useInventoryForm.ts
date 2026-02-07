import { useEffect, useState, useMemo, useCallback } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useInventory, useLocations, useAssetPermissionsV2, useBrands } from "../../../hooks";
import { useIdentity } from "@/hooks/useIdentity";
import { 
  inventoryFormSchema, 
  type InventoryFormData,
  buildSubcategoryList,
} from "./inventoryFormSchema";
import type { AssetInventory, AssetRecommendation } from "../../../types";

interface UseInventoryFormProps {
  open: boolean;
  item?: AssetInventory | null;
  cloneMode?: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selected recommendation (skips recommendation step) */
  preSelectedRecommendation?: AssetRecommendation | null;
}

export function useInventoryForm({ open, item, cloneMode = false, onOpenChange, preSelectedRecommendation }: UseInventoryFormProps) {
  const { items, categories, createItemAsync, updateItemAsync, isCreatingItem, isUpdatingItem } = useInventory();
  const { rootLocations, getRooms, defaultLocation } = useLocations();
  const { isInventoryAdmin, canManageInventory } = useAssetPermissionsV2();
  const { profileId } = useIdentity();
  const { brands } = useBrands();
  
  const isEditing = !!item && !cloneMode;
  const isCloning = !!item && cloneMode;
  const itemId = item?.id ?? null;
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  
  // Recommendation selection state (v2.93.0)
  const [selectedRecommendation, setSelectedRecommendation] = useState<AssetRecommendation | null>(null);
  const [showRecommendationStep, setShowRecommendationStep] = useState(false);

  // Build subcategory list with parent names
  const subcategories = useMemo(() => buildSubcategoryList(categories), [categories]);

  // Check if item has a parent category (legacy/imported data)
  const itemHasParentCategory = useMemo(() => {
    if (!item?.category_id) return null;
    const category = categories.find((c) => c.id === item.category_id);
    if (category && !category.parent_id) {
      return { id: category.id, name: category.name };
    }
    return null;
  }, [item?.category_id, categories]);

  // Group subcategories by parent for display
  const groupedSubcategories = useMemo(() => {
    const groups: Record<string, typeof subcategories> = {};
    subcategories.forEach((sub) => {
      if (!groups[sub.parentName]) {
        groups[sub.parentName] = [];
      }
      groups[sub.parentName].push(sub);
    });
    return groups;
  }, [subcategories]);

  const form = useForm<InventoryFormData>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: {
      internal_code: "",
      name: "",
      category_id: undefined,
      home_location_id: "",
      room_id: undefined,
      description: "",
      brand: "",
      model: "",
      acquired_at: "",
      serial_number: "",
      no_serial_number: false,
      acquisition_value: undefined,
      notes: "",
      assigned_to_user_id: undefined,
      due_at: "",
      recommendation_id: undefined,
    },
  });

  const selectedLocationId = useWatch({
    control: form.control,
    name: "home_location_id",
  });

  const availableRooms = selectedLocationId ? getRooms(selectedLocationId) : [];

  // Reset form when dialog opens
  useEffect(() => {
    if (!open) {
      setDuplicateError(null);
      setSelectedRecommendation(null);
      setShowRecommendationStep(false);
      return;
    }

    if (item && !cloneMode) {
      // Editing existing item
      form.reset({
        internal_code: item.internal_code,
        name: item.name,
        category_id: item.category_id || undefined,
        home_location_id: item.home_location_id || "",
        room_id: undefined,
        description: item.description || "",
        brand: item.brand || "",
        model: item.model || "",
        acquired_at: item.acquired_at || "",
        serial_number: item.serial_number || "",
        no_serial_number: !item.serial_number,
        acquisition_value: item.acquisition_value || undefined,
        notes: item.notes || "",
        assigned_to_user_id: undefined,
        due_at: "",
        recommendation_id: item.recommendation_id || undefined,
      });
      setShowRecommendationStep(false);
    } else if (item && cloneMode) {
      // Cloning item
      form.reset({
        internal_code: "",
        name: item.name,
        category_id: item.category_id || undefined,
        home_location_id: item.home_location_id || "",
        room_id: undefined,
        description: item.description || "",
        brand: item.brand || "",
        model: item.model || "",
        acquired_at: item.acquired_at || "",
        serial_number: "",
        no_serial_number: false,
        acquisition_value: item.acquisition_value || undefined,
        notes: item.notes || "",
        assigned_to_user_id: undefined,
        due_at: "",
        recommendation_id: item.recommendation_id || undefined,
      });
      setShowRecommendationStep(false);
    } else {
      // New item
      const hasPreSelected = !!preSelectedRecommendation;
      form.reset({
        internal_code: "",
        name: hasPreSelected ? preSelectedRecommendation.name : "",
        category_id: hasPreSelected && preSelectedRecommendation.category_id ? preSelectedRecommendation.category_id : undefined,
        home_location_id: defaultLocation?.id || "",
        room_id: undefined,
        description: "",
        brand: hasPreSelected ? preSelectedRecommendation.brand : "",
        model: hasPreSelected && preSelectedRecommendation.model ? preSelectedRecommendation.model : "",
        acquired_at: "",
        serial_number: "",
        no_serial_number: false,
        acquisition_value: undefined,
        notes: "",
        assigned_to_user_id: undefined,
        due_at: "",
        recommendation_id: hasPreSelected ? preSelectedRecommendation.id : undefined,
      });

      if (hasPreSelected) {
        // Skip recommendation step, already selected
        setShowRecommendationStep(false);
        setSelectedRecommendation(preSelectedRecommendation);
      } else {
        setShowRecommendationStep(true);
        setSelectedRecommendation(null);
      }
    }
    setDuplicateError(null);
  }, [open, itemId, cloneMode, form, defaultLocation?.id]);

  // Clear room when location changes
  useEffect(() => {
    const currentRoomId = form.getValues("room_id");
    if (currentRoomId && selectedLocationId) {
      const rooms = getRooms(selectedLocationId);
      const roomStillValid = rooms.some((r) => r.id === currentRoomId);
      if (!roomStillValid) {
        form.setValue("room_id", undefined);
      }
    }
  }, [selectedLocationId, form, getRooms]);

  // Check for duplicate code
  const checkDuplicateCode = useCallback((code: string): boolean => {
    const trimmedCode = code.trim();
    if (!trimmedCode) return false;
    return items.some((i) => i.internal_code === trimmedCode && (!isEditing || i.id !== item?.id));
  }, [items, isEditing, item?.id]);

  const onSubmit = async (data: InventoryFormData) => {
    if (checkDuplicateCode(data.internal_code)) {
      setDuplicateError("Este código já está em uso por outro item");
      return;
    }

    setDuplicateError(null);

    const finalLocationId = data.room_id || data.home_location_id;

    const payload = {
      internal_code: data.internal_code.trim(),
      name: data.name.trim(),
      category_id: data.category_id || undefined,
      home_location_id: finalLocationId || undefined,
      description: data.description?.trim() || undefined,
      brand: data.brand?.trim() || undefined,
      model: data.model?.trim() || undefined,
      acquired_at: data.acquired_at || undefined,
      serial_number: isInventoryAdmin ? data.serial_number?.trim() || undefined : undefined,
      acquisition_value: isInventoryAdmin ? data.acquisition_value || undefined : undefined,
      notes: data.notes?.trim() || undefined,
      assigned_to_user_id: !isEditing ? data.assigned_to_user_id || undefined : undefined,
      authorized_by_user_id: !isEditing && data.assigned_to_user_id ? profileId : undefined,
      due_at: !isEditing && data.assigned_to_user_id ? data.due_at || undefined : undefined,
      // Link to recommendation (v2.93.0)
      recommendation_id: !isEditing ? data.recommendation_id || undefined : undefined,
    };

    try {
      if (isEditing && item) {
        await updateItemAsync({ id: item.id, ...payload } as any);
      } else {
        await createItemAsync(payload as any);
      }
      onOpenChange(false);
    } catch {
      // keep dialog open; the mutation already shows a toast with the real error
    }
  };

  const handleCodeChange = useCallback((value: string, onChange: (value: string) => void) => {
    const numericValue = value.replace(/\D/g, "");
    onChange(numericValue);

    if (duplicateError && !checkDuplicateCode(numericValue)) {
      setDuplicateError(null);
    }
  }, [duplicateError, checkDuplicateCode]);

  // Handle recommendation selection (v2.93.0)
  const handleRecommendationSelect = useCallback((rec: AssetRecommendation) => {
    setSelectedRecommendation(rec);
    setShowRecommendationStep(false);
    
    // Pre-fill form fields from recommendation (only if empty)
    if (!form.getValues('name')) {
      form.setValue('name', rec.name);
    }
    if (!form.getValues('category_id') && rec.category_id) {
      form.setValue('category_id', rec.category_id);
    }
    if (!form.getValues('brand')) {
      form.setValue('brand', rec.brand);
    }
    if (!form.getValues('model') && rec.model) {
      form.setValue('model', rec.model);
    }
    // Store recommendation_id
    form.setValue('recommendation_id', rec.id);
  }, [form]);

  const handleSkipRecommendation = useCallback(() => {
    setShowRecommendationStep(false);
    setSelectedRecommendation(null);
  }, []);

  const handleClearRecommendation = useCallback(() => {
    setSelectedRecommendation(null);
    form.setValue('recommendation_id', undefined);
  }, [form]);

  return {
    form,
    isEditing,
    isCloning,
    isInventoryAdmin,
    canManageInventory,
    isCreatingItem,
    isUpdatingItem,
    subcategories,
    groupedSubcategories,
    itemHasParentCategory,
    rootLocations,
    availableRooms,
    brands,
    duplicateError,
    onSubmit,
    handleCodeChange,
    // Recommendation step (v2.93.0)
    showRecommendationStep,
    selectedRecommendation,
    handleRecommendationSelect,
    handleSkipRecommendation,
    handleClearRecommendation,
  };
}
