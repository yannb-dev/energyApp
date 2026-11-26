import { z } from "zod";

import {
  AGE_MAX,
  AGE_MIN,
  HEIGHT_CM_MAX,
  HEIGHT_CM_MIN,
  WEIGHT_KG_MAX,
  WEIGHT_KG_MIN,
} from "@/lib/schemas/limits";
import { decimalField } from "@/lib/schemas/fields";

/** Sexe choisi dans la liste ; la valeur reste une chaîne du formulaire. */
const sex = z.string().superRefine((raw, ctx) => {
  if (raw !== "male" && raw !== "female") {
    ctx.addIssue({ code: "custom", message: "Choisis un sexe." });
  }
});

export const profileSchema = z.object({
  sex,
  age: decimalField({
    required: true,
    requiredMessage: "L'âge est obligatoire.",
    min: AGE_MIN,
    max: AGE_MAX,
    rangeMessage: `L'âge doit être entre ${AGE_MIN} et ${AGE_MAX} ans.`,
    integer: true,
    integerMessage: "L'âge doit être un nombre entier.",
  }),
  weightKg: decimalField({
    required: true,
    requiredMessage: "Le poids est obligatoire.",
    min: WEIGHT_KG_MIN,
    max: WEIGHT_KG_MAX,
    rangeMessage: `Le poids doit être entre ${WEIGHT_KG_MIN} et ${WEIGHT_KG_MAX} kg.`,
  }),
  heightCm: decimalField({
    required: true,
    requiredMessage: "La taille est obligatoire.",
    min: HEIGHT_CM_MIN,
    max: HEIGHT_CM_MAX,
    rangeMessage: `La taille doit être entre ${HEIGHT_CM_MIN} et ${HEIGHT_CM_MAX} cm.`,
  }),
});

/** Formulaire complet : le profil, le sport et une durée volontairement libre. */
export const energyFormSchema = profileSchema.extend({
  sportId: z.string().superRefine((raw, ctx) => {
    if (raw.trim() === "") {
      ctx.addIssue({ code: "custom", message: "Choisis un sport." });
    }
  }),
  minutes: z.string(),
});

export type ProfileValues = z.input<typeof profileSchema>;
export type EnergyFormValues = z.input<typeof energyFormSchema>;
