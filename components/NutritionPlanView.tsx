"use client";

import { useMemo } from "react";
import Link from "next/link";

import InfoTooltip from "@/components/InfoTooltip";
import NutritionTimeline from "@/components/NutritionTimeline";
import { useActivity } from "@/components/providers/ActivityProvider";
import { useUserSettings } from "@/components/providers/UserSettingsProvider";
import CourseProfile from "@/components/results/CourseProfile";
import EnergySummary from "@/components/results/EnergySummary";
import ProductRecap from "@/components/results/ProductRecap";
import { parseDecimal } from "@/lib/energy";
import {
  buildMultiProductTimeline,
  computeMultiProductPlan,
  type DrinkInput,
  type MultiProductPlan,
  type NutritionTimeline as TimelineData,
} from "@/lib/nutrition";
import type { NutritionSettings } from "@/lib/nutritionStorage";
import type { ProfileSettings } from "@/lib/profileStorage";
import { orderedSelected, productLabel, type Product } from "@/lib/products";
import { capsSchema, drinkSchema } from "@/lib/schemas/nutrition";
import { findSport } from "@/lib/sports";
import {
  resolveStrategy,
  SINGLE_STRATEGY,
  type Strategy,
} from "@/lib/strategies";

const CARD =
  "rounded-2xl border border-line bg-surface p-4 shadow-lg shadow-canvas/60 sm:p-5";
const CARD_TITLE =
  "mb-3 text-sm font-semibold uppercase tracking-wide text-muted";
const SUB_TITLE = "mb-2 text-base font-semibold text-ink";
const LINK =
  "flex h-11 items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold text-ink transition duration-200 hover:border-accent hover:text-accent-strong focus-visible:ring-2 focus-visible:ring-accent-strong";

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

/** Assemble le plan complet ; « missing » si une donnée indispensable manque. */
function buildPlanState(
  profile: ProfileSettings | null,
  minutes: number | null,
  settings: NutritionSettings | null,
): PlanState {
  if (profile === null || minutes === null || settings === null) {
    return { status: "missing" };
  }

  const caps = capsSchema.safeParse({
    carbCap: settings.carbCap,
    sodiumCap: settings.sodiumCap,
  });
  if (!caps.success) {
    return { status: "missing" };
  }

  const carbCap = parseDecimal(settings.carbCap);
  const sodiumCap = parseDecimal(settings.sodiumCap);
  if (carbCap === null || sodiumCap === null) {
    return { status: "missing" };
  }

  const drinkCheck = drinkSchema.safeParse({
    drinkEnabled: settings.drinkEnabled,
    drinkBrand: settings.drinkBrand,
    drinkName: settings.drinkName,
    drinkConcentration: settings.drinkConcentration,
    drinkKcalPer100: settings.drinkKcalPer100,
    drinkCarbsPer100: settings.drinkCarbsPer100,
    drinkSaltPer100: settings.drinkSaltPer100,
  });
  if (!drinkCheck.success) {
    return { status: "missing" };
  }

  let drink: DrinkInput | null = null;
  if (settings.drinkEnabled) {
    const concentration = parseDecimal(settings.drinkConcentration);
    const kcalPer100 = parseDecimal(settings.drinkKcalPer100);
    const carbsPer100 = parseDecimal(settings.drinkCarbsPer100);
    const saltPer100 = parseDecimal(settings.drinkSaltPer100);
    if (
      concentration === null ||
      kcalPer100 === null ||
      carbsPer100 === null ||
      saltPer100 === null
    ) {
      return { status: "missing" };
    }
    drink = { concentration, kcalPer100, carbsPer100, saltPer100 };
  }

  const products = orderedSelected(settings.products, settings.selectedIds);
  const strategy =
    products.length === 0
      ? SINGLE_STRATEGY
      : resolveStrategy(
          products.length === 3 ? 3 : products.length === 2 ? 2 : 1,
          settings.strategyKey,
        );
  const shares = products.length === 0 ? [] : strategy.shares;

  const plan = computeMultiProductPlan({
    carbCap,
    sodiumCap,
    minutes,
    products,
    shares,
    drink,
  });
  const timeline = buildMultiProductTimeline({
    minutes,
    carbCap,
    sodiumCap,
    products,
    items: plan.items,
    order: strategy.order,
    drink: plan.drink,
  });

  return {
    status: "ready",
    settings,
    minutes,
    products,
    strategy,
    plan,
    timeline,
  };
}

export default function NutritionPlanView() {
  const { status, nutrition, profile } = useUserSettings();
  const { activity, minutes: activityMinutes } = useActivity();
  const state = useMemo<PlanState | null>(
    () =>
      status === "ready"
        ? buildPlanState(profile, activityMinutes, nutrition)
        : null,
    [status, profile, activityMinutes, nutrition],
  );

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
          Renseigne tes produits et la durée de l&apos;effort pour afficher ton
          plan.
        </p>
        <Link href="/" className={LINK}>
          Revenir au formulaire
        </Link>
      </section>
    );
  }

  const { settings, minutes, products, strategy, plan, timeline } = state;
  const sport = findSport(activity.sportId);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/" className={`motion-safe:animate-rise ${LINK}`}>
        Modifier mes données
      </Link>

      <div className="motion-safe:animate-rise rise-delay-1">
        <InfoTooltip
          id="help-rappel"
          label="Rappel de l'activité"
          title="Rappel"
        >
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Sport</dt>
              <dd className="text-right text-ink">
                {sport ? sport.label : "Aucun sport"}
              </dd>
            </div>
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
                  {settings.drinkName} · Dosage{" "}
                  {settings.drinkConcentration.replace(".", ",")} g/L
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
        </InfoTooltip>
      </div>

      <section
        className={`motion-safe:animate-rise rise-delay-2 ${CARD}`}
        aria-labelledby="titre-resultats"
      >
        <h2 id="titre-resultats" className={CARD_TITLE}>
          Résultats
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className={SUB_TITLE}>Dépense énergétique</h3>
            <EnergySummary />
          </div>

          <div>
            <h3 className={SUB_TITLE}>Récap produits</h3>
            <ProductRecap
              products={products}
              plan={plan}
              settings={settings}
              minutes={minutes}
            />
          </div>

          <CourseProfile />

          <div>
            <h3 className={SUB_TITLE}>Timeline</h3>
            <NutritionTimeline
              products={products}
              plan={plan}
              timeline={timeline}
            />
          </div>
        </div>
      </section>

      <p className="text-xs text-muted">
        Repères généraux, à adapter avec un professionnel de santé.
      </p>
    </div>
  );
}
