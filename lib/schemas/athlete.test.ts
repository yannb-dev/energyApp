import { describe, expect, it } from "vitest";

import { athleteSchema } from "@/lib/schemas/athlete";
import { toFieldErrors } from "@/lib/schemas/errors";

const VIDE = {
  vmaKmh: "",
  pmaWatts: "",
  hasBike: false,
  bikeKg: "",
};

describe("athleteSchema", () => {
  it("n'exige ni VMA ni PMA ni vélo (exemple 5)", () => {
    expect(toFieldErrors(athleteSchema, VIDE)).toEqual({});
  });

  it("accepte une VMA et une PMA renseignées", () => {
    expect(
      toFieldErrors(athleteSchema, { ...VIDE, vmaKmh: "17,5", pmaWatts: "320" }),
    ).toEqual({});
  });

  it("borne la VMA entre 8 et 30 km/h", () => {
    expect(toFieldErrors(athleteSchema, { ...VIDE, vmaKmh: "31" })).toEqual({
      vmaKmh: "La VMA doit être entre 8 et 30 km/h.",
    });
  });

  it("exige une PMA entière (exemple 5)", () => {
    expect(toFieldErrors(athleteSchema, { ...VIDE, pmaWatts: "250,5" })).toEqual(
      { pmaWatts: "La PMA doit être un nombre entier." },
    );
  });

  it("borne la PMA entre 100 et 600 W", () => {
    expect(toFieldErrors(athleteSchema, { ...VIDE, pmaWatts: "700" })).toEqual({
      pmaWatts: "La PMA doit être entre 100 et 600 W.",
    });
  });

  it("exige le poids du vélo quand un vélo est coché (exemple 5)", () => {
    expect(
      toFieldErrors(athleteSchema, { ...VIDE, hasBike: true, bikeKg: "" }),
    ).toEqual({ bikeKg: "Le poids du vélo est obligatoire." });
  });

  it("borne le poids du vélo entre 5 et 25 kg", () => {
    expect(
      toFieldErrors(athleteSchema, { ...VIDE, hasBike: true, bikeKg: "3" }),
    ).toEqual({ bikeKg: "Le poids du vélo doit être entre 5 et 25 kg." });
    expect(
      toFieldErrors(athleteSchema, { ...VIDE, hasBike: true, bikeKg: "9,5" }),
    ).toEqual({});
  });

  it("ignore le poids du vélo sans vélo (exemple 5)", () => {
    expect(
      toFieldErrors(athleteSchema, { ...VIDE, hasBike: false, bikeKg: "3" }),
    ).toEqual({});
  });

  it("cumule les erreurs des champs indépendants", () => {
    const errors = toFieldErrors(athleteSchema, {
      vmaKmh: "31",
      pmaWatts: "250,5",
      hasBike: true,
      bikeKg: "",
    });
    expect(errors).toEqual({
      vmaKmh: "La VMA doit être entre 8 et 30 km/h.",
      pmaWatts: "La PMA doit être un nombre entier.",
      bikeKg: "Le poids du vélo est obligatoire.",
    });
  });
});
