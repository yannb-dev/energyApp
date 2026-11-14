"use client";

import { useEffect, useMemo, useState } from "react";

import {
  computeNutritionPlan,
  DEFAULT_NUTRITION_VALUES,
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
  CARB_CAP_MAX,
  CARB_CAP_MIN,
  MINUTES_MAX,
  MINUTES_MIN,
  SODIUM_CAP_MAX,
  SODIUM_CAP_MIN,
  TEXT_MAX_LENGTH,
  validateNutritionInputs,
  type NutritionField,
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
const TILE = "rounded-xl border border-line bg-surface-2 p-3";
const ERROR_TEXT = "mt-1 text-sm text-danger";

/** Affichage : arrondi à l'entier (kcal, mg, ml, minutes). */
function integer(value: number): string {
  return String(Math.round(value));
}

/** Affichage : une décimale (g, g/h), virgule française. */
function decimal(value: number): string {
  return value.toFixed(1).replace(".", ",");
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

export default function NutritionPlanner() {
  const [values, setValues] = useState<NutritionFormValues>(DEFAULT_NUTRITION_VALUES);
  const [submitted, setSubmitted] = useState(false);
  const [shouldPersist, setShouldPersist] = useState(false);

  // Lecture du stockage après le montage : jamais pendant le rendu.
  useEffect(() => {
    const stored = loadNutrition();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- SPEC-02 : hydratation demandée dans un useEffect, pas pendant le rendu
      setValues((current) => ({ ...current, ...stored }));
    }
  }, []);

  // Écriture à chaque changement, sauf juste après une réinitialisation.
  useEffect(() => {
    if (!shouldPersist) {
      return;
    }
    saveNutrition(values);
  }, [values, shouldPersist]);

  const errors = useMemo(() => validateNutritionInputs(values), [values]);
  const plan = useMemo(() => computeNutritionPlan(values), [values]);

  function patch(part: Partial<NutritionFormValues>) {
    setShouldPersist(true);
    setValues((current) => ({ ...current, ...part }));
  }

  /** Un champ vide n'affiche son erreur qu'après une tentative de calcul. */
  function errorFor(field: NutritionField): string | null {
    const message = errors[field];
    if (!message) {
      return null;
    }
    if (!submitted && String(values[field]).trim() === "") {
      return null;
    }
    return message;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  function handleReset() {
    setShouldPersist(false);
    setSubmitted(false);
    setValues(DEFAULT_NUTRITION_VALUES);
    clearNutrition();
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <section className={`motion-safe:animate-rise ${CARD}`} aria-labelledby="titre-produit">
          <h2 id="titre-produit" className={CARD_TITLE}>
            Produit
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <NumberField
              id="nutrition-carb-cap"
              label="Glucides max (g/h)"
              value={values.carbCap}
              min={CARB_CAP_MIN}
              max={CARB_CAP_MAX}
              step={1}
              error={errorFor("carbCap")}
              onChange={(carbCap) => patch({ carbCap })}
            />
            <NumberField
              id="nutrition-sodium-cap"
              label="Sodium max (mg/h)"
              value={values.sodiumCap}
              min={SODIUM_CAP_MIN}
              max={SODIUM_CAP_MAX}
              step={10}
              error={errorFor("sodiumCap")}
              onChange={(sodiumCap) => patch({ sodiumCap })}
            />
            <NumberField
              id="nutrition-minutes"
              label="Durée de l'effort (min)"
              value={values.minutes}
              min={MINUTES_MIN}
              max={MINUTES_MAX}
              step={1}
              error={errorFor("minutes")}
              onChange={(minutes) => patch({ minutes })}
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              id="nutrition-product-brand"
              label="Marque"
              value={values.productBrand}
              error={errorFor("productBrand")}
              onChange={(productBrand) => patch({ productBrand })}
            />
            <TextField
              id="nutrition-product-name"
              label="Nom du produit"
              value={values.productName}
              error={errorFor("productName")}
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
                  aria-invalid={errorFor("productType") ? true : undefined}
                  aria-describedby={
                    errorFor("productType") ? "nutrition-product-type-erreur" : undefined
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
              {errorFor("productType") ? (
                <p id="nutrition-product-type-erreur" role="alert" className={ERROR_TEXT}>
                  {errorFor("productType")}
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
              error={errorFor("productKcal")}
              onChange={(productKcal) => patch({ productKcal })}
            />
            <NumberField
              id="nutrition-product-carbs"
              label="Glucides (g)"
              value={values.productCarbs}
              min={0}
              max={PRODUCT_WEIGHT_MAX}
              step={0.1}
              error={errorFor("productCarbs")}
              onChange={(productCarbs) => patch({ productCarbs })}
            />
            <NumberField
              id="nutrition-product-salt"
              label="Sel (g)"
              value={values.productSalt}
              min={PRODUCT_SALT_MIN}
              max={PRODUCT_SALT_MAX}
              step={0.01}
              error={errorFor("productSalt")}
              onChange={(productSalt) => patch({ productSalt })}
            />
            <NumberField
              id="nutrition-product-weight"
              label="Poids (g)"
              value={values.productWeight}
              min={PRODUCT_WEIGHT_MIN}
              max={PRODUCT_WEIGHT_MAX}
              step={1}
              error={errorFor("productWeight")}
              onChange={(productWeight) => patch({ productWeight })}
            />
          </div>
        </section>

        <section className={`motion-safe:animate-rise rise-delay-1 ${CARD}`} aria-labelledby="titre-boisson">
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
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                id="nutrition-drink-brand"
                label="Marque de la boisson"
                value={values.drinkBrand}
                error={errorFor("drinkBrand")}
                onChange={(drinkBrand) => patch({ drinkBrand })}
              />
              <TextField
                id="nutrition-drink-name"
                label="Nom de la boisson"
                value={values.drinkName}
                error={errorFor("drinkName")}
                onChange={(drinkName) => patch({ drinkName })}
              />
              <NumberField
                id="nutrition-drink-concentration"
                label="Concentration (g/L)"
                value={values.drinkConcentration}
                min={DRINK_CONCENTRATION_MIN}
                max={DRINK_CONCENTRATION_MAX}
                step={1}
                error={errorFor("drinkConcentration")}
                onChange={(drinkConcentration) => patch({ drinkConcentration })}
              />
              <NumberField
                id="nutrition-drink-kcal"
                label="Énergie pour 100 g (kcal)"
                value={values.drinkKcalPer100}
                min={DRINK_KCAL_MIN}
                max={DRINK_KCAL_MAX}
                step={1}
                error={errorFor("drinkKcalPer100")}
                onChange={(drinkKcalPer100) => patch({ drinkKcalPer100 })}
              />
              <NumberField
                id="nutrition-drink-carbs"
                label="Glucides pour 100 g (g)"
                value={values.drinkCarbsPer100}
                min={0}
                max={DRINK_CARBS_MAX}
                step={0.1}
                error={errorFor("drinkCarbsPer100")}
                onChange={(drinkCarbsPer100) => patch({ drinkCarbsPer100 })}
              />
              <NumberField
                id="nutrition-drink-salt"
                label="Sel pour 100 g (g)"
                value={values.drinkSaltPer100}
                min={DRINK_SALT_MIN}
                max={DRINK_SALT_MAX}
                step={0.1}
                error={errorFor("drinkSaltPer100")}
                onChange={(drinkSaltPer100) => patch({ drinkSaltPer100 })}
              />
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              className={`${BUTTON_BASE} bg-accent text-canvas hover:bg-accent-strong`}
            >
              Calculer ma nutrition
            </button>
            <button
              type="button"
              onClick={handleReset}
              className={`${BUTTON_BASE} border border-line text-ink hover:border-accent hover:text-accent-strong`}
            >
              Réinitialiser la nutrition
            </button>
          </div>
        </section>
      </form>

      <section
        className={`motion-safe:animate-rise rise-delay-2 ${CARD}`}
        aria-labelledby="titre-plan"
      >
        <h2 id="titre-plan" className={CARD_TITLE}>
          Plan de nutrition
        </h2>

        {plan ? (
          <div data-testid="nutrition-results" className="space-y-4">
            <div>
              <p className="text-sm text-muted">Unités solides à prendre</p>
              <p className="text-4xl font-bold leading-tight text-effort">
                <span data-testid="nutrition-units">{integer(plan.units)}</span>
                <span className="ml-1 text-base font-medium text-muted">
                  {plan.units > 1 ? "unités" : "unité"}
                </span>
              </p>
              {plan.intervalMinutes !== null ? (
                <p className="text-sm text-muted">
                  Une prise toutes les{" "}
                  <span data-testid="nutrition-interval">{integer(plan.intervalMinutes)}</span> min
                </p>
              ) : null}
              <p className="text-xs text-muted">
                Facteur limitant : {plan.limitingFactor === "carbs" ? "glucides" : "sodium"}
              </p>
            </div>

            {plan.drink ? (
              <div className={TILE}>
                <p className="text-xs text-muted">Boisson</p>
                <p className="text-sm text-ink">
                  <span data-testid="nutrition-drink-volume">{integer(plan.drink.volumeMl)}</span> ml
                  en {plan.drink.servings} prises · {decimal(plan.drink.powderG)} g de poudre
                </p>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className={TILE}>
                <p className="text-xs text-muted">Glucides ingérés</p>
                <p className="text-lg font-semibold text-ink">
                  <span data-testid="nutrition-total-carbs">{decimal(plan.totals.carbsG)}</span> g
                </p>
                <p className="text-xs text-muted">
                  <span data-testid="nutrition-rate-carbs">
                    {decimal(plan.rates.carbsGPerHour)}
                  </span>{" "}
                  g/h
                </p>
              </div>
              <div className={TILE}>
                <p className="text-xs text-muted">Sodium ingéré</p>
                <p className="text-lg font-semibold text-ink">
                  <span data-testid="nutrition-total-sodium">{integer(plan.totals.sodiumMg)}</span> mg
                </p>
                <p className="text-xs text-muted">
                  <span data-testid="nutrition-rate-sodium">
                    {integer(plan.rates.sodiumMgPerHour)}
                  </span>{" "}
                  mg/h
                </p>
              </div>
            </div>

            <p className="text-xs text-muted">
              Énergie ingérée : {integer(plan.totals.kcal)} kcal
            </p>

            {plan.warnings.map((warning) => (
              <p key={warning} data-testid="nutrition-warning" role="alert" className={ERROR_TEXT}>
                {warning}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Renseigne ton produit pour obtenir ton plan de nutrition.
          </p>
        )}
      </section>

      <p className="text-xs text-muted">Enregistré dans ce navigateur.</p>
      <p className="text-xs text-muted">
        Repères généraux, à adapter avec un professionnel de santé.
      </p>
    </div>
  );
}
