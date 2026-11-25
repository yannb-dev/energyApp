import { useFormContext } from "react-hook-form";

import { NumberField, TextField } from "@/components/forms/fields";
import {
  DRINK_CARBS_MAX,
  DRINK_CONCENTRATION_MAX,
  DRINK_CONCENTRATION_MIN,
  DRINK_KCAL_MAX,
  DRINK_KCAL_MIN,
  DRINK_SALT_MAX,
  DRINK_SALT_MIN,
} from "@/lib/nutrition";
import type { NutritionSettings } from "@/lib/nutritionStorage";
import type { DrinkValues } from "@/lib/schemas/nutrition";

type DrinkFieldsProps = {
  /** Enregistre chaque frappe, comme avant React Hook Form. */
  patchSettings: (part: Partial<NutritionSettings>) => void;
};

/** Les six champs de la boisson énergétique. */
export function DrinkFields({ patchSettings }: DrinkFieldsProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<DrinkValues>();

  return (
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <TextField
        id="nutrition-drink-brand"
        label="Marque de la boisson"
        registration={register("drinkBrand", {
          onChange: (event) =>
            patchSettings({ drinkBrand: event.target.value }),
        })}
        error={errors.drinkBrand?.message}
      />
      <TextField
        id="nutrition-drink-name"
        label="Nom de la boisson"
        registration={register("drinkName", {
          onChange: (event) => patchSettings({ drinkName: event.target.value }),
        })}
        error={errors.drinkName?.message}
      />
      <NumberField
        id="nutrition-drink-concentration"
        label="Concentration (g/L)"
        min={DRINK_CONCENTRATION_MIN}
        max={DRINK_CONCENTRATION_MAX}
        step={1}
        registration={register("drinkConcentration", {
          onChange: (event) =>
            patchSettings({ drinkConcentration: event.target.value }),
        })}
        error={errors.drinkConcentration?.message}
      />
      <NumberField
        id="nutrition-drink-kcal"
        label="Énergie pour 100 g (kcal)"
        min={DRINK_KCAL_MIN}
        max={DRINK_KCAL_MAX}
        step={1}
        registration={register("drinkKcalPer100", {
          onChange: (event) =>
            patchSettings({ drinkKcalPer100: event.target.value }),
        })}
        error={errors.drinkKcalPer100?.message}
      />
      <NumberField
        id="nutrition-drink-carbs"
        label="Glucides pour 100 g (g)"
        min={0}
        max={DRINK_CARBS_MAX}
        step={0.1}
        registration={register("drinkCarbsPer100", {
          onChange: (event) =>
            patchSettings({ drinkCarbsPer100: event.target.value }),
        })}
        error={errors.drinkCarbsPer100?.message}
      />
      <NumberField
        id="nutrition-drink-salt"
        label="Sel pour 100 g (g)"
        min={DRINK_SALT_MIN}
        max={DRINK_SALT_MAX}
        step={0.1}
        registration={register("drinkSaltPer100", {
          onChange: (event) =>
            patchSettings({ drinkSaltPer100: event.target.value }),
        })}
        error={errors.drinkSaltPer100?.message}
      />
    </div>
  );
}
