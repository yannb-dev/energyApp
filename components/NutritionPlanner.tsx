"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import InfoTooltip from "@/components/InfoTooltip";
import { BottleIcon, CerealBarIcon } from "@/components/NutritionIcons";
import { parseDecimal } from "@/lib/energy";
import { CAPS_HELP, STRATEGY_HELP } from "@/lib/helpTexts";
import {
  CARB_CAP_DEFAULT_G_PER_HOUR,
  CARB_CAP_MAX,
  CARB_CAP_MIN,
  CARB_CAP_RECOMMENDED,
  DRINK_CARBS_MAX,
  DRINK_CONCENTRATION_MAX,
  DRINK_CONCENTRATION_MIN,
  DRINK_KCAL_MAX,
  DRINK_KCAL_MIN,
  DRINK_SALT_MAX,
  DRINK_SALT_MIN,
  MINUTES_MAX,
  MINUTES_MIN,
  SODIUM_CAP_DEFAULT_MG_PER_HOUR,
  SODIUM_CAP_MAX,
  SODIUM_CAP_MIN,
  SODIUM_CAP_RECOMMENDED,
} from "@/lib/nutrition";
import {
  clearNutrition,
  EMPTY_NUTRITION_SETTINGS,
  loadNutrition,
  saveNutrition,
  type NutritionSettings,
} from "@/lib/nutritionStorage";
import {
  addProduct,
  createProductId,
  draftToProduct,
  EMPTY_PRODUCT_DRAFT,
  MAX_SELECTED_MESSAGE,
  MAX_SELECTED_PRODUCTS,
  moveSelected,
  productLabel,
  productToDraft,
  PRODUCT_KCAL_MAX,
  PRODUCT_KCAL_MIN,
  PRODUCT_SALT_MAX,
  PRODUCT_SALT_MIN,
  PRODUCT_TYPES,
  PRODUCT_WEIGHT_MAX,
  PRODUCT_WEIGHT_MIN,
  removeProduct,
  TEXT_MAX_LENGTH,
  toggleSelected,
  updateProduct,
  validateProduct,
  type Product,
  type ProductDraft,
  type ProductField,
  type ProductType,
} from "@/lib/products";
import {
  defaultStrategy,
  getStrategies,
  resolveStrategy,
  strategyText,
} from "@/lib/strategies";

const CARD =
  "rounded-2xl border border-line bg-surface p-4 shadow-lg shadow-canvas/60 sm:p-5";
const CARD_TITLE =
  "mb-3 text-sm font-semibold uppercase tracking-wide text-muted";
const FIELD_LABEL = "mb-1 block text-sm font-medium text-ink";
const FIELD =
  "h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-accent-strong aria-invalid:border-danger";
const BUTTON_BASE =
  "flex h-11 p-3 sm:p-2 flex-1 items-center justify-center rounded-md px-4 text-sm font-semibold transition duration-200 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 focus-visible:ring-offset-surface";
const BUTTON_PRIMARY = `${BUTTON_BASE} bg-accent text-canvas hover:bg-accent-strong`;
const BUTTON_SECONDARY = `${BUTTON_BASE} border border-line text-ink hover:border-accent hover:text-accent-strong`;
const BLOCK_ACTION =
  "flex h-11 w-full items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold text-ink transition duration-200 hover:border-accent hover:text-accent-strong focus-visible:ring-2 focus-visible:ring-accent-strong";
const ROW_ACTION =
  "flex h-11 min-w-11 items-center justify-center rounded-xl border border-line px-3 text-sm font-semibold text-ink transition duration-200 hover:border-accent hover:text-accent-strong focus-visible:ring-2 focus-visible:ring-accent-strong disabled:cursor-not-allowed disabled:opacity-40";
const PILL =
  "rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs font-medium text-accent";
const ERROR_TEXT = "mt-1 text-sm text-danger";

const DURATION_ERROR = "Renseigne la durée dans le bloc Activité.";

/** Valeurs par défaut de la page : plafonds usuels, aucun produit. */
function emptySettings(): NutritionSettings {
  return {
    ...EMPTY_NUTRITION_SETTINGS,
    carbCap: String(CARB_CAP_DEFAULT_G_PER_HOUR),
    sodiumCap: String(SODIUM_CAP_DEFAULT_MG_PER_HOUR),
  };
}

/** Affichage : nombre à la française, sans zéros inutiles (« 0,25 », « 75 »). */
function frenchNumber(value: number): string {
  return String(value).replace(".", ",");
}

/** Durée venant du bloc Activité : entier de 1 à 1440 minutes, sinon null. */
function parseDuration(raw: string): number | null {
  const parsed = parseDecimal(raw);
  if (parsed === null || !Number.isInteger(parsed)) {
    return null;
  }
  if (parsed < MINUTES_MIN || parsed > MINUTES_MAX) {
    return null;
  }
  return parsed;
}

function toProductType(raw: string): ProductType | "" {
  return (PRODUCT_TYPES as readonly string[]).includes(raw)
    ? (raw as ProductType)
    : "";
}

function isDraftEmpty(draft: ProductDraft): boolean {
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
  const strategyKey =
    selectedIds.length < 2
      ? null
      : selectedIds.length === settings.selectedIds.length
        ? strategyKeyFor(selectedIds, settings.strategyKey)
        : defaultStrategy(selectedIds.length === 3 ? 3 : 2).key;
  return { ...settings, selectedIds, strategyKey };
}

type NumberFieldProps = {
  id: string;
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  error: string | null;
  onChange: (value: string) => void;
};

function NumberField({
  id,
  label,
  value,
  min,
  max,
  step,
  error,
  onChange,
}: NumberFieldProps) {
  return (
    <div>
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-erreur` : undefined}
        className={FIELD}
      />
      {error ? (
        <p id={`${id}-erreur`} role="alert" className={ERROR_TEXT}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  error: string | null;
  onChange: (value: string) => void;
};

function TextField({ id, label, value, error, onChange }: TextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        maxLength={TEXT_MAX_LENGTH}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-erreur` : undefined}
        className={FIELD}
      />
      {error ? (
        <p id={`${id}-erreur`} role="alert" className={ERROR_TEXT}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Chevron haut ou bas des boutons de réordonnancement. */
function Chevron({ direction }: { direction: "up" | "down" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path
        d={
          direction === "up"
            ? "M5 12.5 10 7.5 15 12.5"
            : "M5 7.5 10 12.5 15 7.5"
        }
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type NutritionPlannerProps = {
  /** Durée de l'effort lue dans le bloc Activité ; seule source de la durée. */
  minutes: string;
};

export default function NutritionPlanner({ minutes }: NutritionPlannerProps) {
  const router = useRouter();
  const [settings, setSettings] = useState<NutritionSettings>(emptySettings);
  const [shouldPersist, setShouldPersist] = useState(false);

  // Formulaire produit : ouvert pour un ajout, prérempli pour une modification.
  const [draft, setDraft] = useState<ProductDraft>(EMPTY_PRODUCT_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(true);

  // État d'affichage de la boisson : jamais persisté.
  const [openDrink, setOpenDrink] = useState(true);

  // Les erreurs n'apparaissent qu'après une tentative sur le bloc concerné.
  const [capsAttempted, setCapsAttempted] = useState(false);
  const [productAttempted, setProductAttempted] = useState(false);
  const [drinkAttempted, setDrinkAttempted] = useState(false);
  const [durationAttempted, setDurationAttempted] = useState(false);

  // Lecture du stockage après le montage : jamais pendant le rendu.
  useEffect(() => {
    const stored = loadNutrition();
    if (!stored) {
      return;
    }
    /* eslint-disable react-hooks/set-state-in-effect -- SPEC-02.1 : hydratation demandée dans un useEffect, pas pendant le rendu */
    setSettings(stored);
    setFormOpen(stored.products.length === 0);
    setOpenDrink(!stored.drinkEnabled);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Écriture à chaque changement, sauf juste après une réinitialisation.
  useEffect(() => {
    if (!shouldPersist) {
      return;
    }
    saveNutrition(settings);
  }, [settings, shouldPersist]);

  const capsErrors = useMemo(() => {
    const errors: { carbCap?: string; sodiumCap?: string } = {};

    const carbCap = parseDecimal(settings.carbCap);
    if (carbCap === null) {
      errors.carbCap = "Les glucides max sont obligatoires.";
    } else if (carbCap < CARB_CAP_MIN || carbCap > CARB_CAP_MAX) {
      errors.carbCap = `Les glucides max : la valeur doit être entre ${CARB_CAP_MIN} et ${CARB_CAP_MAX} g/h.`;
    }

    const sodiumCap = parseDecimal(settings.sodiumCap);
    if (sodiumCap === null) {
      errors.sodiumCap = "Le sodium max est obligatoire.";
    } else if (sodiumCap < SODIUM_CAP_MIN || sodiumCap > SODIUM_CAP_MAX) {
      errors.sodiumCap = `Le sodium max : la valeur doit être entre ${SODIUM_CAP_MIN} et ${SODIUM_CAP_MAX} mg/h.`;
    }

    return errors;
  }, [settings.carbCap, settings.sodiumCap]);

  const drinkErrors = useMemo(() => {
    const errors: Partial<
      Record<
        | "drinkBrand"
        | "drinkName"
        | "drinkConcentration"
        | "drinkKcalPer100"
        | "drinkCarbsPer100"
        | "drinkSaltPer100",
        string
      >
    > = {};
    if (!settings.drinkEnabled) {
      return errors;
    }

    if (settings.drinkBrand.trim() === "") {
      errors.drinkBrand = "La marque de la boisson est obligatoire.";
    }
    if (settings.drinkName.trim() === "") {
      errors.drinkName = "Le nom de la boisson est obligatoire.";
    }

    const concentration = parseDecimal(settings.drinkConcentration);
    if (concentration === null) {
      errors.drinkConcentration = "La concentration est obligatoire.";
    } else if (
      concentration < DRINK_CONCENTRATION_MIN ||
      concentration > DRINK_CONCENTRATION_MAX
    ) {
      errors.drinkConcentration = `La concentration : la valeur doit être entre ${DRINK_CONCENTRATION_MIN} et ${DRINK_CONCENTRATION_MAX} g/L.`;
    }

    const kcal = parseDecimal(settings.drinkKcalPer100);
    if (kcal === null) {
      errors.drinkKcalPer100 =
        "L'énergie pour 100 g de poudre est obligatoire.";
    } else if (kcal < DRINK_KCAL_MIN || kcal > DRINK_KCAL_MAX) {
      errors.drinkKcalPer100 = `L'énergie pour 100 g de poudre : la valeur doit être entre ${DRINK_KCAL_MIN} et ${DRINK_KCAL_MAX} kcal.`;
    }

    const carbs = parseDecimal(settings.drinkCarbsPer100);
    if (carbs === null) {
      errors.drinkCarbsPer100 =
        "Les glucides pour 100 g de poudre sont obligatoires.";
    } else if (carbs <= 0 || carbs > DRINK_CARBS_MAX) {
      errors.drinkCarbsPer100 =
        "Les glucides pour 100 g de poudre doivent être supérieurs à 0 et au plus 100 g.";
    }

    const salt = parseDecimal(settings.drinkSaltPer100);
    if (salt === null) {
      errors.drinkSaltPer100 = "Le sel pour 100 g de poudre est obligatoire.";
    } else if (salt < DRINK_SALT_MIN || salt > DRINK_SALT_MAX) {
      errors.drinkSaltPer100 = `Le sel pour 100 g de poudre : la valeur doit être entre ${DRINK_SALT_MIN} et ${DRINK_SALT_MAX} g.`;
    }

    return errors;
  }, [settings]);

  const productErrors = useMemo(() => validateProduct(draft), [draft]);

  const duration = parseDuration(minutes);
  const selectedCount = settings.selectedIds.length;
  const strategies =
    selectedCount >= 2 ? getStrategies(selectedCount === 3 ? 3 : 2) : [];
  const strategy =
    strategies.length > 0
      ? resolveStrategy(selectedCount === 3 ? 3 : 2, settings.strategyKey)
      : null;
  const labels = settings.selectedIds.map((_, index) =>
    productLabel(index).replace("Produit ", ""),
  );

  function persist(next: NutritionSettings) {
    setShouldPersist(true);
    setSettings(next);
  }

  function patchSettings(part: Partial<NutritionSettings>) {
    persist({ ...settings, ...part });
  }

  function patchDraft(part: Partial<ProductDraft>) {
    setDraft((current) => ({ ...current, ...part }));
  }

  function errorFor(field: ProductField, attempted: boolean): string | null {
    if (!attempted) {
      return null;
    }
    return productErrors[field] ?? null;
  }

  function handleAddProduct() {
    setDraft(EMPTY_PRODUCT_DRAFT);
    setEditingId(null);
    setProductAttempted(false);
    setFormOpen(true);
  }

  function handleEditProduct(product: Product) {
    setDraft(productToDraft(product));
    setEditingId(product.id);
    setProductAttempted(false);
    setFormOpen(true);
  }

  function saveDraftProduct(): NutritionSettings | null {
    const product = draftToProduct(draft, editingId ?? createProductId());
    if (!product) {
      return null;
    }

    if (editingId) {
      return {
        ...settings,
        products: updateProduct(settings.products, product),
      };
    }

    const products = addProduct(settings.products, product);
    return withStrategy(
      { ...settings, products },
      toggleSelected(settings.selectedIds, product.id),
    );
  }

  function handleSubmitProduct() {
    setProductAttempted(true);
    if (Object.keys(productErrors).length > 0) {
      return;
    }

    const next = saveDraftProduct();
    if (!next) {
      return;
    }

    persist(next);
    setDraft(EMPTY_PRODUCT_DRAFT);
    setEditingId(null);
    setProductAttempted(false);
    setFormOpen(false);
  }

  function handleDeleteProduct(id: string) {
    const selectedIds = settings.selectedIds.filter(
      (current) => current !== id,
    );
    persist({
      ...withStrategy(settings, selectedIds),
      products: removeProduct(settings.products, id),
    });
    if (editingId === id) {
      setDraft(EMPTY_PRODUCT_DRAFT);
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
    setDrinkAttempted(true);
    if (Object.keys(drinkErrors).length === 0) {
      setOpenDrink(false);
    }
  }

  function handleEditDrink() {
    setDrinkAttempted(false);
    setOpenDrink(true);
  }

  function handleCalculate() {
    setCapsAttempted(true);
    setDrinkAttempted(true);
    setDurationAttempted(true);

    // Sans produit enregistré, le formulaire ouvert fait foi.
    const mustValidateDraft =
      !isDraftEmpty(draft) || settings.products.length === 0;

    if (mustValidateDraft) {
      setProductAttempted(true);
      if (Object.keys(productErrors).length > 0) {
        setFormOpen(true);
        return;
      }
      const saved = saveDraftProduct();
      if (!saved) {
        setFormOpen(true);
        return;
      }
      persist(saved);
      setDraft(EMPTY_PRODUCT_DRAFT);
      setEditingId(null);
      setProductAttempted(false);
      setFormOpen(false);
    }

    if (
      Object.keys(capsErrors).length > 0 ||
      Object.keys(drinkErrors).length > 0
    ) {
      if (Object.keys(drinkErrors).length > 0) {
        setOpenDrink(true);
      }
      return;
    }

    if (duration === null) {
      return;
    }

    router.push(`/nutrition?min=${duration}`);
  }

  function handleReset() {
    setShouldPersist(false);
    setSettings(emptySettings());
    setDraft(EMPTY_PRODUCT_DRAFT);
    setEditingId(null);
    setFormOpen(true);
    setOpenDrink(true);
    setCapsAttempted(false);
    setProductAttempted(false);
    setDrinkAttempted(false);
    setDurationAttempted(false);
    clearNutrition();
  }

  return (
    <div className="flex flex-col gap-4">
      <section
        className={`motion-safe:animate-rise ${CARD}`}
        aria-labelledby="titre-plafond"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 id="titre-plafond" className={CARD_TITLE}>
            Plafond à respecter
          </h2>
          <InfoTooltip
            id="help-caps"
            label="Aide : plafond à respecter"
            title="Plafond à respecter"
          >
            {CAPS_HELP}
          </InfoTooltip>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <NumberField
              id="nutrition-carb-cap"
              label="Glucides max (g/h)"
              value={settings.carbCap}
              min={CARB_CAP_MIN}
              max={CARB_CAP_MAX}
              step={1}
              error={capsAttempted ? (capsErrors.carbCap ?? null) : null}
              onChange={(carbCap) => patchSettings({ carbCap })}
            />
            <p className="mt-1 text-xs text-muted">
              Repère usuel : {CARB_CAP_RECOMMENDED.min} à{" "}
              {CARB_CAP_RECOMMENDED.max} g/h
            </p>
          </div>
          <div>
            <NumberField
              id="nutrition-sodium-cap"
              label="Sodium max (mg/h)"
              value={settings.sodiumCap}
              min={SODIUM_CAP_MIN}
              max={SODIUM_CAP_MAX}
              step={10}
              error={capsAttempted ? (capsErrors.sodiumCap ?? null) : null}
              onChange={(sodiumCap) => patchSettings({ sodiumCap })}
            />
            <p className="mt-1 text-xs text-muted">
              Repère usuel : {SODIUM_CAP_RECOMMENDED.min} à{" "}
              {SODIUM_CAP_RECOMMENDED.max} mg/h
            </p>
          </div>
        </div>
      </section>

      <section
        className={`motion-safe:animate-rise rise-delay-1 ${CARD}`}
        aria-labelledby="titre-produits"
      >
        <h2 id="titre-produits" className={CARD_TITLE}>
          Produits
        </h2>

        {formOpen ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                id="nutrition-product-brand"
                label="Marque"
                value={draft.brand}
                error={errorFor("brand", productAttempted)}
                onChange={(brand) => patchDraft({ brand })}
              />
              <TextField
                id="nutrition-product-name"
                label="Nom du produit"
                value={draft.name}
                error={errorFor("name", productAttempted)}
                onChange={(name) => patchDraft({ name })}
              />
              <div>
                <label htmlFor="nutrition-product-type" className={FIELD_LABEL}>
                  Type
                </label>
                <div className="relative">
                  <select
                    id="nutrition-product-type"
                    value={draft.type}
                    onChange={(event) =>
                      patchDraft({ type: toProductType(event.target.value) })
                    }
                    aria-invalid={
                      errorFor("type", productAttempted) ? true : undefined
                    }
                    aria-describedby={
                      errorFor("type", productAttempted)
                        ? "nutrition-product-type-erreur"
                        : undefined
                    }
                    className={`${FIELD} appearance-none pr-10`}
                  >
                    <option value="">— Choisis un type —</option>
                    {PRODUCT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    className="pointer-events-none absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2 text-muted"
                  >
                    <path
                      d="M5 7.5 10 12.5 15 7.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                {errorFor("type", productAttempted) ? (
                  <p
                    id="nutrition-product-type-erreur"
                    role="alert"
                    className={ERROR_TEXT}
                  >
                    {errorFor("type", productAttempted)}
                  </p>
                ) : null}
              </div>
              <NumberField
                id="nutrition-product-kcal"
                label="Énergie (kcal)"
                value={draft.kcal}
                min={PRODUCT_KCAL_MIN}
                max={PRODUCT_KCAL_MAX}
                step={1}
                error={errorFor("kcal", productAttempted)}
                onChange={(kcal) => patchDraft({ kcal })}
              />
              <NumberField
                id="nutrition-product-carbs"
                label="Glucides (g)"
                value={draft.carbs}
                min={0}
                max={PRODUCT_WEIGHT_MAX}
                step={0.1}
                error={errorFor("carbs", productAttempted)}
                onChange={(carbs) => patchDraft({ carbs })}
              />
              <NumberField
                id="nutrition-product-salt"
                label="Sel (g)"
                value={draft.salt}
                min={PRODUCT_SALT_MIN}
                max={PRODUCT_SALT_MAX}
                step={0.01}
                error={errorFor("salt", productAttempted)}
                onChange={(salt) => patchDraft({ salt })}
              />
              <NumberField
                id="nutrition-product-weight"
                label="Poids (g)"
                value={draft.weight}
                min={PRODUCT_WEIGHT_MIN}
                max={PRODUCT_WEIGHT_MAX}
                step={1}
                error={errorFor("weight", productAttempted)}
                onChange={(weight) => patchDraft({ weight })}
              />
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleSubmitProduct}
                className={BLOCK_ACTION}
              >
                Valider le produit
              </button>
              {settings.products.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(EMPTY_PRODUCT_DRAFT);
                    setEditingId(null);
                    setProductAttempted(false);
                    setFormOpen(false);
                  }}
                  className={BUTTON_SECONDARY}
                >
                  Annuler
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={handleAddProduct}
            className={BLOCK_ACTION}
          >
            Ajouter un produit
          </button>
        )}

        {settings.products.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {settings.products.map((product) => {
              const selectedIndex = settings.selectedIds.indexOf(product.id);
              const selected = selectedIndex !== -1;
              const atMax =
                settings.selectedIds.length >= MAX_SELECTED_PRODUCTS;

              return (
                <li
                  key={product.id}
                  className="rounded-xl border border-line bg-surface-2 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="checkbox"
                      aria-label={`Sélectionner ${product.name}`}
                      checked={selected}
                      disabled={!selected && atMax}
                      onChange={() => handleToggleProduct(product.id)}
                      className="h-5 w-5 accent-accent"
                    />
                    <CerealBarIcon />
                    <span className="text-sm font-semibold text-ink">
                      {product.name}
                    </span>
                    <span className={PILL}>{product.type}</span>
                    {selected ? (
                      <span className={PILL}>
                        {productLabel(selectedIndex)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    Glucides {frenchNumber(product.carbs)} g · Sel{" "}
                    {frenchNumber(product.salt)} g
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {selected ? (
                      <>
                        <button
                          type="button"
                          aria-label={`Monter ${productLabel(selectedIndex)}`}
                          disabled={selectedIndex === 0}
                          onClick={() => handleMoveProduct(product.id, "up")}
                          className={ROW_ACTION}
                        >
                          <Chevron direction="up" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Descendre ${productLabel(selectedIndex)}`}
                          disabled={
                            selectedIndex === settings.selectedIds.length - 1
                          }
                          onClick={() => handleMoveProduct(product.id, "down")}
                          className={ROW_ACTION}
                        >
                          <Chevron direction="down" />
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      aria-label={`Modifier ${product.name}`}
                      onClick={() => handleEditProduct(product)}
                      className={ROW_ACTION}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      aria-label={`Supprimer ${product.name}`}
                      onClick={() => handleDeleteProduct(product.id)}
                      className={ROW_ACTION}
                    >
                      Supprimer
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {selectedCount >= MAX_SELECTED_PRODUCTS ? (
          <p className="mt-3 text-xs text-muted">{MAX_SELECTED_MESSAGE}</p>
        ) : null}

        {strategy ? (
          <div className="mt-4">
            <div className="flex items-start justify-between gap-2">
              <label htmlFor="nutrition-strategy" className={FIELD_LABEL}>
                Stratégie d&apos;alimentation
              </label>
              <InfoTooltip
                id="help-strategy"
                label="Aide : stratégie d'alimentation"
                title="Stratégie d'alimentation"
              >
                {STRATEGY_HELP}
              </InfoTooltip>
            </div>
            <div className="relative">
              <select
                id="nutrition-strategy"
                value={strategy.key}
                onChange={(event) => handleStrategy(event.target.value)}
                className={`${FIELD} appearance-none pr-10`}
              >
                {strategies.map((entry) => (
                  <option key={entry.key} value={entry.key}>
                    {entry.label}
                  </option>
                ))}
              </select>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                className="pointer-events-none absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2 text-muted"
              >
                <path
                  d="M5 7.5 10 12.5 15 7.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="mt-1 text-xs text-muted">
              {strategyText(strategy, labels)}
            </p>
          </div>
        ) : null}
      </section>

      <section
        className={`motion-safe:animate-rise rise-delay-2 ${CARD}`}
        aria-labelledby="titre-boisson"
      >
        <h2 id="titre-boisson" className={CARD_TITLE}>
          Boisson
        </h2>

        <label
          htmlFor="nutrition-drink-enabled"
          className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-ink"
        >
          <input
            id="nutrition-drink-enabled"
            type="checkbox"
            checked={settings.drinkEnabled}
            onChange={(event) =>
              patchSettings({ drinkEnabled: event.target.checked })
            }
            className="h-5 w-5 accent-accent"
          />
          Ajouter une boisson énergétique
        </label>

        {settings.drinkEnabled ? (
          openDrink ? (
            <>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField
                  id="nutrition-drink-brand"
                  label="Marque de la boisson"
                  value={settings.drinkBrand}
                  error={
                    drinkAttempted ? (drinkErrors.drinkBrand ?? null) : null
                  }
                  onChange={(drinkBrand) => patchSettings({ drinkBrand })}
                />
                <TextField
                  id="nutrition-drink-name"
                  label="Nom de la boisson"
                  value={settings.drinkName}
                  error={
                    drinkAttempted ? (drinkErrors.drinkName ?? null) : null
                  }
                  onChange={(drinkName) => patchSettings({ drinkName })}
                />
                <NumberField
                  id="nutrition-drink-concentration"
                  label="Concentration (g/L)"
                  value={settings.drinkConcentration}
                  min={DRINK_CONCENTRATION_MIN}
                  max={DRINK_CONCENTRATION_MAX}
                  step={1}
                  error={
                    drinkAttempted
                      ? (drinkErrors.drinkConcentration ?? null)
                      : null
                  }
                  onChange={(drinkConcentration) =>
                    patchSettings({ drinkConcentration })
                  }
                />
                <NumberField
                  id="nutrition-drink-kcal"
                  label="Énergie pour 100 g (kcal)"
                  value={settings.drinkKcalPer100}
                  min={DRINK_KCAL_MIN}
                  max={DRINK_KCAL_MAX}
                  step={1}
                  error={
                    drinkAttempted
                      ? (drinkErrors.drinkKcalPer100 ?? null)
                      : null
                  }
                  onChange={(drinkKcalPer100) =>
                    patchSettings({ drinkKcalPer100 })
                  }
                />
                <NumberField
                  id="nutrition-drink-carbs"
                  label="Glucides pour 100 g (g)"
                  value={settings.drinkCarbsPer100}
                  min={0}
                  max={DRINK_CARBS_MAX}
                  step={0.1}
                  error={
                    drinkAttempted
                      ? (drinkErrors.drinkCarbsPer100 ?? null)
                      : null
                  }
                  onChange={(drinkCarbsPer100) =>
                    patchSettings({ drinkCarbsPer100 })
                  }
                />
                <NumberField
                  id="nutrition-drink-salt"
                  label="Sel pour 100 g (g)"
                  value={settings.drinkSaltPer100}
                  min={DRINK_SALT_MIN}
                  max={DRINK_SALT_MAX}
                  step={0.1}
                  error={
                    drinkAttempted
                      ? (drinkErrors.drinkSaltPer100 ?? null)
                      : null
                  }
                  onChange={(drinkSaltPer100) =>
                    patchSettings({ drinkSaltPer100 })
                  }
                />
              </div>

              <button
                type="button"
                onClick={handleValidateDrink}
                className={`mt-4 ${BLOCK_ACTION}`}
              >
                Valider la boisson
              </button>
            </>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <BottleIcon />
                  <span
                    data-testid="drink-summary-name"
                    className="text-sm font-semibold text-ink"
                  >
                    {settings.drinkName}
                  </span>
                </div>
                <p
                  data-testid="drink-summary-details"
                  className="text-sm text-muted"
                >
                  Glucides {settings.drinkCarbsPer100.replace(".", ",")} g/100 g
                  · Sel {settings.drinkSaltPer100.replace(".", ",")} g/100 g ·{" "}
                  {settings.drinkConcentration.replace(".", ",")} g/L
                </p>
              </div>
              <button
                type="button"
                onClick={handleEditDrink}
                className={BLOCK_ACTION}
              >
                Modifier la boisson
              </button>
            </div>
          )
        ) : null}
      </section>

      {durationAttempted && duration === null ? (
        <p role="alert" className="text-sm text-danger">
          {DURATION_ERROR}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleCalculate}
          className={BUTTON_PRIMARY}
        >
          Calculer ma nutrition
        </button>
        <button
          type="button"
          onClick={handleReset}
          className={BUTTON_SECONDARY}
        >
          Réinitialiser la nutrition
        </button>
      </div>

      <p className="text-xs text-muted">Enregistré dans ce navigateur.</p>
    </div>
  );
}
