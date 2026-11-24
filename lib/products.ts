import { parseDecimal } from "@/lib/energy";
import { toFieldErrors } from "@/lib/schemas/errors";
import { productDraftSchema } from "@/lib/schemas/product";

/** Types de solides proposés par l'application. */
export const PRODUCT_TYPES = ["Gel", "Barre", "Pate"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

/** Bornes partagées avec les schémas de validation (lib/schemas/limits.ts). */
export {
  PRODUCT_KCAL_MAX,
  PRODUCT_KCAL_MIN,
  PRODUCT_SALT_MAX,
  PRODUCT_SALT_MIN,
  PRODUCT_WEIGHT_MAX,
  PRODUCT_WEIGHT_MIN,
  TEXT_MAX_LENGTH,
} from "@/lib/schemas/limits";

/** Un effort se répartit sur trois solides au plus. */
export const MAX_SELECTED_PRODUCTS = 3;
export const MAX_SELECTED_MESSAGE =
  "Tu peux sélectionner 3 produits au maximum.";

/** Un produit enregistré, valeurs numériques prêtes au calcul. */
export type Product = {
  id: string;
  brand: string;
  name: string;
  type: ProductType;
  kcal: number;
  carbs: number;
  salt: number;
  weight: number;
};

/** Saisie en cours d'un produit : mêmes champs, en texte. */
export type ProductDraft = {
  brand: string;
  name: string;
  type: ProductType | "";
  kcal: string;
  carbs: string;
  salt: string;
  weight: string;
};

export type ProductField = keyof ProductDraft;
export type ProductErrors = Partial<Record<ProductField, string>>;

export const EMPTY_PRODUCT_DRAFT: ProductDraft = {
  brand: "",
  name: "",
  type: "",
  kcal: "",
  carbs: "",
  salt: "",
  weight: "",
};

export function isProductType(value: string): value is ProductType {
  return (PRODUCT_TYPES as readonly string[]).includes(value);
}

/** Valide une saisie de produit ; les règles vivent dans lib/schemas/product.ts. */
export function validateProduct(draft: ProductDraft): ProductErrors {
  return toFieldErrors(productDraftSchema, draft);
}

/** Identifiant unique d'un produit ; jamais vide. */
export function createProductId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  return `produit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Convertit une saisie valide en produit ; null si la saisie contient une erreur. */
export function draftToProduct(
  draft: ProductDraft,
  id: string,
): Product | null {
  if (
    Object.keys(validateProduct(draft)).length > 0 ||
    !isProductType(draft.type)
  ) {
    return null;
  }

  const kcal = parseDecimal(draft.kcal);
  const carbs = parseDecimal(draft.carbs);
  const salt = parseDecimal(draft.salt);
  const weight = parseDecimal(draft.weight);
  if (kcal === null || carbs === null || salt === null || weight === null) {
    return null;
  }

  return {
    id,
    brand: draft.brand.trim(),
    name: draft.name.trim(),
    type: draft.type,
    kcal,
    carbs,
    salt,
    weight,
  };
}

/** Repasse un produit enregistré dans le formulaire de saisie. */
export function productToDraft(product: Product): ProductDraft {
  return {
    brand: product.brand,
    name: product.name,
    type: product.type,
    kcal: String(product.kcal),
    carbs: String(product.carbs),
    salt: String(product.salt),
    weight: String(product.weight),
  };
}

export function addProduct(products: Product[], product: Product): Product[] {
  return [...products, product];
}

export function updateProduct(
  products: Product[],
  product: Product,
): Product[] {
  return products.map((item) => (item.id === product.id ? product : item));
}

export function removeProduct(products: Product[], id: string): Product[] {
  return products.filter((item) => item.id !== id);
}

/** Ajoute l'identifiant à la sélection ; refuse au-delà de 3 produits. */
export function toggleSelected(selectedIds: string[], id: string): string[] {
  if (selectedIds.includes(id)) {
    return selectedIds.filter((current) => current !== id);
  }
  if (selectedIds.length >= MAX_SELECTED_PRODUCTS) {
    return selectedIds;
  }
  return [...selectedIds, id];
}

/** Déplace un produit sélectionné d'un cran ; sans effet aux extrémités. */
export function moveSelected(
  selectedIds: string[],
  id: string,
  direction: "up" | "down",
): string[] {
  const index = selectedIds.indexOf(id);
  if (index === -1) {
    return selectedIds;
  }
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= selectedIds.length) {
    return selectedIds;
  }
  const next = [...selectedIds];
  next[index] = selectedIds[target];
  next[target] = id;
  return next;
}

const LABELS = ["A", "B", "C"] as const;

/** Label d'affichage d'un produit sélectionné : « Produit A », « Produit B »… */
export function productLabel(index: number): string {
  const letter = LABELS[index] ?? String(index + 1);
  return `Produit ${letter}`;
}

/** Produits sélectionnés, dans l'ordre des labels. */
export function orderedSelected(
  products: Product[],
  selectedIds: string[],
): Product[] {
  return selectedIds
    .map((id) => products.find((product) => product.id === id) ?? null)
    .filter((product): product is Product => product !== null);
}
