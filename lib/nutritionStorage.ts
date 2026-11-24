import { z } from "zod";

import {
  CARB_CAP_MAX,
  CARB_CAP_MIN,
  DRINK_CARBS_MAX,
  DRINK_CONCENTRATION_MAX,
  DRINK_CONCENTRATION_MIN,
  DRINK_KCAL_MAX,
  DRINK_KCAL_MIN,
  DRINK_SALT_MAX,
  DRINK_SALT_MIN,
  SODIUM_CAP_MAX,
  SODIUM_CAP_MIN,
} from "@/lib/nutrition";
import {
  draftToProduct,
  MAX_SELECTED_PRODUCTS,
  PRODUCT_TYPES,
  type Product,
  type ProductType,
} from "@/lib/products";
import { optionalDecimalField } from "@/lib/schemas/fields";
import {
  PRODUCT_KCAL_MAX,
  PRODUCT_KCAL_MIN,
  PRODUCT_SALT_MAX,
  PRODUCT_SALT_MIN,
  PRODUCT_WEIGHT_MAX,
  PRODUCT_WEIGHT_MIN,
  TEXT_MAX_LENGTH,
} from "@/lib/schemas/limits";
import { hasItem, loadItem, removeItems, saveItem } from "@/lib/storage";

/** Clé courante : liste de produits, sélection et stratégie. */
export const NUTRITION_STORAGE_KEY = "kcalapp:nutrition:v2";
/** Ancienne clé, migrée puis supprimée au premier chargement. */
export const NUTRITION_STORAGE_KEY_V1 = "kcalapp:nutrition:v1";

/** État enregistré : plafonds, produits, sélection, stratégie et boisson. */
export type NutritionSettings = {
  carbCap: string;
  sodiumCap: string;
  products: Product[];
  selectedIds: string[];
  strategyKey: string | null;
  drinkEnabled: boolean;
  drinkBrand: string;
  drinkName: string;
  drinkConcentration: string;
  drinkKcalPer100: string;
  drinkCarbsPer100: string;
  drinkSaltPer100: string;
};

export const EMPTY_NUTRITION_SETTINGS: NutritionSettings = {
  carbCap: "",
  sodiumCap: "",
  products: [],
  selectedIds: [],
  strategyKey: null,
  drinkEnabled: false,
  drinkBrand: "",
  drinkName: "",
  drinkConcentration: "",
  drinkKcalPer100: "",
  drinkCarbsPer100: "",
  drinkSaltPer100: "",
};

/** Champ décimal enregistré : vide accepté, sinon lisible et dans les bornes. */
function storedDecimal(min: number, max: number) {
  return optionalDecimalField({ min, max, rangeMessage: "" });
}

/** Texte enregistré : vide accepté, longueur bornée après trim. */
const storedText = z.string().superRefine((raw, ctx) => {
  if (raw.trim().length > TEXT_MAX_LENGTH) {
    ctx.addIssue({ code: "custom", message: "Texte trop long." });
  }
});

/** Produit enregistré : nombres déjà convertis, contrôlés champ par champ. */
const storedProductSchema = z.object({
  id: z.string().superRefine((raw, ctx) => {
    if (raw.trim() === "") {
      ctx.addIssue({ code: "custom", message: "Identifiant manquant." });
    }
  }),
  brand: storedText,
  name: storedText,
  type: z.enum(PRODUCT_TYPES),
  kcal: z.number().min(PRODUCT_KCAL_MIN).max(PRODUCT_KCAL_MAX),
  carbs: z.number().gt(0).max(PRODUCT_WEIGHT_MAX),
  salt: z.number().min(PRODUCT_SALT_MIN).max(PRODUCT_SALT_MAX),
  weight: z.number().min(PRODUCT_WEIGHT_MIN).max(PRODUCT_WEIGHT_MAX),
});

/** Contenu v2 : tout ou rien, y compris la cohérence de la sélection. */
const storedNutritionSchema = z
  .object({
    carbCap: storedDecimal(CARB_CAP_MIN, CARB_CAP_MAX),
    sodiumCap: storedDecimal(SODIUM_CAP_MIN, SODIUM_CAP_MAX),
    products: z.array(storedProductSchema),
    selectedIds: z.array(z.string()),
    strategyKey: z
      .string()
      .nullable()
      .optional()
      .transform((value) => value ?? null),
    drinkEnabled: z.boolean(),
    drinkBrand: storedText,
    drinkName: storedText,
    drinkConcentration: storedDecimal(
      DRINK_CONCENTRATION_MIN,
      DRINK_CONCENTRATION_MAX,
    ),
    drinkKcalPer100: storedDecimal(DRINK_KCAL_MIN, DRINK_KCAL_MAX),
    drinkCarbsPer100: storedDecimal(0, DRINK_CARBS_MAX),
    drinkSaltPer100: storedDecimal(DRINK_SALT_MIN, DRINK_SALT_MAX),
  })
  .superRefine((values, ctx) => {
    if (values.selectedIds.length > MAX_SELECTED_PRODUCTS) {
      ctx.addIssue({
        code: "custom",
        message: "Sélection trop longue.",
        path: ["selectedIds"],
      });
    }

    if (new Set(values.selectedIds).size !== values.selectedIds.length) {
      ctx.addIssue({
        code: "custom",
        message: "Sélection en double.",
        path: ["selectedIds"],
      });
    }

    for (const id of values.selectedIds) {
      if (!values.products.some((product) => product.id === id)) {
        ctx.addIssue({
          code: "custom",
          message: "Sélection orpheline.",
          path: ["selectedIds"],
        });
      }
    }
  });

/**
 * Contenu v1 : mêmes plafonds et boisson, plus les champs produit en unknown.
 * Un produit v1 inexploitable ne bloque pas la migration des autres champs.
 */
const legacyNutritionSchema = z.object({
  carbCap: storedDecimal(CARB_CAP_MIN, CARB_CAP_MAX),
  sodiumCap: storedDecimal(SODIUM_CAP_MIN, SODIUM_CAP_MAX),
  drinkEnabled: z.boolean(),
  drinkBrand: storedText,
  drinkName: storedText,
  drinkConcentration: storedDecimal(
    DRINK_CONCENTRATION_MIN,
    DRINK_CONCENTRATION_MAX,
  ),
  drinkKcalPer100: storedDecimal(DRINK_KCAL_MIN, DRINK_KCAL_MAX),
  drinkCarbsPer100: storedDecimal(0, DRINK_CARBS_MAX),
  drinkSaltPer100: storedDecimal(DRINK_SALT_MIN, DRINK_SALT_MAX),
  productBrand: z.unknown(),
  productName: z.unknown(),
  productType: z.unknown(),
  productKcal: z.unknown(),
  productCarbs: z.unknown(),
  productSalt: z.unknown(),
  productWeight: z.unknown(),
});

/** Anciens types de produit, convertis à la migration. */
function migrateProductType(value: unknown): ProductType | null {
  if (value === "Gel") {
    return "Gel";
  }
  if (value === "Barre") {
    return "Barre";
  }
  if (value === "Pate") {
    return "Pate";
  }
  if (
    value === "Compote" ||
    value === "Autre" ||
    value === "Pâte de fruits" ||
    value === "Pâte de fruit"
  ) {
    return "Pate";
  }
  return null;
}

/** Convertit l'ancien produit v1 ; null s'il n'est pas exploitable. */
function migrateLegacyProduct(
  legacy: z.output<typeof legacyNutritionSchema>,
): Product | null {
  const {
    productBrand,
    productName,
    productType,
    productKcal,
    productCarbs,
    productSalt,
    productWeight,
  } = legacy;

  if (
    typeof productBrand !== "string" ||
    typeof productName !== "string" ||
    typeof productType !== "string" ||
    typeof productKcal !== "string" ||
    typeof productCarbs !== "string" ||
    typeof productSalt !== "string" ||
    typeof productWeight !== "string"
  ) {
    return null;
  }

  const type = migrateProductType(productType);
  if (type === null) {
    return null;
  }

  return draftToProduct(
    {
      brand: productBrand,
      name: productName,
      type,
      kcal: productKcal,
      carbs: productCarbs,
      salt: productSalt,
      weight: productWeight,
    },
    "produit-migre",
  );
}

/**
 * Relit l'état enregistré (v2), ou migre l'ancien état v1.
 * Retourne null si rien n'est enregistré, si le stockage est indisponible ou si le contenu est invalide.
 */
export function loadNutrition(): NutritionSettings | null {
  if (hasItem(NUTRITION_STORAGE_KEY)) {
    return loadItem(NUTRITION_STORAGE_KEY, storedNutritionSchema);
  }

  const legacy = loadItem(NUTRITION_STORAGE_KEY_V1, legacyNutritionSchema);
  if (legacy === null) {
    return null;
  }

  const product = migrateLegacyProduct(legacy);

  const migrated: NutritionSettings = {
    carbCap: legacy.carbCap,
    sodiumCap: legacy.sodiumCap,
    products: product ? [product] : [],
    selectedIds: product ? [product.id] : [],
    strategyKey: null,
    drinkEnabled: legacy.drinkEnabled,
    drinkBrand: legacy.drinkBrand,
    drinkName: legacy.drinkName,
    drinkConcentration: legacy.drinkConcentration,
    drinkKcalPer100: legacy.drinkKcalPer100,
    drinkCarbsPer100: legacy.drinkCarbsPer100,
    drinkSaltPer100: legacy.drinkSaltPer100,
  };

  saveItem(NUTRITION_STORAGE_KEY, migrated);
  removeItems(NUTRITION_STORAGE_KEY_V1);

  return migrated;
}

/** Enregistre l'état ; silencieux si le stockage est indisponible. */
export function saveNutrition(settings: NutritionSettings): void {
  saveItem(NUTRITION_STORAGE_KEY, settings);
}

/** Efface l'état enregistré (v2 et ancienne clé v1) ; silencieux si indisponible. */
export function clearNutrition(): void {
  removeItems(NUTRITION_STORAGE_KEY, NUTRITION_STORAGE_KEY_V1);
}
