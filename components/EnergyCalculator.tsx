"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import InfoTooltip from "@/components/InfoTooltip";
import GpxActivity from "@/components/GpxActivity";
import { useActivity } from "@/components/providers/ActivityProvider";
import { useUserSettings } from "@/components/providers/UserSettingsProvider";
import type { InputMode } from "@/lib/activity";
import {
  ACTIVITY_LEVELS,
  AGE_MAX,
  AGE_MIN,
  computeEnergyResults,
  DEFAULT_ACTIVITY_INDEX,
  HEIGHT_CM_MAX,
  HEIGHT_CM_MIN,
  validateInputs,
  WEIGHT_KG_MAX,
  WEIGHT_KG_MIN,
  type EnergyField,
  type EnergyFormValues,
} from "@/lib/energy";
import {
  computeEffortDuration,
  convertSpeed,
  formatDuration,
  formatPace,
  validateEffort,
  type SpeedUnit,
} from "@/lib/effort";
import {
  EMPTY_ATHLETE,
  validateAthlete,
  type AthleteField,
  type AthleteSettings,
} from "@/lib/athleteStorage";
import { BMR_HELP, PMA_HELP, TDEE_HELP, VMA_HELP } from "@/lib/helpTexts";
import { BIKE_POSITIONS } from "@/lib/intensity";
import { findSport, SPORTS, supportsGpx } from "@/lib/sports";

const EMPTY_VALUES: EnergyFormValues = {
  sex: "",
  age: "",
  weightKg: "",
  heightCm: "",
  sportId: "",
  minutes: "",
};

/** Champs enregistrés par le bouton « Valider » (le sport et l'effort en sont exclus). */
const PROFILE_FIELDS = ["sex", "age", "weightKg", "heightCm"] as const;

type ProfileField = (typeof PROFILE_FIELDS)[number];

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

/** Affichage : km/h arrondis à 0,1, virgule française, sans zéro inutile. */
function speedLabelKmh(speedKmh: number): string {
  return String(Math.round(speedKmh * 10) / 10).replace(".", ",");
}

export default function EnergyCalculator() {
  const {
    profile: storedProfile,
    athlete: storedAthlete,
    updateProfile,
    updateAthlete,
  } = useUserSettings();
  const { activity, minutes, dispatch } = useActivity();
  const [values, setValues] = useState<EnergyFormValues>(() =>
    storedProfile
      ? {
          ...EMPTY_VALUES,
          sex: storedProfile.sex,
          age: storedProfile.age,
          weightKg: storedProfile.weightKg,
          heightCm: storedProfile.heightCm,
        }
      : EMPTY_VALUES,
  );
  const [athlete, setAthlete] = useState<AthleteSettings>(
    () => storedAthlete ?? EMPTY_ATHLETE,
  );
  const [activityIndex, setActivityIndex] = useState(
    () => storedProfile?.activityIndex ?? DEFAULT_ACTIVITY_INDEX,
  );
  const [submitted, setSubmitted] = useState(false);
  /** Bloc « Paramètres » : true = édition, false = replié après validation. */
  const [profileOpen, setProfileOpen] = useState(() => storedProfile === null);
  /** Une tentative de validation du profil affiche les erreurs des champs vides. */
  const [profileAttempted, setProfileAttempted] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const ageFieldRef = useRef<HTMLInputElement>(null);
  const weightFieldRef = useRef<HTMLInputElement>(null);
  const heightFieldRef = useRef<HTMLInputElement>(null);
  const vmaFieldRef = useRef<HTMLInputElement>(null);
  const pmaFieldRef = useRef<HTMLInputElement>(null);
  const bikeWeightFieldRef = useRef<HTMLInputElement>(null);
  const sportRef = useRef<HTMLSelectElement>(null);
  const modifyButtonRef = useRef<HTMLButtonElement>(null);
  /** Focus à poser après un changement d'état du bloc (l'élément n'existe pas encore). */
  const pendingFocusRef = useRef<"modify" | "firstField" | null>(null);

  const activityLevel = ACTIVITY_LEVELS[activityIndex];
  const sport = findSport(activity.sportId);
  const gpxAvailable = sport !== undefined && supportsGpx(sport);
  const isPace = activity.effort.speedUnit === "minkm";

  const errors = useMemo(
    () => validateInputs({ ...values, sportId: activity.sportId }),
    [values, activity.sportId],
  );
  const hasErrors = Object.keys(errors).length > 0;

  const effortErrors = useMemo(
    () => validateEffort(activity.effort),
    [activity.effort],
  );

  const athleteErrors = useMemo(() => validateAthlete(athlete), [athlete]);

  const effortDuration = useMemo(
    () => computeEffortDuration(activity.effort),
    [activity.effort],
  );

  // Focus différé : la cible vient d'apparaître (bloc replié ou rouvert).
  useEffect(() => {
    const target = pendingFocusRef.current;
    if (target === "modify" && !profileOpen) {
      pendingFocusRef.current = null;
      modifyButtonRef.current?.focus();
    }
    if (target === "firstField" && profileOpen) {
      pendingFocusRef.current = null;
      firstFieldRef.current?.focus();
    }
  }, [profileOpen]);

  /** « Modifier mes paramètres » du mode GPX : rouvre le bloc ou cible la VMA. */
  function handleOpenSettings() {
    if (profileOpen) {
      vmaFieldRef.current?.focus();
      return;
    }
    pendingFocusRef.current = "firstField";
    setProfileOpen(true);
  }

  const results = useMemo(() => {
    if (hasErrors || !sport || minutes === null) {
      return null;
    }
    return computeEnergyResults(
      { ...values, sportId: activity.sportId, minutes: String(minutes) },
      activityLevel.coefficient,
      sport.met,
    );
  }, [
    values,
    activity.sportId,
    minutes,
    hasErrors,
    sport,
    activityLevel.coefficient,
  ]);

  /** Un champ vide n'affiche son erreur qu'après une tentative de calcul ou de validation. */
  function errorFor(field: EnergyField): string | null {
    const message = errors[field];
    if (!message) {
      return null;
    }
    if (values[field].trim() === "") {
      const isProfileField = PROFILE_FIELDS.some((profileField) => profileField === field);
      if (!submitted && !(isProfileField && profileAttempted)) {
        return null;
      }
    }
    return message;
  }

  /** Même mécanique pour les champs d'effort : erreur après saisie ou soumission. */
  function effortError(field: "distanceKm" | "speed"): string | null {
    const message = effortErrors[field];
    if (!message) {
      return null;
    }
    if (!submitted && activity.effort[field].trim() === "") {
      return null;
    }
    return message;
  }

  /** Idem pour les champs athlète : un champ vide n'affiche rien avant « Valider ». */
  function athleteErrorFor(field: AthleteField): string | null {
    const message = athleteErrors[field];
    if (!message) {
      return null;
    }
    if (athlete[field].trim() === "" && !profileAttempted) {
      return null;
    }
    return message;
  }

  function focusProfileField(field: ProfileField) {
    if (field === "sex") {
      firstFieldRef.current?.focus();
    } else if (field === "age") {
      ageFieldRef.current?.focus();
    } else if (field === "weightKg") {
      weightFieldRef.current?.focus();
    } else {
      heightFieldRef.current?.focus();
    }
  }

  /** « Valider » enregistre le profil et les données athlète ; sport et effort ne bloquent pas. */
  function handleValidateProfile() {
    setProfileAttempted(true);

    const invalidField = PROFILE_FIELDS.find(
      (field) => errors[field] !== undefined,
    );
    if (invalidField) {
      focusProfileField(invalidField);
      return;
    }
    if (athleteErrors.vmaKmh) {
      vmaFieldRef.current?.focus();
      return;
    }
    if (athleteErrors.pmaWatts) {
      pmaFieldRef.current?.focus();
      return;
    }
    if (athleteErrors.bikeKg) {
      bikeWeightFieldRef.current?.focus();
      return;
    }
    if (values.sex !== "male" && values.sex !== "female") {
      return;
    }

    updateProfile({
      sex: values.sex,
      age: values.age,
      weightKg: values.weightKg,
      heightCm: values.heightCm,
      activityIndex,
    });
    updateAthlete({
      ...athlete,
      bikeKg: athlete.hasBike ? athlete.bikeKg : "",
    });

    pendingFocusRef.current = "modify";
    setProfileOpen(false);
  }

  /** Cocher ou décocher le vélo ; sans vélo, le poids du vélo est oublié. */
  function handleBikeToggle(hasBike: boolean) {
    setAthlete((current) => ({
      ...current,
      hasBike,
      bikeKg: hasBike ? current.bikeKg : "",
    }));
  }

  /** Position aéro limitée aux identifiants de `BIKE_POSITIONS`. */
  function handleBikePosition(id: string) {
    const position = BIKE_POSITIONS.find((item) => item.id === id);
    if (!position) {
      return;
    }
    setAthlete((current) => ({ ...current, bikePosition: position.id }));
  }

  /** Rouvre le bloc avec les valeurs courantes ; rien n'est réenregistré sans « Valider ». */
  function handleEditProfile() {
    pendingFocusRef.current = "firstField";
    setProfileOpen(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  /** Reset : sport, distance et vitesse seulement — le profil et l'état replié sont conservés. */
  function handleReset() {
    dispatch({ type: "reset" });
    setSubmitted(false);
    sportRef.current?.focus();
  }

  /** Le sport ne change l'unité que si la vitesse est encore vide. */
  function handleSport(nextSportId: string) {
    dispatch({ type: "sportChanged", sportId: nextSportId });
  }

  /** Bascule manuel / GPX : les champs manuels ne sont jamais vidés. */
  function handleInputMode(mode: InputMode) {
    dispatch({ type: "inputModeChanged", mode });
  }

  function handleUnitChange(unit: SpeedUnit) {
    if (activity.effort.speedUnit === unit) {
      return;
    }
    dispatch({
      type: "effortChanged",
      effort: {
        ...activity.effort,
        speedUnit: unit,
        speed: convertSpeed(activity.effort.speed, activity.effort.speedUnit, unit),
      },
    });
  }

  const sexError = errorFor("sex");
  const ageError = errorFor("age");
  const weightError = errorFor("weightKg");
  const heightError = errorFor("heightCm");
  const sportError = errorFor("sportId");
  const distanceError = effortError("distanceKm");
  const speedError = effortError("speed");
  const vmaError = athleteErrorFor("vmaKmh");
  const pmaError = athleteErrorFor("pmaWatts");
  const bikeWeightError = athleteErrorFor("bikeKg");

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

          {profileOpen ? (
            <>
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
                ref={ageFieldRef}
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
                ref={weightFieldRef}
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
                ref={heightFieldRef}
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
              aria-valuetext={activityLevel.label}
              className="h-11 w-full cursor-pointer accent-accent focus-visible:ring-2 focus-visible:ring-accent-strong"
            />
            <div className="flex justify-between gap-1 text-xs text-muted">
              {ACTIVITY_LEVELS.map((level) => (
                <span
                  key={level.label}
                  data-testid="activity-level"
                  className={
                    level.label === activityLevel.label
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
                {activityLevel.label}
              </span>{" "}
              <span data-testid="activity-label-detail" className=" text-muted">
                {activityLevel.detail}
              </span>
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="vma" className={FIELD_LABEL}>
                VMA (km/h)
              </label>
              <input
                ref={vmaFieldRef}
                id="vma"
                type="text"
                inputMode="decimal"
                value={athlete.vmaKmh}
                onChange={(event) =>
                  setAthlete((current) => ({
                    ...current,
                    vmaKmh: event.target.value,
                  }))
                }
                aria-invalid={vmaError ? true : undefined}
                aria-describedby={vmaError ? "erreur-vma" : undefined}
                className={FIELD}
              />
              {vmaError ? (
                <p
                  id="erreur-vma"
                  role="alert"
                  className="mt-1 text-sm text-danger"
                >
                  {vmaError}
                </p>
              ) : null}
              <div className="mt-1 flex justify-end">
                <InfoTooltip id="help-vma" label="Aide : VMA" title="VMA">
                  {VMA_HELP}
                </InfoTooltip>
              </div>
            </div>

            <div>
              <label htmlFor="pma" className={FIELD_LABEL}>
                PMA (W)
              </label>
              <input
                ref={pmaFieldRef}
                id="pma"
                type="text"
                inputMode="numeric"
                value={athlete.pmaWatts}
                onChange={(event) =>
                  setAthlete((current) => ({
                    ...current,
                    pmaWatts: event.target.value,
                  }))
                }
                aria-invalid={pmaError ? true : undefined}
                aria-describedby={pmaError ? "erreur-pma" : undefined}
                className={FIELD}
              />
              {pmaError ? (
                <p
                  id="erreur-pma"
                  role="alert"
                  className="mt-1 text-sm text-danger"
                >
                  {pmaError}
                </p>
              ) : null}
              <div className="mt-1 flex justify-end">
                <InfoTooltip id="help-pma" label="Aide : PMA" title="PMA">
                  {PMA_HELP}
                </InfoTooltip>
              </div>
            </div>
          </div>

          <div className="mt-2">
            <label
              htmlFor="ajouter-velo"
              className="flex h-11 w-fit cursor-pointer items-center gap-3 text-sm font-medium text-ink"
            >
              <input
                id="ajouter-velo"
                type="checkbox"
                checked={athlete.hasBike}
                onChange={(event) => handleBikeToggle(event.target.checked)}
                className="h-5 w-5 rounded border-line accent-accent focus-visible:ring-2 focus-visible:ring-accent-strong"
              />
              Ajouter un vélo
            </label>
          </div>

          {athlete.hasBike ? (
            <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="poids-velo" className={FIELD_LABEL}>
                  Poids du vélo (kg)
                </label>
                <input
                  ref={bikeWeightFieldRef}
                  id="poids-velo"
                  type="text"
                  inputMode="decimal"
                  value={athlete.bikeKg}
                  onChange={(event) =>
                    setAthlete((current) => ({
                      ...current,
                      bikeKg: event.target.value,
                    }))
                  }
                  aria-invalid={bikeWeightError ? true : undefined}
                  aria-describedby={
                    bikeWeightError ? "erreur-poids-velo" : undefined
                  }
                  className={FIELD}
                />
                {bikeWeightError ? (
                  <p
                    id="erreur-poids-velo"
                    role="alert"
                    className="mt-1 text-sm text-danger"
                  >
                    {bikeWeightError}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="position-aero" className={FIELD_LABEL}>
                  Position aéro
                </label>
                <select
                  id="position-aero"
                  value={athlete.bikePosition}
                  onChange={(event) => handleBikePosition(event.target.value)}
                  className={FIELD}
                >
                  {BIKE_POSITIONS.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

              <div className="mt-4 flex">
                <button
                  type="button"
                  onClick={handleValidateProfile}
                  className={`${BUTTON_BASE} bg-accent text-canvas hover:bg-accent-strong`}
                >
                  Valider
                </button>
              </div>
            </>
          ) : (
            <button
              ref={modifyButtonRef}
              type="button"
              aria-expanded={false}
              onClick={handleEditProfile}
              className="flex h-11 w-full items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold text-ink transition duration-200 hover:border-accent hover:text-accent-strong focus-visible:ring-2 focus-visible:ring-accent-strong"
            >
              Modifier mes paramètres
            </button>
          )}
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
                ref={sportRef}
                id="sport"
                value={activity.sportId}
                onChange={(event) => handleSport(event.target.value)}
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

          {gpxAvailable ? (
            <div className="mt-3" role="radiogroup" aria-label="Mode de saisie">
              <p className={FIELD_LABEL}>Mode de saisie</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    id="mode-manuel"
                    type="radio"
                    name="mode-saisie"
                    value="manual"
                    checked={activity.inputMode === "manual"}
                    onChange={() => handleInputMode("manual")}
                    className="peer sr-only"
                  />
                  <label htmlFor="mode-manuel" className={CHIP}>
                    Saisie manuelle
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="mode-gpx"
                    type="radio"
                    name="mode-saisie"
                    value="gpx"
                    checked={activity.inputMode === "gpx"}
                    onChange={() => handleInputMode("gpx")}
                    className="peer sr-only"
                  />
                  <label htmlFor="mode-gpx" className={CHIP}>
                    Trace GPX
                  </label>
                </div>
              </div>
            </div>
          ) : null}

          {activity.inputMode === "gpx" && sport && gpxAvailable ? (
            <GpxActivity
              sport={sport}
              profile={{ weightKg: values.weightKg }}
              athlete={athlete}
              onEditSettings={handleOpenSettings}
            />
          ) : (
            <>
              <div className="mt-3">
                <label htmlFor="distance" className={FIELD_LABEL}>
                  Distance (km)
                </label>
                <input
                  id="distance"
                  type="text"
                  inputMode="decimal"
                  value={activity.effort.distanceKm}
                  onChange={(event) =>
                    dispatch({
                      type: "effortChanged",
                      effort: {
                        ...activity.effort,
                        distanceKm: event.target.value,
                      },
                    })
                  }
                  aria-invalid={distanceError ? true : undefined}
                  aria-describedby={
                    distanceError ? "erreur-distance" : undefined
                  }
                  className={FIELD}
                />
                {distanceError ? (
                  <p
                    id="erreur-distance"
                    role="alert"
                    className="mt-1 text-sm text-danger"
                  >
                    {distanceError}
                  </p>
                ) : null}
              </div>

              <fieldset className="mt-3">
                <legend className={FIELD_LABEL}>Unité de vitesse</legend>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input
                      id="unite-kmh"
                      type="radio"
                      name="unite"
                      value="kmh"
                      checked={activity.effort.speedUnit === "kmh"}
                      onChange={() => handleUnitChange("kmh")}
                      className="peer sr-only"
                    />
                    <label htmlFor="unite-kmh" className={CHIP}>
                      km/h
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      id="unite-minkm"
                      type="radio"
                      name="unite"
                      value="minkm"
                      checked={activity.effort.speedUnit === "minkm"}
                      onChange={() => handleUnitChange("minkm")}
                      className="peer sr-only"
                    />
                    <label htmlFor="unite-minkm" className={CHIP}>
                      min/km
                    </label>
                  </div>
                </div>
              </fieldset>

              <div className="mt-3">
                <label htmlFor="vitesse" className={FIELD_LABEL}>
                  {isPace ? "Allure (min/km)" : "Vitesse (km/h)"}
                </label>
                <input
                  id="vitesse"
                  type="text"
                  inputMode={isPace ? "numeric" : "decimal"}
                  placeholder={isPace ? "5:30" : undefined}
                  value={activity.effort.speed}
                  onChange={(event) =>
                    dispatch({
                      type: "effortChanged",
                      effort: {
                        ...activity.effort,
                        speed: event.target.value,
                      },
                    })
                  }
                  aria-invalid={speedError ? true : undefined}
                  aria-describedby={
                    speedError ? "erreur-vitesse" : undefined
                  }
                  className={FIELD}
                />
                {speedError ? (
                  <p
                    id="erreur-vitesse"
                    role="alert"
                    className="mt-1 text-sm text-danger"
                  >
                    {speedError}
                  </p>
                ) : null}

                {effortDuration ? (
                  <p
                    role="status"
                    aria-live="polite"
                    data-testid="effort-duration"
                    className="mt-1 text-sm text-muted"
                  >
                    Durée de l&apos;effort :{" "}
                    {formatDuration(effortDuration.minutes)} · soit{" "}
                    {isPace
                      ? `${speedLabelKmh(effortDuration.speedKmh)} km/h`
                      : `${formatPace(3600 / effortDuration.speedKmh)} min/km`}
                  </p>
                ) : null}
              </div>
            </>
          )}

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
