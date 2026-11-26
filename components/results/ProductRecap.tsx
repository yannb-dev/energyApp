"use client";

/**
 * Récap produits (SPEC-08.5) : unités, liquide, facteur limitant, totaux,
 * avertissements et jauges des plafonds. Déplacé depuis `NutritionPlanView`.
 */

import { BottleIcon, SolidIcon } from "@/components/NutritionIcons";
import InfoTooltip from "@/components/InfoTooltip";
import { parseDecimal } from "@/lib/energy";
import { LIMITING_FACTOR_HELP } from "@/lib/helpTexts";
import {
  computeCapUsage,
  computeHydrationRate,
  HYDRATION_CAP_ML_PER_HOUR,
  HYDRATION_CAP_RECOMMENDED,
  type MultiProductPlan,
} from "@/lib/nutrition";
import type { NutritionSettings } from "@/lib/nutritionStorage";
import { productLabel, type Product } from "@/lib/products";

const TILE = "rounded-xl border border-line bg-surface-2 p-3";

/** Affichage : arrondi à l'entier (kcal, mg, ml, minutes). */
function integer(value: number): string {
  return String(Math.round(value));
}

/** Affichage : une décimale (g, g/h), virgule française. */
function decimal(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

type CapGaugeProps = {
  testId: string;
  label: string;
  text: string;
  used: number;
  cap: number;
  ratio: number;
  exceeded: boolean;
};

/** Ligne de plafond : valeur en texte + jauge proportionnelle. */
function CapGauge({
  testId,
  label,
  text,
  used,
  cap,
  ratio,
  exceeded,
}: CapGaugeProps) {
  const width = Math.min(ratio, 1) * 100;

  return (
    <div>
      <p
        data-testid={testId}
        className={`text-sm font-medium ${exceeded ? "text-danger" : "text-ink"}`}
      >
        {text}
      </p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={cap}
          aria-valuenow={Math.round(used * 10) / 10}
          aria-valuetext={text}
          className={`h-full rounded-full ${exceeded ? "bg-danger" : "bg-effort"}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

type ProductRecapProps = {
  products: Product[];
  plan: MultiProductPlan;
  settings: NutritionSettings;
  minutes: number;
};

export default function ProductRecap({
  products,
  plan,
  settings,
  minutes,
}: ProductRecapProps) {
  const carbCap = parseDecimal(settings.carbCap) ?? 0;
  const sodiumCap = parseDecimal(settings.sodiumCap) ?? 0;
  const carbsUsage = computeCapUsage(plan.rates.carbsGPerHour, carbCap);
  const sodiumUsage = computeCapUsage(plan.rates.sodiumMgPerHour, sodiumCap);
  const waterRate = computeHydrationRate(plan, minutes);
  const waterUsage = computeCapUsage(waterRate, HYDRATION_CAP_ML_PER_HOUR);

  return (
    <div data-testid="nutrition-results" className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {products.map((product, index) => {
          const item = plan.items.find((entry) => entry.productId === product.id);
          const units = item?.units ?? 0;
          return (
            <div
              key={product.id}
              data-testid="nutrition-product-result"
              data-product-id={product.id}
              className={TILE}
            >
              <div className="flex items-center gap-1.5">
                <SolidIcon className="w-[20%]" type={product.type} />
                <p className="text-xs text-muted">{productLabel(index)}</p>
              </div>
              <p className="mt-1 text-4xl font-bold leading-tight text-effort">
                <span data-testid="nutrition-units">{integer(units)}</span>
                <span className="ml-1 text-base font-medium text-muted">
                  {units > 1 ? "unités" : "unité"}
                </span>
              </p>
              <p className="text-xs text-muted">
                {product.name} · {product.type}
              </p>
            </div>
          );
        })}

        <div data-testid="nutrition-result-liquid" className={TILE}>
          <div className="flex items-center gap-1.5">
            <BottleIcon className="w-[12%]" />
            <p className="text-xs text-muted">Liquide</p>
          </div>
          {plan.drink ? (
            <>
              <p className="mt-1 text-4xl font-bold leading-tight text-effort">
                <span data-testid="nutrition-drink-volume">
                  {integer(plan.drink.volumeMl)}
                </span>
                <span className="ml-1 text-base font-medium text-muted"> ml</span>
              </p>
              <p className="text-xs text-muted">
                {plan.drink.servings} prises · {decimal(plan.drink.powderG)} g de
                poudre
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">Aucune boisson</p>
          )}
        </div>
      </div>

      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-xs text-muted">
          Facteur limitant :{" "}
          {plan.limitingFactor === "carbs" ? "glucides" : "sodium"}
        </p>
        <InfoTooltip
          id="help-limiting-factor"
          label="Aide : facteur limitant"
          title="Facteur limitant"
        >
          {LIMITING_FACTOR_HELP}
        </InfoTooltip>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className={TILE}>
          <p className="text-xs text-effort">Glucides ingérés</p>
          <p className="text-lg font-semibold text-ink">
            <span data-testid="nutrition-total-carbs">
              {decimal(plan.totals.carbsG)}
            </span>{" "}
            g
          </p>
          <p className="text-xs text-muted">
            <span data-testid="nutrition-rate-carbs">
              {decimal(plan.rates.carbsGPerHour)}
            </span>{" "}
            g/h
          </p>
        </div>
        <div className={TILE}>
          <p className="text-xs text-effort">Sodium ingéré</p>
          <p className="text-lg font-semibold text-ink">
            <span data-testid="nutrition-total-sodium">
              {integer(plan.totals.sodiumMg)}
            </span>{" "}
            mg
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
        <p
          key={warning}
          data-testid="nutrition-warning"
          role="alert"
          className="text-sm text-danger"
        >
          {warning}
        </p>
      ))}

      <div className="space-y-4">
        <CapGauge
          testId="nutrition-cap-carbs"
          label="Glucides par heure"
          text={`Glucides : ${decimal(plan.rates.carbsGPerHour)} / ${settings.carbCap.replace(
            ".",
            ",",
          )} g/h`}
          used={plan.rates.carbsGPerHour}
          cap={carbCap}
          ratio={carbsUsage.ratio}
          exceeded={carbsUsage.exceeded}
        />
        <CapGauge
          testId="nutrition-cap-sodium"
          label="Sodium par heure"
          text={`Sodium : ${integer(plan.rates.sodiumMgPerHour)} / ${settings.sodiumCap.replace(
            ".",
            ",",
          )} mg/h`}
          used={plan.rates.sodiumMgPerHour}
          cap={sodiumCap}
          ratio={sodiumUsage.ratio}
          exceeded={sodiumUsage.exceeded}
        />
        <div>
          <CapGauge
            testId="nutrition-cap-water"
            label="Boisson par heure"
            text={`Eau : ${integer(waterRate)} ml/h`}
            used={waterRate}
            cap={HYDRATION_CAP_ML_PER_HOUR}
            ratio={waterUsage.ratio}
            exceeded={waterUsage.exceeded}
          />
          <p className="mt-1 text-xs text-muted">
            Repère usuel : {HYDRATION_CAP_RECOMMENDED.min} à{" "}
            {HYDRATION_CAP_RECOMMENDED.max} ml/h
          </p>
        </div>
      </div>
    </div>
  );
}
