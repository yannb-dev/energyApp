import { useFormContext } from "react-hook-form";

import { NumberField } from "@/components/forms/fields";
import {
  CARB_CAP_MAX,
  CARB_CAP_MIN,
  CARB_CAP_RECOMMENDED,
  SODIUM_CAP_MAX,
  SODIUM_CAP_MIN,
  SODIUM_CAP_RECOMMENDED,
} from "@/lib/nutrition";
import type { NutritionSettings } from "@/lib/nutritionStorage";
import type { CapsValues } from "@/lib/schemas/nutrition";

type CapsFieldsProps = {
  /** Enregistre chaque frappe, comme avant React Hook Form. */
  patchSettings: (part: Partial<NutritionSettings>) => void;
};

/** Plafonds de glucides et de sodium, avec leurs repères usuels. */
export function CapsFields({ patchSettings }: CapsFieldsProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<CapsValues>();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <NumberField
          id="nutrition-carb-cap"
          label="Glucides max (g/h)"
          min={CARB_CAP_MIN}
          max={CARB_CAP_MAX}
          step={1}
          registration={register("carbCap", {
            onChange: (event) => patchSettings({ carbCap: event.target.value }),
          })}
          error={errors.carbCap?.message}
        />
        <p className="mt-1 text-xs text-muted">
          Repère usuel : {CARB_CAP_RECOMMENDED.min} à {CARB_CAP_RECOMMENDED.max}{" "}
          g/h
        </p>
      </div>
      <div>
        <NumberField
          id="nutrition-sodium-cap"
          label="Sodium max (mg/h)"
          min={SODIUM_CAP_MIN}
          max={SODIUM_CAP_MAX}
          step={10}
          registration={register("sodiumCap", {
            onChange: (event) =>
              patchSettings({ sodiumCap: event.target.value }),
          })}
          error={errors.sodiumCap?.message}
        />
        <p className="mt-1 text-xs text-muted">
          Repère usuel : {SODIUM_CAP_RECOMMENDED.min} à{" "}
          {SODIUM_CAP_RECOMMENDED.max} mg/h
        </p>
      </div>
    </div>
  );
}
