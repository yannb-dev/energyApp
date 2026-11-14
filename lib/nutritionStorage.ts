import { parseDecimal } from "@/lib/energy";
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
  PRODUCT_KCAL_MAX,
  PRODUCT_KCAL_MIN,
  PRODUCT_SALT_MAX,
  PRODUCT_SALT_MIN,
  PRODUCT_TYPES,
  PRODUCT_WEIGHT_MAX,
  PRODUCT_WEIGHT_MIN,
  SODIUM_CAP_MAX,
  SODIUM_CAP_MIN,
  TEXT_MAX_LENGTH,
  type NutritionFormValues,
  type ProductType,
} from "@/lib/nutrition";

export const NUTRITION_STORAGE_KEY = "kcalapp:nutrition:v1";

/** La durée de l'effort n'est jamais enregistrée. */
export type NutritionPersistedValues = Omit<NutritionFormValues, "minutes">;

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readText(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length > TEXT_MAX_LENGTH) {
    return null;
  }
  return value;
}

/** Un champ numérique peut être vide (non encore saisi), sinon il doit être dans les bornes. */
function readOptionalNumber(value: unknown, min: number, max: number): string | null {
  if (typeof value !== "string") {
    return null;
  }
  if (value.trim() === "") {
    return value;
  }
  const parsed = parseDecimal(value);
  if (parsed === null || parsed < min || parsed > max) {
    return null;
  }
  return value;
}

function readProductType(value: unknown): ProductType | "" | null {
  if (typeof value !== "string") {
    return null;
  }
  if (value === "") {
    return "";
  }
  return (PRODUCT_TYPES as readonly string[]).includes(value) ? (value as ProductType) : null;
}

/**
 * Relit l'état enregistré, champ par champ, et rejette tout contenu douteux.
 * Retourne null si rien n'est enregistré, si le stockage est indisponible ou si le contenu est invalide.
 */
export function loadNutrition(): NutritionPersistedValues | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  let raw: string | null;
  try {
    raw = storage.getItem(NUTRITION_STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const record = parsed as Record<string, unknown>;

  const carbCap = readOptionalNumber(record.carbCap, CARB_CAP_MIN, CARB_CAP_MAX);
  const sodiumCap = readOptionalNumber(record.sodiumCap, SODIUM_CAP_MIN, SODIUM_CAP_MAX);
  const productBrand = readText(record.productBrand);
  const productName = readText(record.productName);
  const productType = readProductType(record.productType);
  const productKcal = readOptionalNumber(record.productKcal, PRODUCT_KCAL_MIN, PRODUCT_KCAL_MAX);
  const productCarbs = readOptionalNumber(record.productCarbs, 0, PRODUCT_WEIGHT_MAX);
  const productSalt = readOptionalNumber(record.productSalt, PRODUCT_SALT_MIN, PRODUCT_SALT_MAX);
  const productWeight = readOptionalNumber(
    record.productWeight,
    PRODUCT_WEIGHT_MIN,
    PRODUCT_WEIGHT_MAX,
  );
  const drinkEnabled = record.drinkEnabled;
  const drinkBrand = readText(record.drinkBrand);
  const drinkName = readText(record.drinkName);
  const drinkConcentration = readOptionalNumber(
    record.drinkConcentration,
    DRINK_CONCENTRATION_MIN,
    DRINK_CONCENTRATION_MAX,
  );
  const drinkKcalPer100 = readOptionalNumber(record.drinkKcalPer100, DRINK_KCAL_MIN, DRINK_KCAL_MAX);
  const drinkCarbsPer100 = readOptionalNumber(record.drinkCarbsPer100, 0, DRINK_CARBS_MAX);
  const drinkSaltPer100 = readOptionalNumber(record.drinkSaltPer100, DRINK_SALT_MIN, DRINK_SALT_MAX);

  if (
    carbCap === null ||
    sodiumCap === null ||
    productBrand === null ||
    productName === null ||
    productType === null ||
    productKcal === null ||
    productCarbs === null ||
    productSalt === null ||
    productWeight === null ||
    typeof drinkEnabled !== "boolean" ||
    drinkBrand === null ||
    drinkName === null ||
    drinkConcentration === null ||
    drinkKcalPer100 === null ||
    drinkCarbsPer100 === null ||
    drinkSaltPer100 === null
  ) {
    return null;
  }

  const weight = parseDecimal(productWeight);
  const carbs = parseDecimal(productCarbs);
  if (weight !== null && carbs !== null && carbs > weight) {
    return null;
  }

  return {
    carbCap,
    sodiumCap,
    productBrand,
    productName,
    productType,
    productKcal,
    productCarbs,
    productSalt,
    productWeight,
    drinkEnabled,
    drinkBrand,
    drinkName,
    drinkConcentration,
    drinkKcalPer100,
    drinkCarbsPer100,
    drinkSaltPer100,
  };
}

/** Enregistre l'état sans la durée ; silencieux si le stockage est indisponible. */
export function saveNutrition(values: NutritionFormValues): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  const persisted: NutritionPersistedValues = {
    carbCap: values.carbCap,
    sodiumCap: values.sodiumCap,
    productBrand: values.productBrand,
    productName: values.productName,
    productType: values.productType,
    productKcal: values.productKcal,
    productCarbs: values.productCarbs,
    productSalt: values.productSalt,
    productWeight: values.productWeight,
    drinkEnabled: values.drinkEnabled,
    drinkBrand: values.drinkBrand,
    drinkName: values.drinkName,
    drinkConcentration: values.drinkConcentration,
    drinkKcalPer100: values.drinkKcalPer100,
    drinkCarbsPer100: values.drinkCarbsPer100,
    drinkSaltPer100: values.drinkSaltPer100,
  };

  try {
    storage.setItem(NUTRITION_STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Stockage indisponible : l'application continue sans persistance.
  }
}

/** Efface l'état enregistré ; silencieux si le stockage est indisponible. */
export function clearNutrition(): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(NUTRITION_STORAGE_KEY);
  } catch {
    // Stockage indisponible : l'application continue sans persistance.
  }
}
