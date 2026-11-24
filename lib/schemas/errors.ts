import { z } from "zod";

/**
 * Valide un formulaire et retourne un message par champ invalide :
 * le premier message rencontré pour chaque champ, comme les `validate*` historiques.
 */
export function toFieldErrors<T extends z.ZodType>(
  schema: T,
  values: z.input<T>,
): Partial<Record<keyof z.input<T>, string>> {
  const result = schema.safeParse(values);
  if (result.success) {
    return {};
  }

  const errors: Partial<Record<keyof z.input<T>, string>> = {};

  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key !== "string") {
      continue;
    }
    const field = key as keyof z.input<T>;
    if (errors[field] !== undefined) {
      continue;
    }
    errors[field] = issue.message;
  }

  return errors;
}
