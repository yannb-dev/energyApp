"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  CerealBarIcon,
  FruitPasteIcon,
  GelIcon,
  FlaskIcon,
} from "@/components/NutritionIcons";
import InfoTooltip from "@/components/InfoTooltip";
import NutritionTimeline from "@/components/NutritionTimeline";
import { parseDecimal } from "@/lib/energy";
import { validateEffort, type EffortFormValues, type SpeedUnit } from "@/lib/effort";
import { LIMITING_FACTOR_HELP } from "@/lib/helpTexts";
import {
  buildMultiProductTimeline,
  CARB_CAP_MAX,
  CARB_CAP_MIN,
  computeCapUsage,
  computeHydrationRate,
  computeMultiProductPlan,
  DRINK_CARBS_MAX,
  DRINK_CONCENTRATION_MAX,
  DRINK_CONCENTRATION_MIN,
  DRINK_KCAL_MAX,
  DRINK_KCAL_MIN,
  DRINK_SALT_MAX,
  DRINK_SALT_MIN,
  HYDRATION_CAP_ML_PER_HOUR,
  HYDRATION_CAP_RECOMMENDED,
  MINUTES_MAX,
  MINUTES_MIN,
  SODIUM_CAP_MAX,
  SODIUM_CAP_MIN,
  type DrinkInput,
  type MultiProductPlan,
  type NutritionTimeline as TimelineData,
} from "@/lib/nutrition";
import { loadNutrition, type NutritionSettings } from "@/lib/nutritionStorage";
import { orderedSelected, productLabel, type Product, type ProductType } from "@/lib/products";
import { resolveStrategy, SINGLE_STRATEGY, type Strategy } from "@/lib/strategies";

const CARD = "rounded-2xl border border-line bg-surface p-4 shadow-lg shadow-canvas/60 sm:p-5";
const CARD_TITLE = "mb-3 text-sm font-semibold uppercase tracking-wide text-muted";
const TILE = "rounded-xl border border-line bg-surface-2 p-3";
const LINK =
  "flex h-11 items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold text-ink transition duration-200 hover:border-accent hover:text-accent-strong focus-visible:ring-2 focus-visible:ring-accent-strong";

/** Affichage : arrondi à l'entier (kcal, mg, ml, minutes). */
function integer(value: number): string {
  return String(Math.round(value));
}

/** Affichage : une décimale (g, g/h), virgule française. */
function decimal(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

/** `min` de l'URL : entier de 1 à 1440 minutes, sinon null. */
function parseDuration(raw: string | null): number | null {
  if (raw === null) {
    return null;
  }
  const parsed = parseDecimal(raw);
  if (parsed === null || !Number.isInteger(parsed)) {
    return null;
  }
  if (parsed < MINUTES_MIN || parsed > MINUTES_MAX) {
    return null;
  }
  return parsed;
}

function isSpeedUnit(value: string | null): value is SpeedUnit {
  return value === "kmh" || value === "minkm";
}

/** Lien « Modifier mes données » : effort restauré seulement si les trois paramètres sont valides. */
function effortHref(searchParams: { get(name: string): string | null }): string {
  const distanceKm = searchParams.get("km");
  const speed = searchParams.get("v");
  const unit = searchParams.get("u");

  if (distanceKm === null || speed === null || !isSpeedUnit(unit)) {
    return "/";
  }

  const effort: EffortFormValues = { distanceKm, speed, speedUnit: unit };
  if (Object.keys(validateEffort(effort)).length > 0) {
    return "/";
  }

  const search = new URLSearchParams({ km: distanceKm, v: speed, u: unit });
  return `/?${search.toString()}`;
}

/** Icône d'un solide selon son type. */
function SolidIcon({ type }: { type: ProductType }) {
  if (type === "Gel") {
    return <GelIcon />;
  }
  if (type === "Pâte de fruit") {
    return <FruitPasteIcon />;
  }
  return <CerealBarIcon />;
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
function CapGauge({ testId, label, text, used, cap, ratio, exceeded }: CapGaugeProps) {
  const width = Math.min(ratio, 1) * 100;

  return (
    <div>
      <p data-testid={testId} className={`text-sm font-medium ${exceeded ? "text-danger" : "text-ink"}`}>
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

type PlanState =
  | { status: "missing" }
  | {
      status: "ready";
      settings: NutritionSettings;
      minutes: number;
      products: Product[];
      strategy: Strategy;
      plan: MultiProductPlan;
      timeline: TimelineData;
    };

/** Lit une boisson valide depuis le stockage ; null dès qu'un champ est douteux. */
function readDrink(settings: NutritionSettings): DrinkInput | null | undefined {
  if (!settings.drinkEnabled) {
    return null;
  }
  const concentration = parseDecimal(settings.drinkConcentration);
  const kcalPer100 = parseDecimal(settings.drinkKcalPer100);
  const carbsPer100 = parseDecimal(settings.drinkCarbsPer100);
  const saltPer100 = parseDecimal(settings.drinkSaltPer100);

  if (concentration === null || kcalPer100 === null || carbsPer100 === null || saltPer100 === null) {
    return undefined;
  }
  if (
    concentration < DRINK_CONCENTRATION_MIN ||
    concentration > DRINK_CONCENTRATION_MAX ||
    kcalPer100 < DRINK_KCAL_MIN ||
    kcalPer100 > DRINK_KCAL_MAX ||
    carbsPer100 <= 0 ||
    carbsPer100 > DRINK_CARBS_MAX ||
    saltPer100 < DRINK_SALT_MIN ||
    saltPer100 > DRINK_SALT_MAX
  ) {
    return undefined;
  }

  return { concentration, kcalPer100, carbsPer100, saltPer100 };
}

/** Assemble le plan complet ; « missing » si une donnée indispensable manque. */
function buildPlanState(rawMinutes: string | null): PlanState {
  const minutes = parseDuration(rawMinutes);
  if (minutes === null) {
    return { status: "missing" };
  }

  const settings = loadNutrition();
  if (!settings) {
    return { status: "missing" };
  }

  const carbCap = parseDecimal(settings.carbCap);
  const sodiumCap = parseDecimal(settings.sodiumCap);
  if (
    carbCap === null ||
    sodiumCap === null ||
    carbCap < CARB_CAP_MIN ||
    carbCap > CARB_CAP_MAX ||
    sodiumCap < SODIUM_CAP_MIN ||
    sodiumCap > SODIUM_CAP_MAX
  ) {
    return { status: "missing" };
  }

  const drink = readDrink(settings);
  if (drink === undefined) {
    return { status: "missing" };
  }

  const products = orderedSelected(settings.products, settings.selectedIds);
  const strategy =
    products.length === 0
      ? SINGLE_STRATEGY
      : resolveStrategy(products.length === 3 ? 3 : products.length === 2 ? 2 : 1, settings.strategyKey);
  const shares = products.length === 0 ? [] : strategy.shares;

  const plan = computeMultiProductPlan({ carbCap, sodiumCap, minutes, products, shares, drink });
  const timeline = buildMultiProductTimeline({
    minutes,
    carbCap,
    sodiumCap,
    products,
    items: plan.items,
    order: strategy.order,
    drink: plan.drink,
  });

  return { status: "ready", settings, minutes, products, strategy, plan, timeline };
}

export default function NutritionPlanView() {
  const searchParams = useSearchParams();
  const rawMinutes = searchParams.get("min");
  const [state, setState] = useState<PlanState | null>(null);

  // Stockage et calcul lus après le montage : jamais pendant le rendu.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SPEC-02.1 : lecture du stockage demandée dans un useEffect
    setState(buildPlanState(rawMinutes));
  }, [rawMinutes]);

  if (state === null) {
    return null;
  }

  if (state.status === "missing") {
    return (
      <section className={CARD} aria-labelledby="titre-introuvable">
        <h2 id="titre-introuvable" className={CARD_TITLE}>
          Données introuvables
        </h2>
        <p className="mb-4 text-sm text-muted">
          Renseigne tes produits et la durée de l&apos;effort pour afficher ton plan.
        </p>
        <Link href="/" className={LINK}>
          Revenir au formulaire
        </Link>
      </section>
    );
  }

  const { settings, minutes, products, strategy, plan, timeline } = state;
  const carbCap = parseDecimal(settings.carbCap) ?? 0;
  const sodiumCap = parseDecimal(settings.sodiumCap) ?? 0;
  const carbsUsage = computeCapUsage(plan.rates.carbsGPerHour, carbCap);
  const sodiumUsage = computeCapUsage(plan.rates.sodiumMgPerHour, sodiumCap);
  const waterRate = computeHydrationRate(plan, minutes);
  const waterUsage = computeCapUsage(waterRate, HYDRATION_CAP_ML_PER_HOUR);

  return (
    <div className="flex flex-col gap-4">
      <Link href={effortHref(searchParams)} className={`motion-safe:animate-rise ${LINK}`}>
        Modifier mes données
      </Link>

      <section
        className={`motion-safe:animate-rise rise-delay-1 ${CARD}`}
        aria-labelledby="titre-rappel"
      >
        <h2 id="titre-rappel" className={CARD_TITLE}>
          Rappel
        </h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Durée</dt>
            <dd className="text-ink">{minutes} min</dd>
          </div>
          {products.map((product, index) => (
            <div key={product.id} className="flex justify-between gap-3">
              <dt className="text-muted">{productLabel(index)}</dt>
              <dd className="text-right text-ink">
                {product.name} · {product.type}
              </dd>
            </div>
          ))}
          {settings.drinkEnabled ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Boisson</dt>
              <dd className="text-right text-ink">
                {settings.drinkName} · Dosage {settings.drinkConcentration.replace(".", ",")} g/L
              </dd>
            </div>
          ) : null}
          {products.length > 1 ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Stratégie</dt>
              <dd className="text-right text-ink">{strategy.label}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section
        className={`motion-safe:animate-rise rise-delay-2 ${CARD}`}
        aria-labelledby="titre-resultats"
      >
        <h2 id="titre-resultats" className={CARD_TITLE}>
          Résultats
        </h2>

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
                    <SolidIcon type={product.type} />
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
                <FlaskIcon />
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
                    {plan.drink.servings} prises · {decimal(plan.drink.powderG)} g de poudre
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-muted">Aucune boisson</p>
              )}
            </div>
          </div>

          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 text-xs text-muted">
              Facteur limitant : {plan.limitingFactor === "carbs" ? "glucides" : "sodium"}
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
                <span data-testid="nutrition-total-carbs">{decimal(plan.totals.carbsG)}</span> g
              </p>
              <p className="text-xs text-muted">
                <span data-testid="nutrition-rate-carbs">{decimal(plan.rates.carbsGPerHour)}</span>{" "}
                g/h
              </p>
            </div>
            <div className={TILE}>
              <p className="text-xs text-effort">Sodium ingéré</p>
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

          <p className="text-xs text-muted">Énergie ingérée : {integer(plan.totals.kcal)} kcal</p>

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
        </div>
      </section>

      <section className={`motion-safe:animate-rise ${CARD}`} aria-labelledby="titre-plafonds">
        <h2 id="titre-plafonds" className={CARD_TITLE}>
          Plafonds
        </h2>
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
              Repère usuel : {HYDRATION_CAP_RECOMMENDED.min} à {HYDRATION_CAP_RECOMMENDED.max} ml/h
            </p>
          </div>
        </div>
      </section>

      <section className={`motion-safe:animate-rise ${CARD}`} aria-labelledby="titre-timeline">
        <h2 id="titre-timeline" className={CARD_TITLE}>
          Timeline
        </h2>
        <NutritionTimeline products={products} plan={plan} timeline={timeline} />
      </section>

      <p className="text-xs text-muted">Repères généraux, à adapter avec un professionnel de santé.</p>
    </div>
  );
}
