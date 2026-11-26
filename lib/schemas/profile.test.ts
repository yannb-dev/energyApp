import { describe, expect, it } from "vitest";

import { toFieldErrors } from "@/lib/schemas/errors";
import { energyFormSchema, profileSchema } from "@/lib/schemas/profile";

const PROFIL = {
  sex: "male",
  age: "40",
  weightKg: "75",
  heightCm: "180",
};

const FORM = { ...PROFIL, sportId: "course", minutes: "45" };

describe("profileSchema", () => {
  it("accepte un profil complet", () => {
    expect(toFieldErrors(profileSchema, PROFIL)).toEqual({});
  });

  it("exige un sexe (exemple 3)", () => {
    expect(toFieldErrors(profileSchema, { ...PROFIL, sex: "" })).toEqual({
      sex: "Choisis un sexe.",
    });
  });

  it("borne l'âge entre 10 et 100 ans (exemple 3)", () => {
    expect(toFieldErrors(profileSchema, { ...PROFIL, age: "9" })).toEqual({
      age: "L'âge doit être entre 10 et 100 ans.",
    });
    expect(toFieldErrors(profileSchema, { ...PROFIL, age: "101" }).age).toBe(
      "L'âge doit être entre 10 et 100 ans.",
    );
  });

  it("exige un âge entier (exemple 3)", () => {
    expect(toFieldErrors(profileSchema, { ...PROFIL, age: "25,5" })).toEqual({
      age: "L'âge doit être un nombre entier.",
    });
  });

  it("exige l'âge, le poids et la taille", () => {
    const errors = toFieldErrors(profileSchema, {
      ...PROFIL,
      age: "",
      weightKg: "",
      heightCm: "",
    });
    expect(errors).toEqual({
      age: "L'âge est obligatoire.",
      weightKg: "Le poids est obligatoire.",
      heightCm: "La taille est obligatoire.",
    });
  });

  it("accepte la virgule décimale pour le poids et la taille", () => {
    expect(
      toFieldErrors(profileSchema, {
        ...PROFIL,
        weightKg: "70,5",
        heightCm: "180,5",
      }),
    ).toEqual({});
  });
});

describe("energyFormSchema", () => {
  it("accepte un formulaire complet", () => {
    expect(toFieldErrors(energyFormSchema, FORM)).toEqual({});
  });

  it("exige un sport", () => {
    expect(toFieldErrors(energyFormSchema, { ...FORM, sportId: "" })).toEqual({
      sportId: "Choisis un sport.",
    });
  });

  it("ne valide pas la durée (elle vient de validateEffort)", () => {
    expect(toFieldErrors(energyFormSchema, { ...FORM, minutes: "" })).toEqual(
      {},
    );
    expect(toFieldErrors(energyFormSchema, { ...FORM, minutes: "0" })).toEqual(
      {},
    );
  });
});
