"use client";

/**
 * Formulaires nutrition de la page 1 (SPEC-08.5) : produits, plafonds et boisson.
 * Extrait de `NutritionPlanner` ; la navigation reste à `HomeContent`.
 */

import { useState } from "react";
import { useForm, type FieldValues, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useUserSettings } from "@/components/providers/UserSettingsProvider";
import {
  CARB_CAP_DEFAULT_G_PER_HOUR,
  SODIUM_CAP_DEFAULT_MG_PER_HOUR,
} from "@/lib/nutrition";
import {
  EMPTY_NUTRITION_SETTINGS,
  type NutritionSettings,
} from "@/lib/nutritionStorage";
import {
  capsSchema,
  drinkSchema,
  type CapsValues,
  type DrinkValues,
} from "@/lib/schemas/nutrition";
import {
  productDraftSchema,
  type ProductDraftValues,
} from "@/lib/schemas/product";
import {
  addProduct,
  createProductId,
  draftToProduct,
  EMPTY_PRODUCT_DRAFT,
  moveSelected,
  isProductType,
  productLabel,
  productToDraft,
  removeProduct,
  toggleSelected,
  updateProduct,
  type Product,
  type ProductDraft,
  type ProductType,
} from "@/lib/products";
import {
  defaultStrategy,
  getStrategies,
  resolveStrategy,
  type Strategy,
} from "@/lib/strategies";

/** Valeurs par défaut de la page : plafonds usuels, aucun produit. */
function emptySettings(): NutritionSettings {
  return {
    ...EMPTY_NUTRITION_SETTINGS,
    carbCap: String(CARB_CAP_DEFAULT_G_PER_HOUR),
    sodiumCap: String(SODIUM_CAP_DEFAULT_MG_PER_HOUR),
  };
}

function toProductType(raw: string): ProductType | "" {
  return isProductType(raw) ? raw : "";
}

function isDraftEmpty(draft: ProductDraftValues): boolean {
  return (
    draft.brand === "" &&
    draft.name === "" &&
    draft.type === "" &&
    draft.kcal === "" &&
    draft.carbs === "" &&
    draft.salt === "" &&
    draft.weight === ""
  );
}

/** Clé de stratégie cohérente avec le nombre de solides sélectionnés. */
function strategyKeyFor(
  selectedIds: string[],
  current: string | null,
): string | null {
  if (selectedIds.length < 2) {
    return null;
  }
  return resolveStrategy(selectedIds.length === 3 ? 3 : 2, current).key;
}

function withStrategy(
  settings: NutritionSettings,
  selectedIds: string[],
): NutritionSettings {
  const count = selectedIds.length;
  const strategyKey =
    count < 2
      ? null
      : count === settings.selectedIds.length
        ? strategyKeyFor(selectedIds, settings.strategyKey)
        : defaultStrategy(count === 3 ? 3 : 2).key;
  return { ...settings, selectedIds, strategyKey };
}

/** Soumet un formulaire et dit s'il est valide : permet d'enchaîner les trois. */
async function submitForm<T extends FieldValues>(
  form: UseFormReturn<T>,
): Promise<boolean> {
  let ok = false;
  await form.handleSubmit(() => {
    ok = true;
  })();
  return ok;
}

export type NutritionForms = {
  settings: NutritionSettings;
  productForm: UseFormReturn<ProductDraftValues>;
  capsForm: UseFormReturn<CapsValues>;
  drinkForm: UseFormReturn<DrinkValues>;
  formOpen: boolean;
  openDrink: boolean;
  editingId: string | null;
  strategies: Strategy[];
  strategy: Strategy | null;
  /** Libellés « A », « B », « C » des solides sélectionnés. */
  labels: string[];
  patchSettings: (part: Partial<NutritionSettings>) => void;
  handleAddProduct: () => void;
  handleEditProduct: (product: Product) => void;
  handleCancelProduct: () => void;
  handleSubmitProduct: () => void;
  handleDeleteProduct: (id: string) => void;
  handleToggleProduct: (id: string) => void;
  handleMoveProduct: (id: string, direction: "up" | "down") => void;
  handleStrategy: (key: string) => void;
  handleValidateDrink: () => void;
  handleEditDrink: () => void;
  handleReset: () => void;
  /** Valide les trois formulaires ; true si tout est exploitable. */
  submitAll: () => Promise<boolean>;
};

export default function useNutritionForms(): NutritionForms {
  const { nutrition, updateNutrition, resetNutrition } = useUserSettings();
  const settings = nutrition ?? emptySettings();

  // Formulaire produit : ouvert pour un ajout, prérempli pour une modification.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(
    () => (nutrition?.products.length ?? 0) === 0,
  );
  // État d'affichage de la boisson : jamais persisté.
  const [openDrink, setOpenDrink] = useState(
    () => !(nutrition?.drinkEnabled ?? false),
  );

  const productForm = useForm<ProductDraftValues>({
    defaultValues: EMPTY_PRODUCT_DRAFT,
    resolver: zodResolver(productDraftSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });
  const capsForm = useForm<CapsValues>({
    defaultValues: { carbCap: settings.carbCap, sodiumCap: settings.sodiumCap },
    resolver: zodResolver(capsSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });
  const drinkForm = useForm<DrinkValues>({
    defaultValues: {
      drinkEnabled: settings.drinkEnabled,
      drinkBrand: settings.drinkBrand,
      drinkName: settings.drinkName,
      drinkConcentration: settings.drinkConcentration,
      drinkKcalPer100: settings.drinkKcalPer100,
      drinkCarbsPer100: settings.drinkCarbsPer100,
      drinkSaltPer100: settings.drinkSaltPer100,
    },
    resolver: zodResolver(drinkSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  const selectedCount = settings.selectedIds.length;
  const strategies =
    selectedCount >= 2 ? getStrategies(selectedCount === 3 ? 3 : 2) : [];
  const strategy =
    strategies.length > 0
      ? resolveStrategy(
          selectedCount === 3 ? 3 : 2,
          settings.strategyKey,
        )
      : null;
  const labels = settings.selectedIds.map((_, index) =>
    productLabel(index).replace("Produit ", ""),
  );

  function persist(next: NutritionSettings) {
    updateNutrition(next);
  }

  /** Chaque frappe sur un plafond ou un champ boisson est enregistrée. */
  function patchSettings(part: Partial<NutritionSettings>) {
    persist({ ...settings, ...part });
  }

  function handleAddProduct() {
    productForm.reset(EMPTY_PRODUCT_DRAFT);
    setEditingId(null);
    setFormOpen(true);
  }

  function handleEditProduct(product: Product) {
    productForm.reset(productToDraft(product));
    setEditingId(product.id);
    setFormOpen(true);
  }

  function handleCancelProduct() {
    productForm.reset(EMPTY_PRODUCT_DRAFT);
    setEditingId(null);
    setFormOpen(false);
  }

  function saveDraftProduct(draft: ProductDraft): NutritionSettings | null {
    const product = draftToProduct(draft, editingId ?? createProductId());
    if (!product) {
      return null;
    }
    if (editingId) {
      return { ...settings, products: updateProduct(settings.products, product) };
    }
    const products = addProduct(settings.products, product);
    return withStrategy(
      { ...settings, products },
      toggleSelected(settings.selectedIds, product.id),
    );
  }

  function onValidProduct(data: ProductDraftValues) {
    const draft: ProductDraft = { ...data, type: toProductType(data.type) };
    const next = saveDraftProduct(draft);
    if (!next) {
      return;
    }
    persist(next);
    productForm.reset(EMPTY_PRODUCT_DRAFT);
    setEditingId(null);
    setFormOpen(false);
  }

  function handleSubmitProduct() {
    void productForm.handleSubmit(onValidProduct)();
  }

  function handleDeleteProduct(id: string) {
    const selectedIds = settings.selectedIds.filter((current) => current !== id);
    persist({
      ...withStrategy(settings, selectedIds),
      products: removeProduct(settings.products, id),
    });
    if (editingId === id) {
      productForm.reset(EMPTY_PRODUCT_DRAFT);
      setEditingId(null);
      setFormOpen(true);
    }
  }

  function handleToggleProduct(id: string) {
    persist(withStrategy(settings, toggleSelected(settings.selectedIds, id)));
  }

  function handleMoveProduct(id: string, direction: "up" | "down") {
    persist({
      ...settings,
      selectedIds: moveSelected(settings.selectedIds, id, direction),
    });
  }

  function handleStrategy(key: string) {
    persist({ ...settings, strategyKey: key });
  }

  function handleValidateDrink() {
    void drinkForm.handleSubmit(() => setOpenDrink(false))();
  }

  function handleEditDrink() {
    // Efface l'état soumis sans toucher aux valeurs.
    drinkForm.reset(drinkForm.getValues());
    setOpenDrink(true);
  }

  /**
   * Les trois blocs sont soumis : toutes les erreurs s'affichent.
   * Sans test de durée ni navigation : c'est `HomeContent` qui décide.
   */
  async function submitAll(): Promise<boolean> {
    const draft = productForm.getValues();
    // Sans produit enregistré, le formulaire ouvert fait foi.
    const mustValidateDraft = !isDraftEmpty(draft) || settings.products.length === 0;

    const productOk = mustValidateDraft ? await submitForm(productForm) : true;
    const capsOk = await submitForm(capsForm);
    const drinkOk = await submitForm(drinkForm);

    if (mustValidateDraft) {
      if (!productOk) {
        setFormOpen(true);
        return false;
      }
      const saved = saveDraftProduct({
        ...draft,
        type: toProductType(draft.type),
      });
      if (!saved) {
        setFormOpen(true);
        return false;
      }
      persist(saved);
      productForm.reset(EMPTY_PRODUCT_DRAFT);
      setEditingId(null);
      setFormOpen(false);
    }
    if (!capsOk || !drinkOk) {
      if (!drinkOk) {
        setOpenDrink(true);
      }
      return false;
    }
    return true;
  }

  function handleReset() {
    productForm.reset(EMPTY_PRODUCT_DRAFT);
    setEditingId(null);
    setFormOpen(true);
    setOpenDrink(true);

    const defaults = emptySettings();
    capsForm.reset({ carbCap: defaults.carbCap, sodiumCap: defaults.sodiumCap });
    drinkForm.reset({
      drinkEnabled: false,
      drinkBrand: "",
      drinkName: "",
      drinkConcentration: "",
      drinkKcalPer100: "",
      drinkCarbsPer100: "",
      drinkSaltPer100: "",
    });
    resetNutrition();
  }

  return {
    settings,
    productForm,
    capsForm,
    drinkForm,
    formOpen,
    openDrink,
    editingId,
    strategies,
    strategy,
    labels,
    patchSettings,
    handleAddProduct,
    handleEditProduct,
    handleCancelProduct,
    handleSubmitProduct,
    handleDeleteProduct,
    handleToggleProduct,
    handleMoveProduct,
    handleStrategy,
    handleValidateDrink,
    handleEditDrink,
    handleReset,
    submitAll,
  };
}
