import { describe, expect, it } from "vitest";

import { toFieldErrors } from "@/lib/schemas/errors";
import { productDraftSchema } from "@/lib/schemas/product";

const GEL = {
  brand: "Overstims",
  name: "Gel énergétique",
  type: "Gel",
  kcal: "90",
  carbs: "22",
  salt: "0,1",
  weight: "32",
};

describe("productDraftSchema", () => {
  it("accepte un produit complet", () => {
    expect(toFieldErrors(productDraftSchema, GEL)).toEqual({});
  });

  it("exige chaque champ", () => {
    const errors = toFieldErrors(productDraftSchema, {
      brand: "",
      name: "",
      type: "",
      kcal: "",
      carbs: "",
      salt: "",
      weight: "",
    });
    expect(Object.keys(errors).sort()).toEqual(
      ["brand", "carbs", "kcal", "name", "salt", "type", "weight"].sort(),
    );
  });

  it("signale des glucides supérieurs au poids (exemple 6)", () => {
    expect(
      toFieldErrors(productDraftSchema, { ...GEL, carbs: "30", weight: "25" }),
    ).toEqual({
      carbs:
        "Les glucides de l'unité doivent être supérieurs à 0 et ne pas dépasser le poids de l'unité.",
    });
  });

  it("maintient la règle des glucides malgré une autre erreur (exemple 6)", () => {
    expect(
      toFieldErrors(productDraftSchema, {
        ...GEL,
        brand: "",
        carbs: "30",
        weight: "25",
      }),
    ).toEqual({
      brand: "La marque est obligatoire.",
      carbs:
        "Les glucides de l'unité doivent être supérieurs à 0 et ne pas dépasser le poids de l'unité.",
    });
  });

  it("exige des glucides supérieurs à zéro", () => {
    expect(toFieldErrors(productDraftSchema, { ...GEL, carbs: "0" })).toEqual({
      carbs:
        "Les glucides de l'unité doivent être supérieurs à 0 et ne pas dépasser le poids de l'unité.",
    });
  });

  it("borne les valeurs numériques", () => {
    expect(toFieldErrors(productDraftSchema, { ...GEL, kcal: "1001" })).toEqual(
      {
        kcal: "L'énergie de l'unité : la valeur doit être entre 0 et 1000 kcal.",
      },
    );
    expect(toFieldErrors(productDraftSchema, { ...GEL, salt: "6" })).toEqual({
      salt: "Le sel de l'unité : la valeur doit être entre 0 et 5 g.",
    });
    expect(toFieldErrors(productDraftSchema, { ...GEL, weight: "0" })).toEqual({
      weight: "Le poids de l'unité : la valeur doit être entre 1 et 500 g.",
      carbs:
        "Les glucides de l'unité doivent être supérieurs à 0 et ne pas dépasser le poids de l'unité.",
    });
  });

  it("exige un type de la liste", () => {
    expect(
      toFieldErrors(productDraftSchema, { ...GEL, type: "Compote" }),
    ).toEqual({ type: "Choisis un type de produit." });
  });

  it("limite les textes à 50 caractères", () => {
    const tropLong = "x".repeat(51);
    expect(
      toFieldErrors(productDraftSchema, { ...GEL, brand: tropLong }).brand,
    ).toBe("La marque ne doit pas dépasser 50 caractères.");
    expect(
      toFieldErrors(productDraftSchema, { ...GEL, name: tropLong }).name,
    ).toBe("Le nom du produit ne doit pas dépasser 50 caractères.");
  });
});
