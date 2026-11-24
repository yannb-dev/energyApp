import { z } from "zod";

import { parseDecimal } from "@/lib/energy";
import { isProductType } from "@/lib/products";
import { decimalField, rangeMessage, textField } from "@/lib/schemas/fields";
import {
  PRODUCT_KCAL_MAX,
  PRODUCT_KCAL_MIN,
  PRODUCT_SALT_MAX,
  PRODUCT_SALT_MIN,
  PRODUCT_WEIGHT_MAX,
  PRODUCT_WEIGHT_MIN,
} from "@/lib/schemas/limits";

/** Seul contrôle de champ des glucides : la valeur est lisible. */
const carbs = z.string().superRefine((raw, ctx) => {
  if (raw.trim() === "" || parseDecimal(raw) === null) {
    ctx.addIssue({
      code: "custom",
      message: "Les glucides de l'unité sont obligatoires.",
    });
  }
});

export const productDraftSchema = z
  .object({
    brand: textField("La marque"),
    name: textField("Le nom du produit"),
    type: z.string().superRefine((raw, ctx) => {
      if (!isProductType(raw)) {
        ctx.addIssue({
          code: "custom",
          message: "Choisis un type de produit.",
        });
      }
    }),
    kcal: decimalField({
      required: true,
      requiredMessage: "L'énergie de l'unité est obligatoire.",
      min: PRODUCT_KCAL_MIN,
      max: PRODUCT_KCAL_MAX,
      rangeMessage: rangeMessage(
        "L'énergie de l'unité",
        PRODUCT_KCAL_MIN,
        PRODUCT_KCAL_MAX,
        "kcal",
      ),
    }),
    weight: decimalField({
      required: true,
      requiredMessage: "Le poids de l'unité est obligatoire.",
      min: PRODUCT_WEIGHT_MIN,
      max: PRODUCT_WEIGHT_MAX,
      rangeMessage: rangeMessage(
        "Le poids de l'unité",
        PRODUCT_WEIGHT_MIN,
        PRODUCT_WEIGHT_MAX,
        "g",
      ),
    }),
    carbs,
    salt: decimalField({
      required: true,
      requiredMessage: "Le sel de l'unité est obligatoire.",
      min: PRODUCT_SALT_MIN,
      max: PRODUCT_SALT_MAX,
      rangeMessage: rangeMessage(
        "Le sel de l'unité",
        PRODUCT_SALT_MIN,
        PRODUCT_SALT_MAX,
        "g",
      ),
    }),
  })
  .superRefine((values, ctx) => {
    // Règle entre champs : indépendante des autres erreurs du brouillon.
    const carbsValue = parseDecimal(values.carbs);
    if (carbsValue === null) {
      return;
    }
    const weightValue = parseDecimal(values.weight);

    if (
      carbsValue <= 0 ||
      (weightValue !== null && carbsValue > weightValue)
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Les glucides de l'unité doivent être supérieurs à 0 et ne pas dépasser le poids de l'unité.",
        path: ["carbs"],
      });
    }
  });

export type ProductDraftValues = z.input<typeof productDraftSchema>;
