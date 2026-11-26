import { z } from "zod";

import {
  computeDurationMinutes,
  formatPace,
  parsePace,
  speedToKmh,
  type SpeedUnit,
} from "@/lib/effort";
import { parseDecimal } from "@/lib/energy";
import { MINUTES_MAX, MINUTES_MIN } from "@/lib/nutrition";
import {
  DISTANCE_KM_MAX,
  DISTANCE_KM_MIN,
  PACE_SEC_PER_KM_MAX,
  PACE_SEC_PER_KM_MIN,
  SPEED_KMH_MAX,
  SPEED_KMH_MIN,
} from "@/lib/schemas/limits";

/** Affichage d'un nombre à la française dans un message (« 0,1 »). */
function french(value: number): string {
  return String(value).replace(".", ",");
}

const DISTANCE_MESSAGE = `La distance doit être entre ${french(DISTANCE_KM_MIN)} et ${french(DISTANCE_KM_MAX)} km.`;
const SPEED_MESSAGE = `La vitesse doit être entre ${french(SPEED_KMH_MIN)} et ${french(SPEED_KMH_MAX)} km/h.`;

/** Une unité inconnue retombe sur km/h, comme le faisait validateEffort. */
function unitOf(speedUnit: string): SpeedUnit {
  return speedUnit === "minkm" ? "minkm" : "kmh";
}

const distanceKm = z.string().superRefine((raw, ctx) => {
  if (raw.trim() === "") {
    ctx.addIssue({ code: "custom", message: "La distance est obligatoire." });
    return;
  }
  const value = parseDecimal(raw);
  if (
    value === null ||
    value < DISTANCE_KM_MIN ||
    value > DISTANCE_KM_MAX
  ) {
    ctx.addIssue({ code: "custom", message: DISTANCE_MESSAGE });
  }
});

const speed = z.string();

export const effortSchema = z
  .object({
    distanceKm,
    speed,
    speedUnit: z.string(),
  })
  .superRefine((values, ctx) => {
    const isPace = values.speedUnit === "minkm";

    if (values.speed.trim() === "") {
      ctx.addIssue({
        code: "custom",
        message: isPace
          ? "L'allure est obligatoire."
          : "La vitesse est obligatoire.",
        path: ["speed"],
      });
      return;
    }

    if (isPace) {
      const secPerKm = parsePace(values.speed);
      if (secPerKm === null) {
        ctx.addIssue({
          code: "custom",
          message: "L'allure doit être au format mm:ss (ex. 5:30).",
          path: ["speed"],
        });
        return;
      }
      if (secPerKm < PACE_SEC_PER_KM_MIN || secPerKm > PACE_SEC_PER_KM_MAX) {
        ctx.addIssue({
          code: "custom",
          message: `L'allure doit être entre ${formatPace(PACE_SEC_PER_KM_MIN)} et ${formatPace(PACE_SEC_PER_KM_MAX)} min/km.`,
          path: ["speed"],
        });
      }
      return;
    }

    const speedKmh = speedToKmh(values.speed, unitOf(values.speedUnit));
    if (
      speedKmh === null ||
      speedKmh < SPEED_KMH_MIN ||
      speedKmh > SPEED_KMH_MAX
    ) {
      ctx.addIssue({ code: "custom", message: SPEED_MESSAGE, path: ["speed"] });
    }
  })
  .superRefine((values, ctx) => {
    // Durée dérivée : contrôlée seulement si la distance et la vitesse sont valides.
    const distance = parseDecimal(values.distanceKm);
    if (
      distance === null ||
      distance < DISTANCE_KM_MIN ||
      distance > DISTANCE_KM_MAX
    ) {
      return;
    }

    const speedKmh = speedToKmh(values.speed, unitOf(values.speedUnit));
    if (speedKmh === null || speedKmh < SPEED_KMH_MIN || speedKmh > SPEED_KMH_MAX) {
      return;
    }

    const minutes = computeDurationMinutes(distance, speedKmh);
    if (minutes < MINUTES_MIN || minutes > MINUTES_MAX) {
      ctx.addIssue({
        code: "custom",
        message: "La durée calculée doit être entre 1 minute et 24 h.",
        path: ["distanceKm"],
      });
    }
  });

export type EffortValues = z.input<typeof effortSchema>;
