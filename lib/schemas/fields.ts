import { z } from "zod";

import { parseDecimal } from "@/lib/energy";
import { TEXT_MAX_LENGTH } from "@/lib/schemas/limits";

/** « {label} : la valeur doit être entre {min} et {max} {unit}. » */
export function rangeMessage(
  label: string,
  min: number,
  max: number,
  unit: string,
): string {
  return `${label} : la valeur doit être entre ${min} et ${max} ${unit}.`;
}

export type DecimalFieldOptions = {
  /** Une valeur vide est-elle refusée ? */
  required: boolean;
  requiredMessage: string;
  min: number;
  max: number;
  rangeMessage: string;
  integer?: boolean;
  integerMessage?: string;
};

/**
 * Champ numérique saisi en texte : virgule décimale acceptée, un seul message.
 * Ordre des contrôles : vide, puis non numérique ou hors bornes, puis non entier.
 */
export function decimalField(options: DecimalFieldOptions) {
  const { required, requiredMessage, min, max } = options;
  const boundsMessage = options.rangeMessage;

  return z.string().superRefine((raw, ctx) => {
    if (raw.trim() === "") {
      if (required) {
        ctx.addIssue({ code: "custom", message: requiredMessage });
      }
      return;
    }

    const value = parseDecimal(raw);
    if (value === null) {
      ctx.addIssue({ code: "custom", message: boundsMessage });
      return;
    }

    if (options.integer && !Number.isInteger(value)) {
      ctx.addIssue({
        code: "custom",
        message: options.integerMessage ?? boundsMessage,
      });
      return;
    }

    if (value < min || value > max) {
      ctx.addIssue({ code: "custom", message: boundsMessage });
    }
  });
}

export type OptionalDecimalFieldOptions = Omit<
  DecimalFieldOptions,
  "required" | "requiredMessage"
>;

/** Champ numérique facultatif : une chaîne vide est valide (VMA, PMA). */
export function optionalDecimalField(options: OptionalDecimalFieldOptions) {
  return decimalField({ ...options, required: false, requiredMessage: "" });
}

/** Champ texte obligatoire, limité à TEXT_MAX_LENGTH caractères. */
export function textField(label: string) {
  return z.string().superRefine((raw, ctx) => {
    const trimmed = raw.trim();
    if (trimmed === "") {
      ctx.addIssue({ code: "custom", message: `${label} est obligatoire.` });
      return;
    }
    if (trimmed.length > TEXT_MAX_LENGTH) {
      ctx.addIssue({
        code: "custom",
        message: `${label} ne doit pas dépasser ${TEXT_MAX_LENGTH} caractères.`,
      });
    }
  });
}
