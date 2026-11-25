import { useFormContext } from "react-hook-form";

import { FieldError } from "@/components/forms/FieldError";
import { NumberField, TextField } from "@/components/forms/fields";
import { FIELD, FIELD_LABEL } from "@/components/forms/styles";
import {
  PRODUCT_KCAL_MAX,
  PRODUCT_KCAL_MIN,
  PRODUCT_SALT_MAX,
  PRODUCT_SALT_MIN,
  PRODUCT_TYPES,
  PRODUCT_WEIGHT_MAX,
  PRODUCT_WEIGHT_MIN,
} from "@/lib/products";
import type { ProductDraftValues } from "@/lib/schemas/product";

/** Champs du brouillon produit, dont le `<select>` Type. */
export function ProductFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<ProductDraftValues>();

  const typeError = errors.type?.message;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <TextField
        id="nutrition-product-brand"
        label="Marque"
        registration={register("brand")}
        error={errors.brand?.message}
      />
      <TextField
        id="nutrition-product-name"
        label="Nom du produit"
        registration={register("name")}
        error={errors.name?.message}
      />
      <div>
        <label htmlFor="nutrition-product-type" className={FIELD_LABEL}>
          Type
        </label>
        <div className="relative">
          <select
            id="nutrition-product-type"
            {...register("type")}
            aria-invalid={typeError ? true : undefined}
            aria-describedby={
              typeError ? "nutrition-product-type-erreur" : undefined
            }
            className={`${FIELD} appearance-none pr-10`}
          >
            <option value="">— Choisis un type —</option>
            {PRODUCT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            className="pointer-events-none absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2 text-muted"
          >
            <path
              d="M5 7.5 10 12.5 15 7.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <FieldError id="nutrition-product-type-erreur" message={typeError} />
      </div>
      <NumberField
        id="nutrition-product-kcal"
        label="Énergie (kcal)"
        min={PRODUCT_KCAL_MIN}
        max={PRODUCT_KCAL_MAX}
        step={1}
        registration={register("kcal")}
        error={errors.kcal?.message}
      />
      <NumberField
        id="nutrition-product-carbs"
        label="Glucides (g)"
        min={0}
        max={PRODUCT_WEIGHT_MAX}
        step={0.1}
        registration={register("carbs")}
        error={errors.carbs?.message}
      />
      <NumberField
        id="nutrition-product-salt"
        label="Sel (g)"
        min={PRODUCT_SALT_MIN}
        max={PRODUCT_SALT_MAX}
        step={0.01}
        registration={register("salt")}
        error={errors.salt?.message}
      />
      <NumberField
        id="nutrition-product-weight"
        label="Poids (g)"
        min={PRODUCT_WEIGHT_MIN}
        max={PRODUCT_WEIGHT_MAX}
        step={1}
        registration={register("weight")}
        error={errors.weight?.message}
      />
    </div>
  );
}
