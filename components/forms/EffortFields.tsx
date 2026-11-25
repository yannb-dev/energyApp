import { useMemo, type RefObject } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import GpxActivity from "@/components/GpxActivity";
import { CHIP, FIELD, FIELD_LABEL } from "@/components/forms/styles";
import { useActivity } from "@/components/providers/ActivityProvider";
import type { InputMode } from "@/lib/activity";
import type { AthleteSettings } from "@/lib/athleteStorage";
import { validateInputs, type EnergyFormValues } from "@/lib/energy";
import {
  computeEffortDuration,
  convertSpeed,
  formatDuration,
  formatPace,
  validateEffort,
  type SpeedUnit,
} from "@/lib/effort";
import type { SettingsFormValues } from "@/lib/schemas/settings";
import { findSport, SPORTS, supportsGpx } from "@/lib/sports";

type EffortFieldsProps = {
  /** Les erreurs des champs vides n'apparaissent qu'après « Calculer ». */
  showEmptyErrors: boolean;
  sportRef: RefObject<HTMLSelectElement | null>;
  onEditSettings: () => void;
  profile: { weightKg: string };
  athlete: AthleteSettings;
};

/** Affichage : km/h arrondis à 0,1, virgule française, sans zéro inutile. */
function speedLabelKmh(speedKmh: number): string {
  return String(Math.round(speedKmh * 10) / 10).replace(".", ",");
}

/** Bloc Activité : sport, mode de saisie, trace GPX ou effort manuel. */
export function EffortFields({
  showEmptyErrors,
  sportRef,
  onEditSettings,
  profile,
  athlete,
}: EffortFieldsProps) {
  const { activity, dispatch } = useActivity();
  const { control } = useFormContext<SettingsFormValues>();
  const profileValues = useWatch({ control, name: "profile" });

  const sport = findSport(activity.sportId);
  const gpxAvailable = sport !== undefined && supportsGpx(sport);
  const isPace = activity.effort.speedUnit === "minkm";

  const sportIdError = useMemo(() => {
    const sex: EnergyFormValues["sex"] =
      profileValues.sex === "male" || profileValues.sex === "female"
        ? profileValues.sex
        : "";

    const errors = validateInputs({
      sex,
      age: profileValues.age,
      weightKg: profileValues.weightKg,
      heightCm: profileValues.heightCm,
      sportId: activity.sportId,
      minutes: "",
    });

    return errors.sportId ?? null;
  }, [profileValues, activity.sportId]);

  const sportError = showEmptyErrors ? sportIdError : null;

  const effortErrors = useMemo(
    () => validateEffort(activity.effort),
    [activity.effort],
  );

  const effortDuration = useMemo(
    () => computeEffortDuration(activity.effort),
    [activity.effort],
  );

  function effortError(field: "distanceKm" | "speed"): string | null {
    const message = effortErrors[field];
    if (!message) {
      return null;
    }
    if (!showEmptyErrors && activity.effort[field].trim() === "") {
      return null;
    }
    return message;
  }

  const distanceError = effortError("distanceKm");
  const speedError = effortError("speed");

  function handleSport(nextSportId: string) {
    dispatch({ type: "sportChanged", sportId: nextSportId });
  }

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

  return (
    <>
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
          <p id="erreur-sport" role="alert" className="mt-1 text-sm text-danger">
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
          profile={profile}
          athlete={athlete}
          onEditSettings={onEditSettings}
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
              aria-describedby={distanceError ? "erreur-distance" : undefined}
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
              aria-describedby={speedError ? "erreur-vitesse" : undefined}
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
    </>
  );
}
