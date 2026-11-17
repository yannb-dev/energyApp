import { parseDecimal } from "@/lib/energy";
import { MINUTES_MAX, MINUTES_MIN } from "@/lib/nutrition";

export const SPEED_UNITS = ["kmh", "minkm"] as const;
export type SpeedUnit = (typeof SPEED_UNITS)[number];

export const DISTANCE_KM_MIN = 0.1;
export const DISTANCE_KM_MAX = 1000;

export const SPEED_KMH_MIN = 1;
export const SPEED_KMH_MAX = 100;

/** Bornes de l'allure, en secondes par km : 0:36 à 60:00 (inverse de 100 et 1 km/h). */
export const PACE_SEC_PER_KM_MIN = 36;
export const PACE_SEC_PER_KM_MAX = 3600;

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

/** Affichage d'un nombre à la française dans un message (« 0,1 »). */
function french(value: number): string {
  return String(value).replace(".", ",");
}

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
  const errors: EffortErrors = {};
  const isPace = values.speedUnit === "minkm";

  const distanceKm = parseDecimal(values.distanceKm);
  if (values.distanceKm.trim() === "") {
    errors.distanceKm = "La distance est obligatoire.";
  } else if (
    distanceKm === null ||
    distanceKm < DISTANCE_KM_MIN ||
    distanceKm > DISTANCE_KM_MAX
  ) {
    errors.distanceKm = `La distance doit être entre ${french(DISTANCE_KM_MIN)} et ${french(DISTANCE_KM_MAX)} km.`;
  }

  const speedKmh = speedToKmh(values.speed, values.speedUnit);
  if (values.speed.trim() === "") {
    errors.speed = isPace
      ? "L'allure est obligatoire."
      : "La vitesse est obligatoire.";
  } else if (isPace) {
    const secPerKm = parsePace(values.speed);
    if (secPerKm === null) {
      errors.speed = "L'allure doit être au format mm:ss (ex. 5:30).";
    } else if (
      secPerKm < PACE_SEC_PER_KM_MIN ||
      secPerKm > PACE_SEC_PER_KM_MAX
    ) {
      errors.speed = `L'allure doit être entre ${formatPace(PACE_SEC_PER_KM_MIN)} et ${formatPace(PACE_SEC_PER_KM_MAX)} min/km.`;
    }
  } else if (
    speedKmh === null ||
    speedKmh < SPEED_KMH_MIN ||
    speedKmh > SPEED_KMH_MAX
  ) {
    errors.speed = `La vitesse doit être entre ${french(SPEED_KMH_MIN)} et ${french(SPEED_KMH_MAX)} km/h.`;
  }

  if (
    errors.distanceKm === undefined &&
    errors.speed === undefined &&
    distanceKm !== null &&
    speedKmh !== null
  ) {
    const minutes = computeDurationMinutes(distanceKm, speedKmh);
    if (minutes < MINUTES_MIN || minutes > MINUTES_MAX) {
      errors.distanceKm = "La durée calculée doit être entre 1 minute et 24 h.";
    }
  }

  return errors;
}
