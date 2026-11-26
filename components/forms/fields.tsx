import type { UseFormRegisterReturn } from "react-hook-form";

import { FieldError } from "@/components/forms/FieldError";
import { FIELD, FIELD_LABEL } from "@/components/forms/styles";
import { TEXT_MAX_LENGTH } from "@/lib/products";

type TextFieldProps = {
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
  error?: string;
};

/** Champ texte relié à un formulaire React Hook Form. */
export function TextField({
  id,
  label,
  registration,
  error,
}: TextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        maxLength={TEXT_MAX_LENGTH}
        {...registration}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-erreur` : undefined}
        className={FIELD}
      />
      <FieldError id={`${id}-erreur`} message={error} />
    </div>
  );
}

type NumberFieldProps = {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  registration: UseFormRegisterReturn;
  error?: string;
};

/** Champ numérique relié à un formulaire React Hook Form. */
export function NumberField({
  id,
  label,
  min,
  max,
  step,
  registration,
  error,
}: NumberFieldProps) {
  return (
    <div>
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        {...registration}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-erreur` : undefined}
        className={FIELD}
      />
      <FieldError id={`${id}-erreur`} message={error} />
    </div>
  );
}
