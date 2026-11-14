"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { BottleIcon, CerealBarIcon } from "@/components/NutritionIcons";
import { parseDecimal } from "@/lib/energy";
import {
  CARB_CAP_MAX,
  CARB_CAP_MIN,
  CARB_CAP_RECOMMENDED,
  DEFAULT_NUTRITION_VALUES,
  DRINK_CARBS_MAX,
  DRINK_CONCENTRATION_MAX,
  DRINK_CONCENTRATION_MIN,
  DRINK_KCAL_MAX,
  DRINK_KCAL_MIN,
  DRINK_SALT_MAX,
  DRINK_SALT_MIN,
  MINUTES_MAX,
  MINUTES_MIN,
  PRODUCT_KCAL_MAX,
  PRODUCT_KCAL_MIN,
  PRODUCT_SALT_MAX,
  PRODUCT_SALT_MIN,
  PRODUCT_TYPES,
  PRODUCT_WEIGHT_MAX,
  PRODUCT_WEIGHT_MIN,
  SODIUM_CAP_MAX,
  SODIUM_CAP_MIN,
  SODIUM_CAP_RECOMMENDED,
  TEXT_MAX_LENGTH,
  validateNutritionInputs,
  type NutritionField,
  type NutritionFieldErrors,
  type NutritionFormValues,
  type ProductType,
} from "@/lib/nutrition";
import { clearNutrition, loadNutrition, saveNutrition } from "@/lib/nutritionStorage";

const CARD = "rounded-2xl border border-line bg-surface p-4 shadow-lg shadow-canvas/60 sm:p-5";
const CARD_TITLE = "mb-3 text-sm font-semibold uppercase tracking-wide text-muted";
const FIELD_LABEL = "mb-1 block text-sm font-medium text-ink";
const FIELD =
  "h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-accent-strong aria-invalid:border-danger";
const BUTTON_BASE =
  "flex h-11 flex-1 items-center justify-center rounded-xl px-4 text-sm font-semibold transition duration-200 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 focus-visible:ring-offset-surface";
const BUTTON_PRIMARY = `${BUTTON_BASE} bg-accent text-canvas hover:bg-accent-strong`;
const BUTTON_SECONDARY = `${BUTTON_BASE} border border-line text-ink hover:border-accent hover:text-accent-strong`;
const BLOCK_ACTION =
  "flex h-11 w-full items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold text-ink transition duration-200 hover:border-accent hover:text-accent-strong focus-visible:ring-2 focus-visible:ring-accent-strong";
const PILL =
  "rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs font-medium text-accent";
const ERROR_TEXT = "mt-1 text-sm text-danger";

const DURATION_ERROR = "Renseigne la durée dans le bloc Activité.";

/** Champs du bloc Produit : chacune de ces erreurs rouvre la carte. */
const PRODUCT_FIELDS: readonly NutritionField[] = [
  "productBrand",
  "productName",
  "productType",
  "productKcal",
  "productCarbs",
  "productSalt",
  "productWeight",
];

/** Champs du bloc Boisson : chacune de ces erreurs rouvre la carte. */
const DRINK_FIELDS: readonly NutritionField[] = [
  "drinkBrand",
  "drinkName",
  "drinkConcentration",
  "drinkKcalPer100",
  "drinkCarbsPer100",
  "drinkSaltPer100",
];

/** Affichage : nombre à la française, sans zéros inutiles (« 0,25 », « 75 »). */
function frenchNumber(raw: string): string {
  const parsed = parseDecimal(raw);
  if (parsed === null) {
    return raw;
  }
  return String(parsed).replace(".", ",");
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
  return (PRODUCT_TYPES as readonly string[]).includes(raw) ? (raw as ProductType) : "";
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

function NumberField({ id, label, value, min, max, step, error, onChange }: NumberFieldProps) {
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

type NutritionPlannerProps = {
  /** Durée de l'effort lue dans le bloc Activité ; seule source de la durée. */
  minutes: string;
};

export default function NutritionPlanner({ minutes }: NutritionPlannerProps) {
  const router = useRouter();
  const [values, setValues] = useState<NutritionFormValues>(DEFAULT_NUTRITION_VALUES);
  const [shouldPersist, setShouldPersist] = useState(false);

  // État d'affichage des blocs repliables : jamais persisté.
  const [openProduct, setOpenProduct] = useState(true);
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
    const hydrated: NutritionFormValues = { ...DEFAULT_NUTRITION_VALUES, ...stored };
    const storedErrors = validateNutritionInputs(hydrated);
    /* eslint-disable react-hooks/set-state-in-effect -- SPEC-02.1 : hydratation demandée dans un useEffect, pas pendant le rendu */
    setValues(hydrated);
    if (!PRODUCT_FIELDS.some((field) => storedErrors[field])) {
      setOpenProduct(false);
    }
    if (hydrated.drinkEnabled && !DRINK_FIELDS.some((field) => storedErrors[field])) {
      setOpenDrink(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Écriture à chaque changement, sauf juste après une réinitialisation.
  useEffect(() => {
    if (!shouldPersist) {
      return;
    }
    saveNutrition(values);
  }, [values, shouldPersist]);

  // La durée n'est plus un champ de la nutrition : elle vient du bloc Activité.
  const errors = useMemo<NutritionFieldErrors>(() => {
    const current = { ...validateNutritionInputs(values) };
    delete current.minutes;
    return current;
  }, [values]);

  const duration = parseDuration(minutes);

  function patch(part: Partial<NutritionFormValues>) {
    setShouldPersist(true);
    setValues((current) => ({ ...current, ...part }));
  }

  function errorFor(field: NutritionField, attempted: boolean): string | null {
    if (!attempted) {
      return null;
    }
    return errors[field] ?? null;
  }

  function handleValidateProduct() {
    setProductAttempted(true);
    if (!PRODUCT_FIELDS.some((field) => errors[field])) {
      setOpenProduct(false);
    }
  }

  function handleEditProduct() {
    setProductAttempted(false);
    setOpenProduct(true);
  }

  function handleValidateDrink() {
    setDrinkAttempted(true);
    if (!DRINK_FIELDS.some((field) => errors[field])) {
      setOpenDrink(false);
    }
  }

  function handleEditDrink() {
    setDrinkAttempted(false);
    setOpenDrink(true);
  }

  function handleCalculate() {
    setCapsAttempted(true);
    setProductAttempted(true);
    setDrinkAttempted(true);
    setDurationAttempted(true);

    if (Object.keys(errors).length > 0) {
      if (PRODUCT_FIELDS.some((field) => errors[field])) {
        setOpenProduct(true);
      }
      if (DRINK_FIELDS.some((field) => errors[field])) {
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
    setValues(DEFAULT_NUTRITION_VALUES);
    setOpenProduct(true);
    setOpenDrink(true);
    setCapsAttempted(false);
    setProductAttempted(false);
    setDrinkAttempted(false);
    setDurationAttempted(false);
    clearNutrition();
  }

  return (
    <div className="flex flex-col gap-4">
      <section className={`motion-safe:animate-rise ${CARD}`} aria-labelledby="titre-plafond">
        <h2 id="titre-plafond" className={CARD_TITLE}>
          Plafond à respecter
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <NumberField
              id="nutrition-carb-cap"
              label="Glucides max (g/h)"
              value={values.carbCap}
              min={CARB_CAP_MIN}
              max={CARB_CAP_MAX}
              step={1}
              error={errorFor("carbCap", capsAttempted)}
              onChange={(carbCap) => patch({ carbCap })}
            />
            <p className="mt-1 text-xs text-muted">
              Repère usuel : {CARB_CAP_RECOMMENDED.min} à {CARB_CAP_RECOMMENDED.max} g/h
            </p>
          </div>
          <div>
            <NumberField
              id="nutrition-sodium-cap"
              label="Sodium max (mg/h)"
              value={values.sodiumCap}
              min={SODIUM_CAP_MIN}
              max={SODIUM_CAP_MAX}
              step={10}
              error={errorFor("sodiumCap", capsAttempted)}
              onChange={(sodiumCap) => patch({ sodiumCap })}
            />
            <p className="mt-1 text-xs text-muted">
              Repère usuel : {SODIUM_CAP_RECOMMENDED.min} à {SODIUM_CAP_RECOMMENDED.max} mg/h
            </p>
          </div>
        </div>
      </section>

      <section
        className={`motion-safe:animate-rise rise-delay-1 ${CARD}`}
        aria-labelledby="titre-produit"
      >
        <h2 id="titre-produit" className={CARD_TITLE}>
          Produit
        </h2>

        {openProduct ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                id="nutrition-product-brand"
                label="Marque"
                value={values.productBrand}
                error={errorFor("productBrand", productAttempted)}
                onChange={(productBrand) => patch({ productBrand })}
              />
              <TextField
                id="nutrition-product-name"
                label="Nom du produit"
                value={values.productName}
                error={errorFor("productName", productAttempted)}
                onChange={(productName) => patch({ productName })}
              />
              <div>
                <label htmlFor="nutrition-product-type" className={FIELD_LABEL}>
                  Type
                </label>
                <div className="relative">
                  <select
                    id="nutrition-product-type"
                    value={values.productType}
                    onChange={(event) => patch({ productType: toProductType(event.target.value) })}
                    aria-invalid={errorFor("productType", productAttempted) ? true : undefined}
                    aria-describedby={
                      errorFor("productType", productAttempted)
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
                {errorFor("productType", productAttempted) ? (
                  <p id="nutrition-product-type-erreur" role="alert" className={ERROR_TEXT}>
                    {errorFor("productType", productAttempted)}
                  </p>
                ) : null}
              </div>
              <NumberField
                id="nutrition-product-kcal"
                label="Énergie (kcal)"
                value={values.productKcal}
                min={PRODUCT_KCAL_MIN}
                max={PRODUCT_KCAL_MAX}
                step={1}
                error={errorFor("productKcal", productAttempted)}
                onChange={(productKcal) => patch({ productKcal })}
              />
              <NumberField
                id="nutrition-product-carbs"
                label="Glucides (g)"
                value={values.productCarbs}
                min={0}
                max={PRODUCT_WEIGHT_MAX}
                step={0.1}
                error={errorFor("productCarbs", productAttempted)}
                onChange={(productCarbs) => patch({ productCarbs })}
              />
              <NumberField
                id="nutrition-product-salt"
                label="Sel (g)"
                value={values.productSalt}
                min={PRODUCT_SALT_MIN}
                max={PRODUCT_SALT_MAX}
                step={0.01}
                error={errorFor("productSalt", productAttempted)}
                onChange={(productSalt) => patch({ productSalt })}
              />
              <NumberField
                id="nutrition-product-weight"
                label="Poids (g)"
                value={values.productWeight}
                min={PRODUCT_WEIGHT_MIN}
                max={PRODUCT_WEIGHT_MAX}
                step={1}
                error={errorFor("productWeight", productAttempted)}
                onChange={(productWeight) => patch({ productWeight })}
              />
            </div>

            <button
              type="button"
              onClick={handleValidateProduct}
              className={`mt-4 ${BLOCK_ACTION}`}
            >
              Valider le produit
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CerealBarIcon />
                <span data-testid="product-summary-name" className="text-sm font-semibold text-ink">
                  {values.productName}
                </span>
                <span data-testid="product-summary-type" className={PILL}>
                  {values.productType}
                </span>
              </div>
              <p data-testid="product-summary-details" className="text-sm text-muted">
                Glucides {frenchNumber(values.productCarbs)} g · Sel{" "}
                {frenchNumber(values.productSalt)} g
              </p>
            </div>
            <button type="button" onClick={handleEditProduct} className={BLOCK_ACTION}>
              Modifier le produit
            </button>
          </div>
        )}
      </section>

      <section className={`motion-safe:animate-rise rise-delay-2 ${CARD}`} aria-labelledby="titre-boisson">
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
            checked={values.drinkEnabled}
            onChange={(event) => patch({ drinkEnabled: event.target.checked })}
            className="h-5 w-5 accent-accent"
          />
          Ajouter une boisson énergétique
        </label>

        {values.drinkEnabled ? (
          openDrink ? (
            <>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField
                  id="nutrition-drink-brand"
                  label="Marque de la boisson"
                  value={values.drinkBrand}
                  error={errorFor("drinkBrand", drinkAttempted)}
                  onChange={(drinkBrand) => patch({ drinkBrand })}
                />
                <TextField
                  id="nutrition-drink-name"
                  label="Nom de la boisson"
                  value={values.drinkName}
                  error={errorFor("drinkName", drinkAttempted)}
                  onChange={(drinkName) => patch({ drinkName })}
                />
                <NumberField
                  id="nutrition-drink-concentration"
                  label="Concentration (g/L)"
                  value={values.drinkConcentration}
                  min={DRINK_CONCENTRATION_MIN}
                  max={DRINK_CONCENTRATION_MAX}
                  step={1}
                  error={errorFor("drinkConcentration", drinkAttempted)}
                  onChange={(drinkConcentration) => patch({ drinkConcentration })}
                />
                <NumberField
                  id="nutrition-drink-kcal"
                  label="Énergie pour 100 g (kcal)"
                  value={values.drinkKcalPer100}
                  min={DRINK_KCAL_MIN}
                  max={DRINK_KCAL_MAX}
                  step={1}
                  error={errorFor("drinkKcalPer100", drinkAttempted)}
                  onChange={(drinkKcalPer100) => patch({ drinkKcalPer100 })}
                />
                <NumberField
                  id="nutrition-drink-carbs"
                  label="Glucides pour 100 g (g)"
                  value={values.drinkCarbsPer100}
                  min={0}
                  max={DRINK_CARBS_MAX}
                  step={0.1}
                  error={errorFor("drinkCarbsPer100", drinkAttempted)}
                  onChange={(drinkCarbsPer100) => patch({ drinkCarbsPer100 })}
                />
                <NumberField
                  id="nutrition-drink-salt"
                  label="Sel pour 100 g (g)"
                  value={values.drinkSaltPer100}
                  min={DRINK_SALT_MIN}
                  max={DRINK_SALT_MAX}
                  step={0.1}
                  error={errorFor("drinkSaltPer100", drinkAttempted)}
                  onChange={(drinkSaltPer100) => patch({ drinkSaltPer100 })}
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
                  <span data-testid="drink-summary-name" className="text-sm font-semibold text-ink">
                    {values.drinkName}
                  </span>
                </div>
                <p data-testid="drink-summary-details" className="text-sm text-muted">
                  Glucides {frenchNumber(values.drinkCarbsPer100)} g/100 g · Sel{" "}
                  {frenchNumber(values.drinkSaltPer100)} g/100 g ·{" "}
                  {frenchNumber(values.drinkConcentration)} g/L
                </p>
              </div>
              <button type="button" onClick={handleEditDrink} className={BLOCK_ACTION}>
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
        <button type="button" onClick={handleCalculate} className={BUTTON_PRIMARY}>
          Calculer ma nutrition
        </button>
        <button type="button" onClick={handleReset} className={BUTTON_SECONDARY}>
          Réinitialiser la nutrition
        </button>
      </div>

      <p className="text-xs text-muted">Enregistré dans ce navigateur.</p>
    </div>
  );
}
