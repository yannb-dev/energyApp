"use client";

import { useMemo, useRef, useState } from "react";

import InfoTooltip from "@/components/InfoTooltip";
import {
  ACTIVITY_LEVELS,
  AGE_MAX,
  AGE_MIN,
  computeEnergyResults,
  DEFAULT_ACTIVITY_INDEX,
  HEIGHT_CM_MAX,
  HEIGHT_CM_MIN,
  MINUTES_MAX,
  validateInputs,
  WEIGHT_KG_MAX,
  WEIGHT_KG_MIN,
  type EnergyField,
  type EnergyFormValues,
} from "@/lib/energy";
import { BMR_HELP, TDEE_HELP } from "@/lib/helpTexts";
import { findSport, SPORTS } from "@/lib/sports";

const EMPTY_VALUES: EnergyFormValues = {
  sex: "",
  age: "",
  weightKg: "",
  heightCm: "",
  sportId: "",
  minutes: "",
};

const CARD =
  "rounded-2xl border border-line bg-surface p-4 shadow-lg shadow-canvas/60 sm:p-5";
const CARD_TITLE =
  "mb-3 text-sm font-semibold uppercase tracking-wide text-muted";
const FIELD_LABEL = "mb-1 block text-sm font-medium text-ink";
const FIELD =
  "h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-accent-strong aria-invalid:border-danger";
const CHIP =
  "flex h-11 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface-2 text-sm font-medium text-muted transition-colors duration-200 hover:text-ink peer-checked:border-accent peer-checked:bg-accent peer-checked:font-semibold peer-checked:text-canvas peer-focus-visible:ring-2 peer-focus-visible:ring-accent-strong";
const BUTTON_BASE =
  "flex h-11 p-3 sm:p-2 flex-1 items-center justify-center rounded-md px-4 text-sm font-semibold transition duration-200 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 focus-visible:ring-offset-surface";
const TILE = "rounded-xl border border-line bg-surface-2 p-3";

type EnergyCalculatorProps = {
  /** Valeur initiale du champ « Durée (minutes) », relue par la page. */
  initialMinutes?: string;
  /** Appelée à chaque saisie de la durée et au Reset (avec une chaîne vide). */
  onMinutesChange?: (minutes: string) => void;
};

export default function EnergyCalculator({
  initialMinutes = "",
  onMinutesChange,
}: EnergyCalculatorProps = {}) {
  const [values, setValues] = useState<EnergyFormValues>(() => ({
    ...EMPTY_VALUES,
    minutes: initialMinutes,
  }));
  const [activityIndex, setActivityIndex] = useState(DEFAULT_ACTIVITY_INDEX);
  const [submitted, setSubmitted] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const activity = ACTIVITY_LEVELS[activityIndex];
  const sport = findSport(values.sportId);

  const errors = useMemo(() => validateInputs(values), [values]);
  const hasErrors = Object.keys(errors).length > 0;

  const results = useMemo(() => {
    if (hasErrors || !sport) {
      return null;
    }
    return computeEnergyResults(values, activity.coefficient, sport.met);
  }, [values, hasErrors, sport, activity.coefficient]);

  /** Un champ vide n'affiche son erreur qu'après une tentative de calcul. */
  function errorFor(field: EnergyField): string | null {
    const message = errors[field];
    if (!message) {
      return null;
    }
    if (!submitted && values[field].trim() === "") {
      return null;
    }
    return message;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  function handleReset() {
    setValues(EMPTY_VALUES);
    setActivityIndex(DEFAULT_ACTIVITY_INDEX);
    setSubmitted(false);
    firstFieldRef.current?.focus();
    onMinutesChange?.("");
  }

  const sexError = errorFor("sex");
  const ageError = errorFor("age");
  const weightError = errorFor("weightKg");
  const heightError = errorFor("heightCm");
  const sportError = errorFor("sportId");
  const minutesError = errorFor("minutes");

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <section
          className={`animate-rise ${CARD}`}
          aria-labelledby="titre-parametres"
        >
          <h2 id="titre-parametres" className={CARD_TITLE}>
            Paramètres
          </h2>

          <fieldset>
            <legend className={FIELD_LABEL}>Sexe</legend>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <input
                  ref={firstFieldRef}
                  id="sexe-homme"
                  type="radio"
                  name="sexe"
                  value="male"
                  checked={values.sex === "male"}
                  onChange={() =>
                    setValues((current) => ({ ...current, sex: "male" }))
                  }
                  className="peer sr-only"
                />
                <label htmlFor="sexe-homme" className={CHIP}>
                  Homme
                </label>
              </div>
              <div className="relative">
                <input
                  id="sexe-femme"
                  type="radio"
                  name="sexe"
                  value="female"
                  checked={values.sex === "female"}
                  onChange={() =>
                    setValues((current) => ({ ...current, sex: "female" }))
                  }
                  className="peer sr-only"
                />
                <label htmlFor="sexe-femme" className={CHIP}>
                  Femme
                </label>
              </div>
            </div>
            {sexError ? (
              <p role="alert" className="mt-1 text-sm text-danger">
                {sexError}
              </p>
            ) : null}
          </fieldset>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="age" className={FIELD_LABEL}>
                Âge (ans)
              </label>
              <input
                id="age"
                type="number"
                inputMode="numeric"
                min={AGE_MIN}
                max={AGE_MAX}
                step={1}
                value={values.age}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    age: event.target.value,
                  }))
                }
                aria-invalid={ageError ? true : undefined}
                aria-describedby={ageError ? "erreur-age" : undefined}
                className={FIELD}
              />
              {ageError ? (
                <p
                  id="erreur-age"
                  role="alert"
                  className="mt-1 text-sm text-danger"
                >
                  {ageError}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="poids" className={FIELD_LABEL}>
                Poids (kg)
              </label>
              <input
                id="poids"
                type="number"
                inputMode="decimal"
                min={WEIGHT_KG_MIN}
                max={WEIGHT_KG_MAX}
                step={0.1}
                value={values.weightKg}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    weightKg: event.target.value,
                  }))
                }
                aria-invalid={weightError ? true : undefined}
                aria-describedby={weightError ? "erreur-poids" : undefined}
                className={FIELD}
              />
              {weightError ? (
                <p
                  id="erreur-poids"
                  role="alert"
                  className="mt-1 text-sm text-danger"
                >
                  {weightError}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="taille" className={FIELD_LABEL}>
                Taille (cm)
              </label>
              <input
                id="taille"
                type="number"
                inputMode="decimal"
                min={HEIGHT_CM_MIN}
                max={HEIGHT_CM_MAX}
                step={0.1}
                value={values.heightCm}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    heightCm: event.target.value,
                  }))
                }
                aria-invalid={heightError ? true : undefined}
                aria-describedby={heightError ? "erreur-taille" : undefined}
                className={FIELD}
              />
              {heightError ? (
                <p
                  id="erreur-taille"
                  role="alert"
                  className="mt-1 text-sm text-danger"
                >
                  {heightError}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-3">
            <label htmlFor="activite" className={FIELD_LABEL}>
              Niveau d&apos;activité physique
            </label>
            <input
              id="activite"
              type="range"
              min={0}
              max={ACTIVITY_LEVELS.length - 1}
              step={1}
              value={activityIndex}
              onChange={(event) => setActivityIndex(Number(event.target.value))}
              aria-valuetext={activity.label}
              className="h-11 w-full cursor-pointer accent-accent focus-visible:ring-2 focus-visible:ring-accent-strong"
            />
            <div className="flex justify-between gap-1 text-xs text-muted">
              {ACTIVITY_LEVELS.map((level) => (
                <span
                  key={level.label}
                  data-testid="activity-level"
                  className={
                    level.label === activity.label
                      ? "font-semibold text-ink"
                      : "text-muted"
                  }
                >
                  {level.label}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted">
              <span
                data-testid="activity-label"
                className="font-semibold text-accent"
              >
                {activity.label}
              </span>{" "}
              <span data-testid="activity-label-detail" className=" text-muted">
                {activity.detail}
              </span>
            </p>
          </div>
        </section>

        <section
          className={`animate-rise rise-delay-1 ${CARD}`}
          aria-labelledby="titre-activite"
        >
          <h2 id="titre-activite" className={CARD_TITLE}>
            Activité
          </h2>

          <div>
            <label htmlFor="sport" className={FIELD_LABEL}>
              Sport
            </label>
            <div className="relative">
              <select
                id="sport"
                value={values.sportId}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    sportId: event.target.value,
                  }))
                }
                aria-invalid={sportError ? true : undefined}
                aria-describedby={sportError ? "erreur-sport" : undefined}
                className={`${FIELD} appearance-none pr-10`}
              >
                <option value="">— Choisis un sport —</option>
                {SPORTS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
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
            {sportError ? (
              <p
                id="erreur-sport"
                role="alert"
                className="mt-1 text-sm text-danger"
              >
                {sportError}
              </p>
            ) : null}
          </div>

          <div className="mt-3">
            <label htmlFor="duree" className={FIELD_LABEL}>
              Durée (minutes)
            </label>
            <input
              id="duree"
              type="number"
              inputMode="numeric"
              min={1}
              max={MINUTES_MAX}
              step={1}
              value={values.minutes}
              onChange={(event) => {
                const nextMinutes = event.target.value;
                setValues((current) => ({ ...current, minutes: nextMinutes }));
                onMinutesChange?.(nextMinutes);
              }}
              aria-invalid={minutesError ? true : undefined}
              aria-describedby={minutesError ? "erreur-duree" : undefined}
              className={FIELD}
            />
            {minutesError ? (
              <p
                id="erreur-duree"
                role="alert"
                className="mt-1 text-sm text-danger"
              >
                {minutesError}
              </p>
            ) : null}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              className={`${BUTTON_BASE} bg-accent text-canvas hover:bg-accent-strong`}
            >
              Calculer
            </button>
            <button
              type="button"
              onClick={handleReset}
              className={`${BUTTON_BASE} border border-line text-ink hover:border-accent hover:text-accent-strong`}
            >
              Reset
            </button>
          </div>
        </section>
      </form>

      <section
        className={`animate-rise rise-delay-2 ${CARD}`}
        aria-labelledby="titre-resultats"
      >
        <h2 id="titre-resultats" className={CARD_TITLE}>
          Résultats
        </h2>

        {results ? (
          <div data-testid="results" className="space-y-4">
            <div>
              <p className="text-sm text-muted">Coût de l&apos;effort</p>
              <p className="text-4xl font-bold leading-tight text-effort">
                <span data-testid="effort-kcal">
                  {Math.round(results.effortKcal)}
                </span>
                <span className="ml-1 text-base font-medium text-muted">
                  kcal
                </span>
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className={TILE}>
                <div className="flex items-start justify-between gap-1">
                  <p className="min-w-0 text-xs text-muted">
                    Dépense journalière
                  </p>
                  <InfoTooltip
                    id="help-tdee"
                    label="Aide : dépense journalière"
                    title="Dépense journalière"
                  >
                    {TDEE_HELP}
                  </InfoTooltip>
                </div>
                <p className="text-lg font-semibold text-ink">
                  <span data-testid="tdee">{Math.round(results.tdee)}</span>
                  <span className="ml-1 text-xs font-normal text-muted">
                    kcal
                  </span>
                </p>
              </div>
              <div className={TILE}>
                <div className="flex items-start justify-between gap-1">
                  <p className="min-w-0 text-xs text-muted">
                    Métabolisme de base
                  </p>
                  <InfoTooltip
                    id="help-bmr"
                    label="Aide : métabolisme de base"
                    title="Métabolisme de base"
                  >
                    {BMR_HELP}
                  </InfoTooltip>
                </div>
                <p className="text-lg font-semibold text-ink">
                  <span data-testid="bmr">{Math.round(results.bmr)}</span>
                  <span className="ml-1 text-xs font-normal text-muted">
                    kcal
                  </span>
                </p>
              </div>
              <div className={TILE}>
                <p className="text-xs text-muted">Part de l&apos;effort</p>
                <p className="text-lg font-semibold text-ink">
                  <span data-testid="effort-share">
                    {Math.round(results.effortShare)}
                  </span>
                  <span className="ml-1 text-xs font-normal text-muted">%</span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Renseigne ton profil et ton effort pour voir tes chiffres.
          </p>
        )}
      </section>

      <p className="text-xs text-muted">Estimation indicative, non médicale.</p>
    </div>
  );
}
