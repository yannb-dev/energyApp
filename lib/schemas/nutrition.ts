import { z } from "zod";

import { parseDecimal } from "@/lib/energy";
import {
  CARB_CAP_MAX,
  CARB_CAP_MIN,
  DRINK_CARBS_MAX,
  DRINK_CONCENTRATION_MAX,
  DRINK_CONCENTRATION_MIN,
  DRINK_KCAL_MAX,
  DRINK_KCAL_MIN,
  DRINK_SALT_MAX,
  DRINK_SALT_MIN,
  SODIUM_CAP_MAX,
  SODIUM_CAP_MIN,
} from "@/lib/nutrition";
import { decimalField, rangeMessage, textField } from "@/lib/schemas/fields";

/** Plafonds à respecter : valeurs toujours contrôlées. */
export const capsSchema = z.object({
  carbCap: decimalField({
    required: true,
    requiredMessage: "Les glucides max sont obligatoires.",
    min: CARB_CAP_MIN,
    max: CARB_CAP_MAX,
    rangeMessage: rangeMessage(
      "Les glucides max",
      CARB_CAP_MIN,
      CARB_CAP_MAX,
      "g/h",
    ),
  }),
  sodiumCap: decimalField({
    required: true,
    requiredMessage: "Le sodium max est obligatoire.",
    min: SODIUM_CAP_MIN,
    max: SODIUM_CAP_MAX,
    rangeMessage: rangeMessage(
      "Le sodium max",
      SODIUM_CAP_MIN,
      SODIUM_CAP_MAX,
      "mg/h",
    ),
  }),
});

/** Champs de la boisson : contrôlés seulement quand la case est cochée. */
const drinkFields = z.object({
  drinkBrand: textField("La marque de la boisson"),
  drinkName: textField("Le nom de la boisson"),
  drinkConcentration: decimalField({
    required: true,
    requiredMessage: "La concentration est obligatoire.",
    min: DRINK_CONCENTRATION_MIN,
    max: DRINK_CONCENTRATION_MAX,
    rangeMessage: rangeMessage(
      "La concentration",
      DRINK_CONCENTRATION_MIN,
      DRINK_CONCENTRATION_MAX,
      "g/L",
    ),
  }),
  drinkKcalPer100: decimalField({
    required: true,
    requiredMessage: "L'énergie pour 100 g de poudre est obligatoire.",
    min: DRINK_KCAL_MIN,
    max: DRINK_KCAL_MAX,
    rangeMessage: rangeMessage(
      "L'énergie pour 100 g de poudre",
      DRINK_KCAL_MIN,
      DRINK_KCAL_MAX,
      "kcal",
    ),
  }),
  drinkCarbsPer100: z.string().superRefine((raw, ctx) => {
    if (raw.trim() === "") {
      ctx.addIssue({
        code: "custom",
        message: "Les glucides pour 100 g de poudre sont obligatoires.",
      });
      return;
    }
    const value = parseDecimal(raw);
    if (value === null) {
      ctx.addIssue({
        code: "custom",
        message: "Les glucides pour 100 g de poudre sont obligatoires.",
      });
      return;
    }
    if (value <= 0 || value > DRINK_CARBS_MAX) {
      ctx.addIssue({
        code: "custom",
        message:
          "Les glucides pour 100 g de poudre doivent être supérieurs à 0 et au plus 100 g.",
      });
    }
  }),
  drinkSaltPer100: decimalField({
    required: true,
    requiredMessage: "Le sel pour 100 g de poudre est obligatoire.",
    min: DRINK_SALT_MIN,
    max: DRINK_SALT_MAX,
    rangeMessage: rangeMessage(
      "Le sel pour 100 g de poudre",
      DRINK_SALT_MIN,
      DRINK_SALT_MAX,
      "g",
    ),
  }),
});

/** Boisson énergétique : aucune règle quand la case est décochée. */
export const drinkSchema = z
  .object({
    drinkEnabled: z.boolean(),
    drinkBrand: z.string(),
    drinkName: z.string(),
    drinkConcentration: z.string(),
    drinkKcalPer100: z.string(),
    drinkCarbsPer100: z.string(),
    drinkSaltPer100: z.string(),
  })
  .superRefine((values, ctx) => {
    if (!values.drinkEnabled) {
      return;
    }

    const result = drinkFields.safeParse({
      drinkBrand: values.drinkBrand,
      drinkName: values.drinkName,
      drinkConcentration: values.drinkConcentration,
      drinkKcalPer100: values.drinkKcalPer100,
      drinkCarbsPer100: values.drinkCarbsPer100,
      drinkSaltPer100: values.drinkSaltPer100,
    });
    if (result.success) {
      return;
    }

    for (const issue of result.error.issues) {
      ctx.addIssue({
        code: "custom",
        message: issue.message,
        path: issue.path,
      });
    }
  });

export type CapsValues = z.input<typeof capsSchema>;
export type DrinkValues = z.input<typeof drinkSchema>;
