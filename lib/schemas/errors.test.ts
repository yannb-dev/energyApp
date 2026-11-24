import { describe, expect, it } from "vitest";
import { z } from "zod";

import { toFieldErrors } from "@/lib/schemas/errors";

const schema = z.object({
  brand: z.string().min(1, "La marque est obligatoire."),
  name: z.string().min(1, "Le nom du produit est obligatoire."),
});

/** Champ à deux contrôles : aucun message ne peut satisfaire les deux. */
const doubleCheck = z.object({
  code: z.string().min(5, "Trop court.").max(3, "Trop long."),
});

const VALID = { brand: "Overstims", name: "Gel" };

describe("toFieldErrors", () => {
  it("retourne un objet vide pour des valeurs valides", () => {
    expect(toFieldErrors(schema, VALID)).toEqual({});
  });

  it("retourne un message par champ invalide (exemple 2)", () => {
    const errors = toFieldErrors(schema, { ...VALID, brand: "", name: "" });

    expect(Object.keys(errors).sort()).toEqual(["brand", "name"]);
    expect(errors.brand).toBe("La marque est obligatoire.");
    expect(errors.name).toBe("Le nom du produit est obligatoire.");
  });

  it("ne garde que le premier message d'un champ (exemple 2)", () => {
    expect(toFieldErrors(doubleCheck, { code: "abcd" })).toEqual({
      code: "Trop court.",
    });
  });
});
