/**
 * Modèle ski de randonnée (SPEC-09) : méthode Munter en montée et à plat,
 * vitesse verticale et horizontale bornées en descente, transitions fixes.
 * Pur, sans React ni stockage. Toutes les constantes sont à calibrer.
 */

import type { Track } from "@/lib/gpx";
import {
  INTENSITY_LEVELS,
  type IntensityId,
  SKI_LEVELS,
  type SkiLevelId,
} from "@/lib/intensity";
import type { PacingPhases, PacingResult, PacingSplit } from "@/lib/pacingRun";

/** Unités d'effort Munter par heure selon l'intensité (à calibrer). */
export const SKIMO_ASCENT_UNITS_PER_HOUR: Record<IntensityId, number> = {
  endurance: 3.5,
  moderate: 4,
  sustained: 5,
  race: 6.5,
};

/** Dénivelé minimal (m) pour confirmer un changement de phase (à calibrer). */
export const SKIMO_PHASE_MIN_VERTICAL_M = 50;

/** Temps fixe d'une transition, en minutes (à calibrer). */
export const SKIMO_TRANSITION_MIN = 8;

/** MET d'une transition, peaux et chaussures (à calibrer). */
export const SKIMO_TRANSITION_MET = 2.5;

const METERS_PER_KM = 1000;
const UNITS_PER_100M = 100;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;

export type SkimoPacingInput = {
  intensity: IntensityId;
  skiLevel: SkiLevelId;
};

type Phase = "ascent" | "descent";

type Extremum = { index: number; type: "summit" | "trough" };

/** Phases minimales pour la moyenne des MET (compatible avec PacingPhases). */
export type SkimoMetPhasesInput = {
  ascentSec: number;
  descentSec: number;
  transitionSec: number;
};

function segmentRiseM(
  lengthKm: number,
  gradePct: number,
  hasElevation: boolean,
): number {
  if (!hasElevation) {
    return 0;
  }
  return (lengthKm * METERS_PER_KM * gradePct) / 100;
}

/**
 * Sommets et creux successifs séparés de `hysteresis` : même logique par
 * extremums que `lib/gpx.ts`, avec un seuil propre au ski.
 */
function detectExtrema(
  series: number[],
  hysteresis: number,
): { extrema: Extremum[]; initial: Phase | null } {
  const extrema: Extremum[] = [];
  if (series.length === 0) {
    return { extrema, initial: null };
  }

  let anchor = series[0];
  let extreme = series[0];
  let extremeIndex = 0;
  let state: 0 | 1 | -1 = 0;
  let initial: Phase | null = null;

  for (let index = 1; index < series.length; index += 1) {
    const value = series[index];

    if (state >= 0) {
      if (value > extreme) {
        extreme = value;
        extremeIndex = index;
      }
      if (state === 0 && value - anchor > hysteresis) {
        state = 1;
        initial = "ascent";
      }
      if (state === 1 && extreme - value > hysteresis) {
        extrema.push({ index: extremeIndex, type: "summit" });
        anchor = extreme;
        extreme = value;
        extremeIndex = index;
        state = -1;
      } else if (state === 0 && anchor - value > hysteresis) {
        state = -1;
        initial = "descent";
        extreme = value;
        extremeIndex = index;
      }
    } else if (value < extreme) {
      extreme = value;
      extremeIndex = index;
    } else if (value - extreme > hysteresis) {
      extrema.push({ index: extremeIndex, type: "trough" });
      anchor = extreme;
      extreme = value;
      extremeIndex = index;
      state = 1;
    }
  }

  return { extrema, initial };
}

/**
 * Phase de chaque segment : avant la première direction confirmée, la direction
 * retenue ; ailleurs, montée entre un creux et le sommet suivant, descente après
 * un sommet. Sans direction confirmée, tout est en montée.
 */
function assignPhases(
  segmentCount: number,
  extrema: Extremum[],
  initial: Phase | null,
): Phase[] {
  const first: Phase = initial ?? "ascent";
  const phases: Phase[] = new Array(segmentCount).fill(first);
  let current: Phase = first;

  for (const extremum of extrema) {
    current = extremum.type === "summit" ? "descent" : "ascent";
    for (let index = extremum.index + 1; index < segmentCount; index += 1) {
      phases[index] = current;
    }
  }

  return phases;
}

function segmentDurationSec(
  lengthKm: number,
  riseM: number,
  isAscent: boolean,
  ascentUnitsPerHour: number,
  skiLevel: (typeof SKI_LEVELS)[number],
): number {
  if (isAscent) {
    const units = lengthKm + Math.max(0, riseM) / UNITS_PER_100M;
    return (units / ascentUnitsPerHour) * SECONDS_PER_HOUR;
  }

  const verticalHours = -riseM / skiLevel.descentVerticalMh;
  const horizontalHours = lengthKm / skiLevel.descentMaxKmh;
  return Math.max(verticalHours, horizontalHours) * SECONDS_PER_HOUR;
}

/**
 * Durée et temps de passage d'une trace de ski de randonnée.
 * Estimation indicative : seuls `minutes` et `transitions` sont entiers.
 */
export function computeSkimoPacing(
  track: Track,
  input: SkimoPacingInput,
): PacingResult {
  const level = INTENSITY_LEVELS.find(
    (candidate) => candidate.id === input.intensity,
  );
  if (level === undefined) {
    throw new Error(`Intensité inconnue : ${input.intensity}.`);
  }

  const skiLevel = SKI_LEVELS.find(
    (candidate) => candidate.id === input.skiLevel,
  );
  if (skiLevel === undefined) {
    throw new Error(`Niveau de ski inconnu : ${input.skiLevel}.`);
  }

  const ascentUnitsPerHour = SKIMO_ASCENT_UNITS_PER_HOUR[level.id];

  const series = track.segments.map((segment) => segment.eleM);
  const { extrema, initial } = track.hasElevation
    ? detectExtrema(series, SKIMO_PHASE_MIN_VERTICAL_M)
    : { extrema: [], initial: null };
  const phases = assignPhases(track.segments.length, extrema, initial);

  const kmCount = track.kilometers.length;
  const durations = new Array<number>(kmCount).fill(0);
  let ascentSec = 0;
  let descentSec = 0;

  track.segments.forEach((segment, index) => {
    const riseM = segmentRiseM(
      segment.lengthKm,
      segment.gradePct,
      track.hasElevation,
    );
    const phase = phases[index];
    const isAscent = phase === "ascent" || riseM > 0;
    const durationSec = segmentDurationSec(
      segment.lengthKm,
      riseM,
      isAscent,
      ascentUnitsPerHour,
      skiLevel,
    );

    const kmIndex = Math.floor(segment.startKm + 1e-9);
    const bucket = Math.min(Math.max(kmIndex, 0), kmCount - 1);
    if (bucket >= 0) {
      durations[bucket] += durationSec;
    }

    if (isAscent) {
      ascentSec += durationSec;
    } else {
      descentSec += durationSec;
    }
  });

  const transitionSec =
    extrema.length * SKIMO_TRANSITION_MIN * SECONDS_PER_MINUTE;
  for (const extremum of extrema) {
    const segment = track.segments[extremum.index];
    if (segment === undefined) {
      continue;
    }
    const kmIndex = Math.floor(segment.startKm + 1e-9);
    const bucket = Math.min(Math.max(kmIndex, 0), kmCount - 1);
    if (bucket >= 0) {
      durations[bucket] += SKIMO_TRANSITION_MIN * SECONDS_PER_MINUTE;
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

  const totalSec = ascentSec + descentSec + transitionSec;
  const phasesResult: PacingPhases = {
    ascentSec,
    descentSec,
    transitionSec,
    transitions: extrema.length,
  };

  return {
    splits,
    totalSec,
    minutes: Math.round(totalSec / 60),
    averageSpeedKmh:
      track.distanceKm > 0 && totalSec > 0
        ? (track.distanceKm / totalSec) * 3600
        : 0,
    phases: phasesResult,
  };
}

/**
 * MET moyen d'une sortie de ski : moyenne pondérée par la durée de chaque phase.
 * Durée totale nulle : MET de montée.
 */
export function skimoAverageMet(
  phases: SkimoMetPhasesInput,
  metPhases: { ascent: number; descent: number },
): number {
  const totalSec =
    phases.ascentSec + phases.descentSec + phases.transitionSec;
  if (totalSec <= 0) {
    return metPhases.ascent;
  }
  return (
    (phases.ascentSec * metPhases.ascent +
      phases.descentSec * metPhases.descent +
      phases.transitionSec * SKIMO_TRANSITION_MET) /
    totalSec
  );
}
