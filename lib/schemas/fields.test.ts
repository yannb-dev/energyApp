import { describe, expect, it } from "vitest";

import {
  decimalField,
  optionalDecimalField,
  rangeMessage,
  textField,
} from "@/lib/schemas/fields";

const AGE = decimalField({
  required: true,
  requiredMessage: "L'âge est obligatoire.",
  min: 10,
  max: 100,
  rangeMessage: "L'âge doit être entre 10 et 100 ans.",
  integer: true,
  integerMessage: "L'âge doit être un nombre entier.",
});

const POIDS = decimalField({
  required: true,
  requiredMessage: "Le poids est obligatoire.",
  min: 30,
  max: 300,
  rangeMessage: "Le poids doit être entre 30 et 300 kg.",
});

const VMA = optionalDecimalField({
  min: 8,
  max: 30,
  rangeMessage: "La VMA doit être entre 8 et 30 km/h.",
});

const MARQUE = textField("La marque");

type Schema = typeof AGE;

/** Premier message d'erreur d'un champ, tel que l'afficherait le formulaire. */
function message(schema: Schema, value: string): string | undefined {
  const result = schema.safeParse(value);
  if (result.success) {
    return undefined;
  }
  return result.error.issues[0]?.message;
}

describe("decimalField", () => {
  it("accepte la virgule décimale (exemple 1)", () => {
    expect(POIDS.safeParse("70,5").success).toBe(true);
    expect(POIDS.safeParse("70.5").success).toBe(true);
    expect(POIDS.safeParse("42").success).toBe(true);
  });

  it("exige une valeur quand le champ est obligatoire (exemple 1)", () => {
    expect(message(AGE, "")).toBe("L'âge est obligatoire.");
    expect(message(AGE, "   ")).toBe("L'âge est obligatoire.");
  });

  it("signale une valeur non numérique avec le message de bornes (exemple 1)", () => {
    expect(message(AGE, "abc")).toBe("L'âge doit être entre 10 et 100 ans.");
  });

  it("signale une valeur hors bornes", () => {
    expect(message(AGE, "9")).toBe("L'âge doit être entre 10 et 100 ans.");
    expect(message(AGE, "101")).toBe("L'âge doit être entre 10 et 100 ans.");
  });

  it("signale un nombre non entier avant les bornes (exemple 1)", () => {
    expect(message(AGE, "25.5")).toBe("L'âge doit être un nombre entier.");
    expect(message(AGE, "25,5")).toBe("L'âge doit être un nombre entier.");
    expect(message(AGE, "9,5")).toBe("L'âge doit être un nombre entier.");
  });

  it("n'émet qu'un seul message par valeur", () => {
    const result = AGE.safeParse("9,5");
    expect(result.success).toBe(false);
    expect(result.success ? [] : result.error.issues).toHaveLength(1);
  });
});

describe("optionalDecimalField", () => {
  it("accepte une chaîne vide", () => {
    expect(VMA.safeParse("").success).toBe(true);
  });

  it("applique les bornes quand une valeur est saisie", () => {
    expect(VMA.safeParse("12,5").success).toBe(true);
    expect(message(VMA, "31")).toBe("La VMA doit être entre 8 et 30 km/h.");
    expect(message(VMA, "abc")).toBe("La VMA doit être entre 8 et 30 km/h.");
  });
});

describe("textField", () => {
  it("exige un texte non vide", () => {
    expect(message(MARQUE, "  ")).toBe("La marque est obligatoire.");
  });

  it("limite le texte à 50 caractères", () => {
    expect(MARQUE.safeParse("x".repeat(50)).success).toBe(true);
    expect(message(MARQUE, "x".repeat(51))).toBe(
      "La marque ne doit pas dépasser 50 caractères.",
    );
  });
});

describe("rangeMessage", () => {
  it("formate la valeur attendue", () => {
    expect(rangeMessage("Les glucides max", 20, 120, "g/h")).toBe(
      "Les glucides max : la valeur doit être entre 20 et 120 g/h.",
    );
  });
});
