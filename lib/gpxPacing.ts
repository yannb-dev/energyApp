/**
 * Calcul d'allure d'une trace GPX (SPEC-08.5) : extrait du `useMemo` de
 * `GpxActivity` pour être partagé avec la page 2 (profil et temps de passage).
 * Pur, sans React : mêmes gardes et mêmes bornes qu'avant.
 */

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
import { DISTANCE_KM_MAX, DISTANCE_KM_MIN } from "@/lib/effort";
import type { Track } from "@/lib/gpx";
import {
  BIKE_POSITIONS,
  type IntensityId,
  type TerrainId,
} from "@/lib/intensity";
import { MINUTES_MAX, MINUTES_MIN } from "@/lib/nutrition";
import { computeBikePacing, DEFAULT_BIKE_KG } from "@/lib/pacingBike";
import { computeRunPacing, type PacingResult } from "@/lib/pacingRun";
import type { Sport } from "@/lib/sports";

export const VMA_MESSAGE = "Renseigne ta VMA dans le bloc Paramètres.";
export const BIKE_MESSAGE =
  "Renseigne ta PMA et ton poids dans le bloc Paramètres.";
export const BIKE_WEIGHT_MESSAGE =
  "Renseigne le poids de ton vélo dans le bloc Paramètres.";
export const BOUNDS_MESSAGE =
  "La durée calculée doit être entre 1 minute et 24 h.";

/** Position aérodynamique utilisée quand aucun vélo n'est déclaré (07.4). */
const DEFAULT_BIKE_POSITION_ID = "hoods";

/** Position par défaut, par identifiant stable de `BIKE_POSITIONS`. */
export function defaultBikePosition() {
  const found = BIKE_POSITIONS.find(
    (position) => position.id === DEFAULT_BIKE_POSITION_ID,
  );
  return found ?? BIKE_POSITIONS[1];
}

export type GpxOutcome =
  | { kind: "idle" }
  | { kind: "error"; message: string; settingsAction: boolean }
  | { kind: "ready"; result: PacingResult; bike: boolean };

export type GpxOutcomeInput = {
  track: Track | null;
  sport: Sport;
  athlete: AthleteSettings;
  weightKg: string;
  intensity: IntensityId;
  terrain: TerrainId;
};

/** Issue du calcul : rien, une erreur lisible, ou une durée exploitable. */
export function computeGpxOutcome({
  track,
  sport,
  athlete,
  weightKg,
  intensity,
  terrain,
}: GpxOutcomeInput): GpxOutcome {
  if (!track) {
    return { kind: "idle" };
  }
  if (
    track.distanceKm < DISTANCE_KM_MIN ||
    track.distanceKm > DISTANCE_KM_MAX
  ) {
    return { kind: "error", message: BOUNDS_MESSAGE, settingsAction: false };
  }

  const isTrail = sport.family === "trail";
  const defaultPosition = defaultBikePosition();

  let result: PacingResult;

  if (sport.family === "bike") {
    const pmaWatts = parseDecimal(athlete.pmaWatts);
    const riderKg = parseDecimal(weightKg);
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
        BIKE_POSITIONS.find((position) => position.id === athlete.bikePosition)
          ?.cdA ?? defaultPosition.cdA;
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
    if (vmaKmh === null || vmaKmh < VMA_KMH_MIN || vmaKmh > VMA_KMH_MAX) {
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
}
