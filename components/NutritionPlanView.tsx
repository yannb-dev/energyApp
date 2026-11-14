"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import NutritionTimeline from "@/components/NutritionTimeline";
import { parseDecimal } from "@/lib/energy";
import {
  buildNutritionTimeline,
  computeCapUsage,
  computeNutritionPlan,
  DEFAULT_NUTRITION_VALUES,
  MINUTES_MAX,
  MINUTES_MIN,
  type NutritionFormValues,
  type NutritionPlan,
} from "@/lib/nutrition";
import { loadNutrition } from "@/lib/nutritionStorage";

const CARD =
  "rounded-2xl border border-line bg-surface p-4 shadow-lg shadow-canvas/60 sm:p-5";
const CARD_TITLE =
  "mb-3 text-sm font-semibold uppercase tracking-wide text-muted";
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

/** Affichage : valeur saisie à la française, sans zéros inutiles. */
function frenchNumber(raw: string): string {
  const parsed = parseDecimal(raw);
  if (parsed === null) {
    return raw;
  }
  return String(parsed).replace(".", ",");
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

type PlanState =
  | { status: "missing" }
  | { status: "ready"; values: NutritionFormValues; plan: NutritionPlan };

export default function NutritionPlanView() {
  const searchParams = useSearchParams();
  const rawMinutes = searchParams.get("min");
  const [state, setState] = useState<PlanState | null>(null);

  // Stockage et calcul lus après le montage : jamais pendant le rendu.
  useEffect(() => {
    const resolved = parseDuration(rawMinutes);
    const stored = resolved === null ? null : loadNutrition();
    const values: NutritionFormValues | null =
      resolved !== null && stored !== null
        ? { ...DEFAULT_NUTRITION_VALUES, ...stored, minutes: String(resolved) }
        : null;
    const plan = values ? computeNutritionPlan(values) : null;
    const next: PlanState =
      values && plan
        ? { status: "ready", values, plan }
        : { status: "missing" };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SPEC-02.1 : lecture du stockage demandée dans un useEffect
    setState(next);
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
          Renseigne ton produit et la durée de l&apos;effort pour afficher ton
          plan.
        </p>
        <Link href="/" className={LINK}>
          Revenir au formulaire
        </Link>
      </section>
    );
  }

  const { values, plan } = state;
  const timeline = buildNutritionTimeline(values, plan);
  const carbCap = parseDecimal(values.carbCap) ?? 0;
  const sodiumCap = parseDecimal(values.sodiumCap) ?? 0;
  const carbsUsage = computeCapUsage(plan.rates.carbsGPerHour, carbCap);
  const sodiumUsage = computeCapUsage(plan.rates.sodiumMgPerHour, sodiumCap);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/?min=${timeline.minutes}`}
        className={`motion-safe:animate-rise ${LINK}`}
      >
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
            <dd className="text-ink">{timeline.minutes} min</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Produit</dt>
            <dd className="text-right text-ink">
              {values.productName} · {values.productType}
            </dd>
          </div>
          {values.drinkEnabled ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Boisson</dt>
              <dd className="text-right text-ink">
                {values.drinkName} · {frenchNumber(values.drinkConcentration)}{" "}
                g/L
              </dd>
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
                <span data-testid="nutrition-interval">
                  {integer(plan.intervalMinutes)}
                </span>{" "}
                min
              </p>
            ) : null}
            <p className="text-xs text-muted">
              Facteur limitant :{" "}
              {plan.limitingFactor === "carbs" ? "glucides" : "sodium"}
            </p>
          </div>

          {plan.drink ? (
            <div className={TILE}>
              <p className="text-sm text-effort">Boisson</p>
              <p className="text-sm text-ink">
                <span data-testid="nutrition-drink-volume">
                  {integer(plan.drink.volumeMl)}
                </span>{" "}
                ml en {plan.drink.servings} prises ·{" "}
                {decimal(plan.drink.powderG)} g de poudre
              </p>
            </div>
          ) : null}

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
        </div>
      </section>

      <section
        className={`motion-safe:animate-rise ${CARD}`}
        aria-labelledby="titre-plafonds"
      >
        <h2 id="titre-plafonds" className={CARD_TITLE}>
          Plafonds
        </h2>
        <div className="space-y-4">
          <CapGauge
            testId="nutrition-cap-carbs"
            label="Glucides par heure"
            text={`Glucides : ${decimal(plan.rates.carbsGPerHour)} / ${frenchNumber(
              values.carbCap,
            )} g/h`}
            used={plan.rates.carbsGPerHour}
            cap={carbCap}
            ratio={carbsUsage.ratio}
            exceeded={carbsUsage.exceeded}
          />
          <CapGauge
            testId="nutrition-cap-sodium"
            label="Sodium par heure"
            text={`Sodium : ${integer(plan.rates.sodiumMgPerHour)} / ${frenchNumber(
              values.sodiumCap,
            )} mg/h`}
            used={plan.rates.sodiumMgPerHour}
            cap={sodiumCap}
            ratio={sodiumUsage.ratio}
            exceeded={sodiumUsage.exceeded}
          />
        </div>
      </section>

      <section
        className={`motion-safe:animate-rise ${CARD}`}
        aria-labelledby="titre-timeline"
      >
        <h2 id="titre-timeline" className={CARD_TITLE}>
          Timeline
        </h2>
        <NutritionTimeline timeline={timeline} />
      </section>

      <p className="text-xs text-muted">
        Repères généraux, à adapter avec un professionnel de santé.
      </p>
    </div>
  );
}
