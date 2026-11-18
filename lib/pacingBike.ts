/**
 * Modèle cyclisme : PMA × intensité, masse, aérodynamisme, pente.
 * Estimation indicative, sans interface ni stockage.
 */

import type { Track } from "@/lib/gpx";
import { INTENSITY_LEVELS, type IntensityId } from "@/lib/intensity";
import type { PacingResult, PacingSplit } from "@/lib/pacingRun";

export type BikePacingInput = {
  pmaWatts: number;
  intensity: IntensityId;
  /** Poids du profil (SPEC-06). */
  riderKg: number;
  /** 0 si l'utilisateur n'a pas coché « Ajouter un vélo » : voir DEFAULT_BIKE_KG. */
  bikeKg: number;
  /** m², déduit de la position (BIKE_POSITIONS). */
  cdA: number;
};

/** Résistance au roulement (route, pneus corrects). */
export const CRR = 0.005;

/** Densité de l'air (kg/m³). */
export const AIR_DENSITY = 1.2;

/** Rendement de la transmission. */
export const DRIVETRAIN_EFFICIENCY = 0.975;

/** Accélération de la pesanteur (m/s²). */
export const GRAVITY = 9.80665;

/** Plafond de vitesse (descentes, prudence). */
export const BIKE_SPEED_MAX_KMH = 70;

/** Plancher de vitesse (rampes extrêmes). */
export const BIKE_SPEED_MIN_KMH = 1;

/** Poids du vélo utilisé si aucun vélo n'est déclaré. */
export const DEFAULT_BIKE_KG = 9;

const MS_PER_KMH = 1 / 3.6;

const SECONDS_PER_HOUR = 3600;

/** Borne basse de la bissection (m/s). */
const BISECTION_MIN_MS = 0.1;

/** Itérations de la bissection : précision très inférieure au watt. */
const BISECTION_ITERATIONS = 100;

/**
 * Vitesse (m/s) tenue à puissance constante sur une pente en fraction.
 * Bissection sur l'équilibre des puissances, vitesse plafonnée à BIKE_SPEED_MAX_KMH.
 */
export function solveSpeedMs(
  powerW: number,
  massKg: number,
  cdA: number,
  gradeFraction: number,
): number {
  if (!Number.isFinite(powerW) || powerW <= 0) {
    throw new Error("La puissance doit être un nombre strictement positif.");
  }
  if (!Number.isFinite(massKg) || massKg < 0) {
    throw new Error("La masse doit être un nombre positif ou nul.");
  }
  if (!Number.isFinite(cdA) || cdA <= 0) {
    throw new Error("Le CdA doit être un nombre strictement positif.");
  }

  const grade = Number.isFinite(gradeFraction) ? gradeFraction : 0;
  const theta = Math.atan(grade);
  const availableW = powerW * DRIVETRAIN_EFFICIENCY;
  const slopeResistance = massKg * GRAVITY * (CRR * Math.cos(theta) + Math.sin(theta));
  const resistanceW = (speedMs: number): number =>
    0.5 * AIR_DENSITY * cdA * speedMs ** 3 + slopeResistance * speedMs;

  const maxMs = BIKE_SPEED_MAX_KMH * MS_PER_KMH;

  // Descente raide : la puissance disponible dépasse la résistance même au plafond.
  if (resistanceW(maxMs) <= availableW) {
    return maxMs;
  }

  let low = BISECTION_MIN_MS;
  let high = maxMs;
  for (let iteration = 0; iteration < BISECTION_ITERATIONS; iteration += 1) {
    const middle = (low + high) / 2;
    if (resistanceW(middle) < availableW) {
      low = middle;
    } else {
      high = middle;
    }
  }

  const speedMs = (low + high) / 2;
  return Math.max(
    BIKE_SPEED_MIN_KMH * MS_PER_KMH,
    Math.min(maxMs, speedMs),
  );
}

/**
 * Temps de passage par kilomètre et durée totale d'une trace à puissance constante.
 * Estimation indicative : pas d'arrondi ici hormis `minutes`.
 */
export function computeBikePacing(track: Track, input: BikePacingInput): PacingResult {
  if (!Number.isFinite(input.pmaWatts) || input.pmaWatts <= 0) {
    throw new Error("La PMA doit être un nombre strictement positif.");
  }
  if (!Number.isFinite(input.riderKg) || input.riderKg <= 0) {
    throw new Error("La masse du cycliste doit être un nombre strictement positif.");
  }
  if (!Number.isFinite(input.bikeKg) || input.bikeKg < 0) {
    throw new Error("La masse du vélo doit être un nombre positif ou nul.");
  }
  if (!Number.isFinite(input.cdA) || input.cdA <= 0) {
    throw new Error("Le CdA doit être un nombre strictement positif.");
  }

  const level = INTENSITY_LEVELS.find((candidate) => candidate.id === input.intensity);
  if (level === undefined) {
    throw new Error(`Intensité inconnue : ${input.intensity}.`);
  }

  const powerW = input.pmaWatts * level.ratio;
  const massKg = input.riderKg + input.bikeKg;

  // Durée par kilomètre : somme des segments du même découpage que track.kilometers.
  const kmCount = track.kilometers.length;
  const durations = new Array<number>(kmCount).fill(0);
  for (const segment of track.segments) {
    const gradePct = track.hasElevation ? segment.gradePct : 0;
    const speedKmh = solveSpeedMs(powerW, massKg, input.cdA, gradePct / 100) * 3.6;
    const kmIndex = Math.floor(segment.startKm + 1e-9);
    const index = Math.min(Math.max(kmIndex, 0), kmCount - 1);
    if (index >= 0) {
      durations[index] += (segment.lengthKm / speedKmh) * SECONDS_PER_HOUR;
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
