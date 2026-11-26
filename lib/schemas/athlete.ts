import { z } from "zod";

import { parseDecimal } from "@/lib/energy";
import { BIKE_POSITIONS } from "@/lib/intensity";
import { optionalDecimalField } from "@/lib/schemas/fields";
import {
  BIKE_KG_MAX,
  BIKE_KG_MIN,
  PMA_WATTS_MAX,
  PMA_WATTS_MIN,
  VMA_KMH_MAX,
  VMA_KMH_MIN,
} from "@/lib/schemas/limits";

export const athleteSchema = z
  .object({
    vmaKmh: optionalDecimalField({
      min: VMA_KMH_MIN,
      max: VMA_KMH_MAX,
      rangeMessage: `La VMA doit être entre ${VMA_KMH_MIN} et ${VMA_KMH_MAX} km/h.`,
    }),
    pmaWatts: optionalDecimalField({
      min: PMA_WATTS_MIN,
      max: PMA_WATTS_MAX,
      rangeMessage: `La PMA doit être entre ${PMA_WATTS_MIN} et ${PMA_WATTS_MAX} W.`,
      integer: true,
      integerMessage: "La PMA doit être un nombre entier.",
    }),
    hasBike: z.boolean(),
    /** Poids du vélo : contrôlé seulement si hasBike, donc au niveau de l'objet. */
    bikeKg: z.string(),
  })
  .superRefine((values, ctx) => {
    if (!values.hasBike) {
      return;
    }

    if (values.bikeKg.trim() === "") {
      ctx.addIssue({
        code: "custom",
        message: "Le poids du vélo est obligatoire.",
        path: ["bikeKg"],
      });
      return;
    }

    const bikeKg = parseDecimal(values.bikeKg);
    if (bikeKg === null || bikeKg < BIKE_KG_MIN || bikeKg > BIKE_KG_MAX) {
      ctx.addIssue({
        code: "custom",
        message: `Le poids du vélo doit être entre ${BIKE_KG_MIN} et ${BIKE_KG_MAX} kg.`,
        path: ["bikeKg"],
      });
    }
  });

/**
 * Données athlète enregistrées : les règles du formulaire, plus la position
 * sur le vélo. safeExtend conserve le superRefine de athleteSchema.
 */
export const athleteSettingsSchema = athleteSchema.safeExtend({
  bikePosition: z.enum(BIKE_POSITIONS.map((position) => position.id)),
});

export type AthleteValues = z.input<typeof athleteSchema>;
