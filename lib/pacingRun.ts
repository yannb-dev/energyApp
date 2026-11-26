/**
 * Modèle course / trail : VMA × intensité, coût de la pente (Minetti), terrain.
 * Estimation indicative, sans interface ni stockage.
 */

import type { Track } from "@/lib/gpx";
import {
  INTENSITY_LEVELS,
  type IntensityId,
  type TerrainId,
} from "@/lib/intensity";

export type RunPacingInput = {
  vmaKmh: number;
  intensity: IntensityId;
  /** Trail uniquement ; absent ou "rolling" = facteur 1. */
  terrain?: TerrainId;
};

export type PacingSplit = {
  /** 1, 2, … (dernier km éventuellement partiel). */
  km: number;
  distanceKm: number;
  /** Temps du kilomètre. */
  durationSec: number;
  /** Temps de passage à la fin de ce kilomètre. */
  cumulativeSec: number;
  paceSecPerKm: number;
  speedKmh: number;
  ascentM: number;
  descentM: number;
};

export type PacingPhases = {
  ascentSec: number;
  descentSec: number;
  transitionSec: number;
  transitions: number;
};

export type PacingResult = {
  splits: PacingSplit[];
  totalSec: number;
  /** totalSec / 60 arrondi, entier. */
  minutes: number;
  averageSpeedKmh: number;
  /** Détail par phase, renseigné par le modèle ski de randonnée (SPEC-09). */
  phases?: PacingPhases;
};

/** Coût de la pente (J/kg/m), du degré 5 au degré 0. */
export const MINETTI_COEFFS = [155.4, -30.4, -43.3, 46.3, 19.5, 3.6] as const;

/** Pente (fraction) bornée à ±0,45. */
export const MINETTI_GRADE_MAX = 0.45;

/** Gain de vitesse maximal en descente (prudence). */
export const DOWNHILL_SPEED_FACTOR_MAX = 1.25;

/** Ralentissement maximal en montée. */
export const UPHILL_SPEED_FACTOR_MIN = 0.25;

/** Multiplicateur de vitesse par terrain, trail uniquement. */
export const TERRAIN_SPEED_FACTORS = {
  rolling: 1,
  rough: 0.92,
  technical: 0.82,
} as const;

/**
 * Coût énergétique de Minetti pour une pente en fraction, bornée à ±MINETTI_GRADE_MAX.
 * À plat : 3,6 J/kg/m.
 */
export function minettiCost(grade: number): number {
  const g = Math.max(-MINETTI_GRADE_MAX, Math.min(MINETTI_GRADE_MAX, grade));
  let cost = 0;
  for (const coefficient of MINETTI_COEFFS) {
    cost = cost * g + coefficient;
  }
  return cost;
}

/**
 * Facteur de vitesse à effort constant pour une pente en pourcentage :
 * `cost(0) / cost(g)`, borné entre UPHILL_SPEED_FACTOR_MIN et DOWNHILL_SPEED_FACTOR_MAX.
 */
export function slopeSpeedFactor(gradePct: number): number {
  const factor = minettiCost(0) / minettiCost(gradePct / 100);
  return Math.max(
    UPHILL_SPEED_FACTOR_MIN,
    Math.min(DOWNHILL_SPEED_FACTOR_MAX, factor),
  );
}

/**
 * Temps de passage par kilomètre et durée totale d'une trace, à effort constant.
 * Estimation indicative : pas d'arrondi ici hormis `minutes`.
 */
export function computeRunPacing(track: Track, input: RunPacingInput): PacingResult {
  if (!Number.isFinite(input.vmaKmh) || input.vmaKmh <= 0) {
    throw new Error("La VMA doit être un nombre strictement positif.");
  }

  const level = INTENSITY_LEVELS.find((candidate) => candidate.id === input.intensity);
  if (level === undefined) {
    throw new Error(`Intensité inconnue : ${input.intensity}.`);
  }

  const flatSpeedKmh = input.vmaKmh * level.ratio;
  const terrainFactor =
    input.terrain === undefined ? 1 : TERRAIN_SPEED_FACTORS[input.terrain];

  // Durée par kilomètre : somme des segments du même découpage que track.kilometers.
  const kmCount = track.kilometers.length;
  const durations = new Array<number>(kmCount).fill(0);
  for (const segment of track.segments) {
    const gradePct = track.hasElevation ? segment.gradePct : 0;
    const segmentSpeedKmh = flatSpeedKmh * slopeSpeedFactor(gradePct) * terrainFactor;
    const kmIndex = Math.floor(segment.startKm + 1e-9);
    const index = Math.min(Math.max(kmIndex, 0), kmCount - 1);
    if (index >= 0) {
      durations[index] += (segment.lengthKm / segmentSpeedKmh) * 3600;
    }
  }

  const splits: PacingSplit[] = [];
  let cumulativeSec = 0;
  for (const kilometer of track.kilometers) {
    const durationSec = durations[kilometer.km - 1] ?? 0;
    cumulativeSec += durationSec;
    const distanceKm = kilometer.distanceKm;
    splits.push({
      km: kilometer.km,
      distanceKm,
      durationSec,
      cumulativeSec,
      paceSecPerKm: distanceKm > 0 ? durationSec / distanceKm : 0,
      speedKmh: distanceKm > 0 ? (distanceKm / durationSec) * 3600 : 0,
      ascentM: kilometer.ascentM,
      descentM: kilometer.descentM,
    });
  }

  const totalSec = cumulativeSec;
  return {
    splits,
    totalSec,
    minutes: Math.round(totalSec / 60),
    averageSpeedKmh:
      track.distanceKm > 0 && totalSec > 0
        ? (track.distanceKm / totalSec) * 3600
        : 0,
  };
}
