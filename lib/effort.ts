import { parseDecimal } from "@/lib/energy";
import { MINUTES_MAX, MINUTES_MIN } from "@/lib/nutrition";
import { toFieldErrors } from "@/lib/schemas/errors";
import { effortSchema } from "@/lib/schemas/effort";
import {
  DISTANCE_KM_MAX,
  DISTANCE_KM_MIN,
  SPEED_KMH_MAX,
  SPEED_KMH_MIN,
} from "@/lib/schemas/limits";

export const SPEED_UNITS = ["kmh", "minkm"] as const;
export type SpeedUnit = (typeof SPEED_UNITS)[number];

/** Bornes partagées avec les schémas de validation (lib/schemas/limits.ts). */
export {
  DISTANCE_KM_MAX,
  DISTANCE_KM_MIN,
  PACE_SEC_PER_KM_MAX,
  PACE_SEC_PER_KM_MIN,
  SPEED_KMH_MAX,
  SPEED_KMH_MIN,
} from "@/lib/schemas/limits";

export type EffortFormValues = {
  distanceKm: string;
  /** « 12,5 » en km/h, « 5:30 » en min/km. */
  speed: string;
  speedUnit: SpeedUnit;
};

export const EMPTY_EFFORT: EffortFormValues = {
  distanceKm: "",
  speed: "",
  speedUnit: "kmh",
};

export type EffortErrors = Partial<Record<"distanceKm" | "speed", string>>;

/** « m:ss » ou « mm:ss » vers des secondes par km ; null si le format est refusé. */
export function parsePace(text: string): number | null {
  const match = /^(\d+):([0-5]\d)$/.exec(text.trim());
  if (!match) {
    return null;
  }
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  return minutes * 60 + seconds;
}

/** « 5:30 », secondes arrondies et reportées sur la minute si besoin. */
export function formatPace(secPerKm: number): string {
  const total = Math.round(secPerKm);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Vitesse en km/h depuis une saisie km/h ou une allure ; null si invalide ou nulle. */
export function speedToKmh(raw: string, unit: SpeedUnit): number | null {
  if (unit === "minkm") {
    const secPerKm = parsePace(raw);
    if (secPerKm === null || secPerKm <= 0) {
      return null;
    }
    return 3600 / secPerKm;
  }

  const value = parseDecimal(raw);
  if (value === null || value <= 0) {
    return null;
  }
  return value;
}

/** Conversion pour la bascule d'unité : km/h à 0,1 près, allure à la seconde. */
export function convertSpeed(raw: string, from: SpeedUnit, to: SpeedUnit): string {
  const speedKmh = speedToKmh(raw, from);
  if (speedKmh === null) {
    return "";
  }
  if (from === to) {
    return raw;
  }
  if (to === "kmh") {
    return String(Math.round(speedKmh * 10) / 10);
  }
  return formatPace(3600 / speedKmh);
}

/** Durée de l'effort en minutes entières : `?min=` reste un entier. */
export function computeDurationMinutes(distanceKm: number, speedKmh: number): number {
  return Math.round((distanceKm / speedKmh) * 60);
}

/** « 45 min », « 2 h 05 min », « 2 h » : jamais de « 0 min ». */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;

  if (hours === 0) {
    return `${rest} min`;
  }
  if (rest === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${String(rest).padStart(2, "0")} min`;
}

/** Durée dérivée et vitesse équivalente ; null si une valeur est invalide ou hors bornes. */
export function computeEffortDuration(
  values: EffortFormValues,
): { minutes: number; speedKmh: number } | null {
  const distanceKm = parseDecimal(values.distanceKm);
  const speedKmh = speedToKmh(values.speed, values.speedUnit);

  if (distanceKm === null || speedKmh === null) {
    return null;
  }
  if (distanceKm < DISTANCE_KM_MIN || distanceKm > DISTANCE_KM_MAX) {
    return null;
  }
  if (speedKmh < SPEED_KMH_MIN || speedKmh > SPEED_KMH_MAX) {
    return null;
  }

  const minutes = computeDurationMinutes(distanceKm, speedKmh);
  if (minutes < MINUTES_MIN || minutes > MINUTES_MAX) {
    return null;
  }

  return { minutes, speedKmh };
}

/** Valide la distance puis la vitesse, et la durée seulement si les deux sont valides. */
export function validateEffort(values: EffortFormValues): EffortErrors {
  return toFieldErrors(effortSchema, values);
}
