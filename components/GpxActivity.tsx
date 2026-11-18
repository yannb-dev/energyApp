"use client";

/**
 * Mode « Trace GPX » du bloc Activité (SPEC-07.5) : import, intensité,
 * terrain, calcul de la durée, profil altimétrique et temps de passage.
 * La trace reste en mémoire ; rien n'est écrit ni envoyé.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import ElevationProfile from "@/components/ElevationProfile";
import InfoTooltip from "@/components/InfoTooltip";
import SplitsTable from "@/components/SplitsTable";
import {
  BIKE_KG_MAX,
  BIKE_KG_MIN,
  PMA_WATTS_MAX,
  PMA_WATTS_MIN,
  VMA_KMH_MAX,
  VMA_KMH_MIN,
  type AthleteSettings,
} from "@/lib/athleteStorage";
import { parseDecimal, WEIGHT_KG_MAX, WEIGHT_KG_MIN } from "@/lib/energy";
import {
  DISTANCE_KM_MAX,
  DISTANCE_KM_MIN,
  formatDuration,
} from "@/lib/effort";
import { buildTrack, parseGpx, type GpxError, type Track } from "@/lib/gpx";
import { INTENSITY_HELP, PACING_METHOD_HELP } from "@/lib/helpTexts";
import {
  BIKE_POSITIONS,
  INTENSITY_LEVELS,
  TERRAIN_TYPES,
  type IntensityId,
  type TerrainId,
} from "@/lib/intensity";
import { MINUTES_MAX, MINUTES_MIN } from "@/lib/nutrition";
import { computeBikePacing, DEFAULT_BIKE_KG } from "@/lib/pacingBike";
import { computeRunPacing, type PacingResult } from "@/lib/pacingRun";
import type { Sport } from "@/lib/sports";

/** Événement demandé par « Modifier mes paramètres » : le bloc Paramètres se rouvre. */
export const GPX_EDIT_SETTINGS_EVENT = "kcalapp:edit-settings";

const FIELD_LABEL = "mb-1 block text-sm font-medium text-ink";
const CHIP =
  "flex h-11 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface-2 px-2 text-center text-xs font-medium text-muted transition-colors duration-200 hover:text-ink peer-checked:border-accent peer-checked:bg-accent peer-checked:font-semibold peer-checked:text-canvas peer-focus-visible:ring-2 peer-focus-visible:ring-accent-strong";
const TILE = "rounded-xl border border-line bg-surface-2 p-3";

const VMA_MESSAGE = "Renseigne ta VMA dans le bloc Paramètres.";
const BIKE_MESSAGE = "Renseigne ta PMA et ton poids dans le bloc Paramètres.";
const BIKE_WEIGHT_MESSAGE =
  "Renseigne le poids de ton vélo dans le bloc Paramètres.";
const BOUNDS_MESSAGE =
  "La durée calculée doit être entre 1 minute et 24 h.";

/** Une seule correspondance par `GpxError`, en français. */
const GPX_ERROR_MESSAGES: Record<GpxError, string> = {
  "too-large": "Fichier trop volumineux (10 Mo max).",
  "invalid-xml": "Fichier GPX illisible.",
  "no-track": "Aucune trace trouvée dans ce fichier.",
  "too-few-points": "La trace contient trop peu de points.",
  "invalid-coordinates": "Coordonnées invalides dans la trace.",
};

/** Position aérodynamique utilisée quand aucun vélo n'est déclaré (07.4). */
const DEFAULT_BIKE_POSITION_ID = "hoods";

/** Position par défaut, par identifiant stable de `BIKE_POSITIONS`. */
function defaultBikePosition() {
  const found = BIKE_POSITIONS.find(
    (position) => position.id === DEFAULT_BIKE_POSITION_ID,
  );
  return found ?? BIKE_POSITIONS[1];
}

/** Affichage à la française : une décimale, virgule comprise. */
function frenchOneDecimal(value: number): string {
  return String(Math.round(value * 10) / 10).replace(".", ",");
}

type Outcome =
  | { kind: "idle" }
  | { kind: "error"; message: string; settingsAction: boolean }
  | { kind: "ready"; result: PacingResult; bike: boolean };

type GpxActivityProps = {
  sport: Sport;
  /** Poids du profil « Paramètres » (SPEC-06), en texte. */
  profile: { weightKg: string };
  athlete: AthleteSettings;
  /** Durée dérivée, ou chaîne vide quand le résultat n'est pas calculable. */
  onMinutesChange: (minutes: string) => void;
};

export default function GpxActivity({
  sport,
  profile,
  athlete,
  onMinutesChange,
}: GpxActivityProps) {
  const [track, setTrack] = useState<Track | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [intensity, setIntensity] = useState<IntensityId>("moderate");
  const [terrain, setTerrain] = useState<TerrainId>("rolling");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  /** Message de données manquantes déjà affiché : le focus ne revient qu'une fois. */
  const previousSettingsRef = useRef(false);

  const isTrail = sport.family === "trail";
  const defaultPosition = defaultBikePosition();

  const outcome = useMemo<Outcome>(() => {
    if (!track) {
      return { kind: "idle" };
    }
    if (
      track.distanceKm < DISTANCE_KM_MIN ||
      track.distanceKm > DISTANCE_KM_MAX
    ) {
      return { kind: "error", message: BOUNDS_MESSAGE, settingsAction: false };
    }

    let result: PacingResult;

    if (sport.family === "bike") {
      const pmaWatts = parseDecimal(athlete.pmaWatts);
      const riderKg = parseDecimal(profile.weightKg);
      if (
        pmaWatts === null ||
        !Number.isInteger(pmaWatts) ||
        pmaWatts < PMA_WATTS_MIN ||
        pmaWatts > PMA_WATTS_MAX ||
        riderKg === null ||
        riderKg < WEIGHT_KG_MIN ||
        riderKg > WEIGHT_KG_MAX
      ) {
        return { kind: "error", message: BIKE_MESSAGE, settingsAction: false };
      }

      let bikeKg = DEFAULT_BIKE_KG;
      let cdA: number = defaultPosition.cdA;
      if (athlete.hasBike) {
        const parsedBikeKg = parseDecimal(athlete.bikeKg);
        if (
          parsedBikeKg === null ||
          parsedBikeKg < BIKE_KG_MIN ||
          parsedBikeKg > BIKE_KG_MAX
        ) {
          return {
            kind: "error",
            message: BIKE_WEIGHT_MESSAGE,
            settingsAction: false,
          };
        }
        bikeKg = parsedBikeKg;
        cdA =
          BIKE_POSITIONS.find(
            (position) => position.id === athlete.bikePosition,
          )?.cdA ?? defaultPosition.cdA;
      }

      result = computeBikePacing(track, {
        pmaWatts,
        intensity,
        riderKg,
        bikeKg,
        cdA,
      });
    } else if (sport.family === "run" || isTrail) {
      const vmaKmh = parseDecimal(athlete.vmaKmh);
      if (
        vmaKmh === null ||
        vmaKmh < VMA_KMH_MIN ||
        vmaKmh > VMA_KMH_MAX
      ) {
        return { kind: "error", message: VMA_MESSAGE, settingsAction: true };
      }

      result = computeRunPacing(track, {
        vmaKmh,
        intensity,
        terrain: isTrail ? terrain : undefined,
      });
    } else {
      return { kind: "idle" };
    }

    if (result.minutes < MINUTES_MIN || result.minutes > MINUTES_MAX) {
      return { kind: "error", message: BOUNDS_MESSAGE, settingsAction: false };
    }

    return { kind: "ready", result, bike: sport.family === "bike" };
  }, [
    track,
    sport,
    athlete,
    profile.weightKg,
    intensity,
    terrain,
    isTrail,
    defaultPosition.cdA,
  ]);

  // Liaison nutrition : durée dès qu'un résultat valide existe, sinon chaîne vide.
  useEffect(() => {
    onMinutesChange(
      outcome.kind === "ready" ? String(outcome.result.minutes) : "",
    );
  }, [outcome, onMinutesChange]);

  // Sortie du mode GPX : la durée de la trace ne doit pas survivre au composant.
  useEffect(() => {
    return () => onMinutesChange("");
  }, [onMinutesChange]);

  const needsSettings =
    outcome.kind === "error" && outcome.settingsAction && track !== null;

  // Focus sur le bouton des paramètres la première fois que le message apparaît.
  useEffect(() => {
    if (needsSettings && !previousSettingsRef.current) {
      settingsButtonRef.current?.focus();
    }
    previousSettingsRef.current = needsSettings;
  }, [needsSettings]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    let text: string;
    try {
      text = await file.text();
    } catch {
      setTrack(null);
      setFileError(GPX_ERROR_MESSAGES["invalid-xml"]);
      return;
    }

    const parsed = parseGpx(text);
    if (!parsed.ok) {
      setTrack(null);
      setFileError(GPX_ERROR_MESSAGES[parsed.error]);
      return;
    }

    const nextTrack = buildTrack(parsed.points);
    if (nextTrack.distanceKm <= 0) {
      setTrack(null);
      setFileError(GPX_ERROR_MESSAGES["too-few-points"]);
      return;
    }

    setFileError(null);
    setTrack(nextTrack);
  }

  /** Retire la trace et la valeur du champ fichier ; aucune copie conservée. */
  function handleRemoveTrack() {
    setTrack(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleEditSettings() {
    window.dispatchEvent(new Event(GPX_EDIT_SETTINGS_EVENT));
  }

  return (
    <div data-testid="gpx-activity" className="mt-3 flex flex-col gap-3">
      <div>
        <label htmlFor="gpx-file" className={FIELD_LABEL}>
          Trace GPX
        </label>
        <input
          ref={fileInputRef}
          id="gpx-file"
          type="file"
          accept=".gpx,application/gpx+xml"
          onChange={handleFileChange}
          className="block w-full text-sm text-muted file:mr-3 file:h-11 file:cursor-pointer file:rounded-xl file:border file:border-line file:bg-surface-2 file:px-3 file:text-sm file:font-semibold file:text-ink"
        />
        <p className="mt-1 text-xs text-muted">
          La trace reste sur ton appareil, elle n&apos;est ni envoyée ni
          enregistrée.
        </p>
        {track ? (
          <button
            type="button"
            onClick={handleRemoveTrack}
            className="mt-2 flex h-11 w-full items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold text-ink transition duration-200 hover:border-accent hover:text-accent-strong focus-visible:ring-2 focus-visible:ring-accent-strong"
          >
            Retirer la trace
          </button>
        ) : null}
      </div>

      {fileError ? (
        <p data-testid="gpx-error" role="alert" className="text-sm text-danger">
          {fileError}
        </p>
      ) : null}

      <div role="radiogroup" aria-labelledby="gpx-intensite-titre">
        <div className="flex items-start justify-between gap-2">
          <p id="gpx-intensite-titre" className={FIELD_LABEL}>
            Intensité
          </p>
          <InfoTooltip
            id="help-intensite"
            label="Aide : intensité"
            title="Intensité"
          >
            {INTENSITY_HELP}
          </InfoTooltip>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {INTENSITY_LEVELS.map((level) => (
            <div key={level.id} className="relative">
              <input
                id={`gpx-intensite-${level.id}`}
                type="radio"
                name="gpx-intensite"
                value={level.id}
                checked={intensity === level.id}
                onChange={() => setIntensity(level.id)}
                className="peer sr-only"
              />
              <label htmlFor={`gpx-intensite-${level.id}`} className={CHIP}>
                {level.label} ({Math.round(level.ratio * 100)} %)
              </label>
            </div>
          ))}
        </div>
      </div>

      {isTrail ? (
        <div role="radiogroup" aria-labelledby="gpx-terrain-titre">
          <p id="gpx-terrain-titre" className={FIELD_LABEL}>
            Terrain
          </p>
          <div className="grid grid-cols-3 gap-2">
            {TERRAIN_TYPES.map((type) => (
              <div key={type.id} className="relative">
                <input
                  id={`gpx-terrain-${type.id}`}
                  type="radio"
                  name="gpx-terrain"
                  value={type.id}
                  checked={terrain === type.id}
                  onChange={() => setTerrain(type.id)}
                  className="peer sr-only"
                />
                <label htmlFor={`gpx-terrain-${type.id}`} className={CHIP}>
                  {type.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {outcome.kind === "error" ? (
        <div className="flex flex-col gap-2">
          <p
            data-testid="gpx-error"
            role="alert"
            className="text-sm text-danger"
          >
            {outcome.message}
          </p>
          {outcome.settingsAction ? (
            <button
              ref={settingsButtonRef}
              type="button"
              onClick={handleEditSettings}
              className="flex h-11 w-full items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold text-ink transition duration-200 hover:border-accent hover:text-accent-strong focus-visible:ring-2 focus-visible:ring-accent-strong"
            >
              Modifier mes paramètres
            </button>
          ) : null}
        </div>
      ) : null}

      {outcome.kind === "ready" ? (
        <div className="flex flex-col gap-3">
          <div data-testid="gpx-summary" className={TILE}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-muted">Durée estimée</p>
              <InfoTooltip
                id="help-methode-estimation"
                label="Aide : méthode d'estimation"
                title="Méthode d'estimation"
              >
                {PACING_METHOD_HELP}
              </InfoTooltip>
            </div>
            <p
              data-testid="gpx-duration"
              className="text-3xl font-bold leading-tight text-effort"
            >
              {formatDuration(outcome.result.minutes)}
            </p>
            <p className="mt-1 text-sm text-muted">
              Distance {frenchOneDecimal(track?.distanceKm ?? 0)} km · D+{" "}
              {Math.round(track?.ascentM ?? 0)} m · D−{" "}
              {Math.round(track?.descentM ?? 0)} m · Vitesse moyenne{" "}
              {frenchOneDecimal(outcome.result.averageSpeedKmh)} km/h
            </p>
          </div>

          {track && !track.hasElevation ? (
            <p className="text-sm text-muted">
              Altitude absente de la trace : profil plat, durée sans effet de
              pente.
            </p>
          ) : null}

          {sport.family === "bike" && !athlete.hasBike ? (
            <p className="text-sm text-muted">
              {`Vélo par défaut : ${DEFAULT_BIKE_KG} kg, position ${defaultPosition.label.toLowerCase()}.`}
            </p>
          ) : null}

          {track ? <ElevationProfile track={track} /> : null}
          <SplitsTable result={outcome.result} bike={outcome.bike} />
        </div>
      ) : null}

      <p className="text-xs text-muted">Estimation indicative.</p>
    </div>
  );
}
