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
  SODIUM_CAP_MAX,
  SODIUM_CAP_MIN,
  TEXT_MAX_LENGTH,
} from "@/lib/nutrition";
import {
  isProductType,
  MAX_SELECTED_PRODUCTS,
  PRODUCT_KCAL_MAX,
  PRODUCT_KCAL_MIN,
  PRODUCT_SALT_MAX,
  PRODUCT_SALT_MIN,
  PRODUCT_WEIGHT_MAX,
  PRODUCT_WEIGHT_MIN,
  type Product,
  type ProductType,
} from "@/lib/products";

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
function readOptionalNumber(
  value: unknown,
  min: number,
  max: number,
): string | null {
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

/** Produit enregistré : nombres déjà convertis, contrôlés champ par champ. */
function readNumber(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  if (value < min || value > max) {
    return null;
  }
  return value;
}

function readProduct(value: unknown): Product | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;

  const id = record.id;
  if (typeof id !== "string" || id.trim() === "") {
    return null;
  }
  const brand = readText(record.brand);
  const name = readText(record.name);
  const type = record.type;
  const kcal = readNumber(record.kcal, PRODUCT_KCAL_MIN, PRODUCT_KCAL_MAX);
  const salt = readNumber(record.salt, PRODUCT_SALT_MIN, PRODUCT_SALT_MAX);
  const weight = readNumber(
    record.weight,
    PRODUCT_WEIGHT_MIN,
    PRODUCT_WEIGHT_MAX,
  );
  const carbs = readNumber(record.carbs, 0, PRODUCT_WEIGHT_MAX);

  if (
    brand === null ||
    name === null ||
    !isProductType(typeof type === "string" ? type : "") ||
    kcal === null ||
    salt === null ||
    weight === null ||
    carbs === null ||
    carbs <= 0 ||
    carbs > weight
  ) {
    return null;
  }

  return {
    id,
    brand,
    name,
    type: type as ProductType,
    kcal,
    carbs,
    salt,
    weight,
  };
}

function readProducts(value: unknown): Product[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const products: Product[] = [];
  for (const entry of value) {
    const product = readProduct(entry);
    if (product === null) {
      return null;
    }
    products.push(product);
  }
  return products;
}

/** Sélection ordonnée : identifiants uniques, existants, trois au plus. */
function readSelectedIds(value: unknown, products: Product[]): string[] | null {
  if (!Array.isArray(value) || value.length > MAX_SELECTED_PRODUCTS) {
    return null;
  }
  const ids: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string" || ids.includes(entry)) {
      return null;
    }
    if (!products.some((product) => product.id === entry)) {
      return null;
    }
    ids.push(entry);
  }
  return ids;
}

function readStrategyKey(value: unknown): string | null | undefined {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  return value;
}

function parseRecord(raw: string): Record<string, unknown> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  return parsed as Record<string, unknown>;
}

/** Relit un contenu v2 champ par champ ; null au moindre doute. */
function readSettings(
  record: Record<string, unknown>,
): NutritionSettings | null {
  const carbCap = readOptionalNumber(
    record.carbCap,
    CARB_CAP_MIN,
    CARB_CAP_MAX,
  );
  const sodiumCap = readOptionalNumber(
    record.sodiumCap,
    SODIUM_CAP_MIN,
    SODIUM_CAP_MAX,
  );
  const products = readProducts(record.products);
  const selectedIds =
    products === null ? null : readSelectedIds(record.selectedIds, products);
  const strategyKey = readStrategyKey(record.strategyKey);
  const drinkEnabled = record.drinkEnabled;
  const drinkBrand = readText(record.drinkBrand);
  const drinkName = readText(record.drinkName);
  const drinkConcentration = readOptionalNumber(
    record.drinkConcentration,
    DRINK_CONCENTRATION_MIN,
    DRINK_CONCENTRATION_MAX,
  );
  const drinkKcalPer100 = readOptionalNumber(
    record.drinkKcalPer100,
    DRINK_KCAL_MIN,
    DRINK_KCAL_MAX,
  );
  const drinkCarbsPer100 = readOptionalNumber(
    record.drinkCarbsPer100,
    0,
    DRINK_CARBS_MAX,
  );
  const drinkSaltPer100 = readOptionalNumber(
    record.drinkSaltPer100,
    DRINK_SALT_MIN,
    DRINK_SALT_MAX,
  );

  if (
    carbCap === null ||
    sodiumCap === null ||
    products === null ||
    selectedIds === null ||
    strategyKey === undefined ||
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

  return {
    carbCap,
    sodiumCap,
    products,
    selectedIds,
    strategyKey,
    drinkEnabled,
    drinkBrand,
    drinkName,
    drinkConcentration,
    drinkKcalPer100,
    drinkCarbsPer100,
    drinkSaltPer100,
  };
}

/** Anciens types de produit, convertis à la migration. */
function migrateProductType(value: unknown): ProductType | null {
  if (value === "Gel") {
    return "Gel";
  }
  if (value === "Barre") {
    return "Barre";
  }
  if (value === "Pâte de fruits") {
    return "Pate";
  }
  return null;
}

/** Convertit l'ancien produit v1 ; null s'il n'est pas exploitable. */
function migrateProduct(record: Record<string, unknown>): Product | null {
  const brand = readText(record.productBrand);
  const name = readText(record.productName);
  const type = migrateProductType(record.productType);
  const kcal = readOptionalNumber(
    record.productKcal,
    PRODUCT_KCAL_MIN,
    PRODUCT_KCAL_MAX,
  );
  const carbs = readOptionalNumber(record.productCarbs, 0, PRODUCT_WEIGHT_MAX);
  const salt = readOptionalNumber(
    record.productSalt,
    PRODUCT_SALT_MIN,
    PRODUCT_SALT_MAX,
  );
  const weight = readOptionalNumber(
    record.productWeight,
    PRODUCT_WEIGHT_MIN,
    PRODUCT_WEIGHT_MAX,
  );

  if (
    brand === null ||
    name === null ||
    type === null ||
    kcal === null ||
    carbs === null ||
    salt === null ||
    weight === null ||
    brand.trim() === "" ||
    name.trim() === ""
  ) {
    return null;
  }

  const kcalValue = parseDecimal(kcal);
  const carbsValue = parseDecimal(carbs);
  const saltValue = parseDecimal(salt);
  const weightValue = parseDecimal(weight);
  if (
    kcalValue === null ||
    carbsValue === null ||
    saltValue === null ||
    weightValue === null
  ) {
    return null;
  }
  if (carbsValue <= 0 || carbsValue > weightValue) {
    return null;
  }

  return {
    id: "produit-migre",
    brand: brand.trim(),
    name: name.trim(),
    type,
    kcal: kcalValue,
    carbs: carbsValue,
    salt: saltValue,
    weight: weightValue,
  };
}

/**
 * Relit l'état enregistré (v2), ou migre l'ancien état v1.
 * Retourne null si rien n'est enregistré, si le stockage est indisponible ou si le contenu est invalide.
 */
export function loadNutrition(): NutritionSettings | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  let rawV2: string | null;
  let rawV1: string | null;
  try {
    rawV2 = storage.getItem(NUTRITION_STORAGE_KEY);
    rawV1 = rawV2 === null ? storage.getItem(NUTRITION_STORAGE_KEY_V1) : null;
  } catch {
    return null;
  }

  if (rawV2 !== null) {
    const record = parseRecord(rawV2);
    return record === null ? null : readSettings(record);
  }

  if (rawV1 === null) {
    return null;
  }

  const legacy = parseRecord(rawV1);
  if (legacy === null) {
    return null;
  }

  const carbCap = readOptionalNumber(
    legacy.carbCap,
    CARB_CAP_MIN,
    CARB_CAP_MAX,
  );
  const sodiumCap = readOptionalNumber(
    legacy.sodiumCap,
    SODIUM_CAP_MIN,
    SODIUM_CAP_MAX,
  );
  const drinkEnabled = legacy.drinkEnabled;
  const drinkBrand = readText(legacy.drinkBrand);
  const drinkName = readText(legacy.drinkName);
  const drinkConcentration = readOptionalNumber(
    legacy.drinkConcentration,
    DRINK_CONCENTRATION_MIN,
    DRINK_CONCENTRATION_MAX,
  );
  const drinkKcalPer100 = readOptionalNumber(
    legacy.drinkKcalPer100,
    DRINK_KCAL_MIN,
    DRINK_KCAL_MAX,
  );
  const drinkCarbsPer100 = readOptionalNumber(
    legacy.drinkCarbsPer100,
    0,
    DRINK_CARBS_MAX,
  );
  const drinkSaltPer100 = readOptionalNumber(
    legacy.drinkSaltPer100,
    DRINK_SALT_MIN,
    DRINK_SALT_MAX,
  );

  if (
    carbCap === null ||
    sodiumCap === null ||
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

  const product = migrateProduct(legacy);
  const migrated: NutritionSettings = {
    carbCap,
    sodiumCap,
    products: product ? [product] : [],
    selectedIds: product ? [product.id] : [],
    strategyKey: null,
    drinkEnabled,
    drinkBrand,
    drinkName,
    drinkConcentration,
    drinkKcalPer100,
    drinkCarbsPer100,
    drinkSaltPer100,
  };

  saveNutrition(migrated);
  try {
    storage.removeItem(NUTRITION_STORAGE_KEY_V1);
  } catch {
    // Stockage indisponible : la migration reste valable pour cette session.
  }

  return migrated;
}

/** Enregistre l'état ; silencieux si le stockage est indisponible. */
export function saveNutrition(settings: NutritionSettings): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(NUTRITION_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Stockage indisponible : l'application continue sans persistance.
  }
}

/** Efface l'état enregistré (v2 et ancienne clé v1) ; silencieux si indisponible. */
export function clearNutrition(): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(NUTRITION_STORAGE_KEY);
    storage.removeItem(NUTRITION_STORAGE_KEY_V1);
  } catch {
    // Stockage indisponible : l'application continue sans persistance.
  }
}
