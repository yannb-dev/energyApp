import { describe, expect, it } from "vitest";

import { toFieldErrors } from "@/lib/schemas/errors";
import { capsSchema, drinkSchema } from "@/lib/schemas/nutrition";

const CAPS = { carbCap: "60", sodiumCap: "600" };

const BOISSON = {
  drinkEnabled: true,
  drinkBrand: "Overstims",
  drinkName: "Hydrixir",
  drinkConcentration: "40",
  drinkKcalPer100: "380",
  drinkCarbsPer100: "90",
  drinkSaltPer100: "1,5",
};

describe("capsSchema", () => {
  it("accepte des plafonds valides", () => {
    expect(toFieldErrors(capsSchema, CAPS)).toEqual({});
  });

  it("borne les glucides max (exemple 7)", () => {
    expect(toFieldErrors(capsSchema, { ...CAPS, carbCap: "130" })).toEqual({
      carbCap: "Les glucides max : la valeur doit être entre 20 et 120 g/h.",
    });
  });

  it("borne le sodium max", () => {
    expect(toFieldErrors(capsSchema, { ...CAPS, sodiumCap: "50" })).toEqual({
      sodiumCap: "Le sodium max : la valeur doit être entre 100 et 1500 mg/h.",
    });
  });

  it("exige les deux plafonds", () => {
    expect(
      toFieldErrors(capsSchema, { carbCap: "", sodiumCap: "" }),
    ).toEqual({
      carbCap: "Les glucides max sont obligatoires.",
      sodiumCap: "Le sodium max est obligatoire.",
    });
  });
});

describe("drinkSchema", () => {
  it("n'émet aucune erreur sans boisson (exemple 8)", () => {
    expect(
      toFieldErrors(drinkSchema, {
        drinkEnabled: false,
        drinkBrand: "",
        drinkName: "",
        drinkConcentration: "",
        drinkKcalPer100: "",
        drinkCarbsPer100: "",
        drinkSaltPer100: "",
      }),
    ).toEqual({});
  });

  it("accepte une boisson complète", () => {
    expect(toFieldErrors(drinkSchema, BOISSON)).toEqual({});
  });

  it("exige la marque et le nom de la boisson", () => {
    expect(
      toFieldErrors(drinkSchema, { ...BOISSON, drinkBrand: "", drinkName: " " }),
    ).toEqual({
      drinkBrand: "La marque de la boisson est obligatoire.",
      drinkName: "Le nom de la boisson est obligatoire.",
    });
  });

  it("exige des glucides supérieurs à 0 (exemple 8)", () => {
    expect(
      toFieldErrors(drinkSchema, { ...BOISSON, drinkCarbsPer100: "0" }),
    ).toEqual({
      drinkCarbsPer100:
        "Les glucides pour 100 g de poudre doivent être supérieurs à 0 et au plus 100 g.",
    });
    expect(
      toFieldErrors(drinkSchema, { ...BOISSON, drinkCarbsPer100: "101" }),
    ).toEqual({
      drinkCarbsPer100:
        "Les glucides pour 100 g de poudre doivent être supérieurs à 0 et au plus 100 g.",
    });
  });

  it("borne la concentration et l'énergie", () => {
    expect(
      toFieldErrors(drinkSchema, { ...BOISSON, drinkConcentration: "0" }),
    ).toEqual({
      drinkConcentration:
        "La concentration : la valeur doit être entre 1 et 150 g/L.",
    });
    expect(
      toFieldErrors(drinkSchema, { ...BOISSON, drinkKcalPer100: "501" }),
    ).toEqual({
      drinkKcalPer100:
        "L'énergie pour 100 g de poudre : la valeur doit être entre 0 et 500 kcal.",
    });
  });

  it("borne le sel", () => {
    expect(
      toFieldErrors(drinkSchema, { ...BOISSON, drinkSaltPer100: "101" }),
    ).toEqual({
      drinkSaltPer100:
        "Le sel pour 100 g de poudre : la valeur doit être entre 0 et 100 g.",
    });
  });

  it("exige les champs numériques quand la boisson est activée", () => {
    expect(
      toFieldErrors(drinkSchema, {
        ...BOISSON,
        drinkConcentration: "",
        drinkKcalPer100: "",
        drinkCarbsPer100: "",
        drinkSaltPer100: "",
      }),
    ).toEqual({
      drinkConcentration: "La concentration est obligatoire.",
      drinkKcalPer100: "L'énergie pour 100 g de poudre est obligatoire.",
      drinkCarbsPer100: "Les glucides pour 100 g de poudre sont obligatoires.",
      drinkSaltPer100: "Le sel pour 100 g de poudre est obligatoire.",
    });
  });
});
