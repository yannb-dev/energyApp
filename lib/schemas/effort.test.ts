import { describe, expect, it } from "vitest";

import { toFieldErrors } from "@/lib/schemas/errors";
import { effortSchema } from "@/lib/schemas/effort";

const COURSE = { distanceKm: "10", speed: "5:30", speedUnit: "minkm" };
const VELO = { distanceKm: "40", speed: "25", speedUnit: "kmh" };

describe("effortSchema", () => {
  it("accepte un effort valide (exemple 4)", () => {
    expect(toFieldErrors(effortSchema, COURSE)).toEqual({});
    expect(toFieldErrors(effortSchema, VELO)).toEqual({});
  });

  it("exige la distance", () => {
    expect(toFieldErrors(effortSchema, { ...COURSE, distanceKm: "" })).toEqual({
      distanceKm: "La distance est obligatoire.",
    });
  });

  it("borne la distance entre 0,1 et 1000 km", () => {
    expect(
      toFieldErrors(effortSchema, { ...COURSE, distanceKm: "abc" }).distanceKm,
    ).toBe("La distance doit être entre 0,1 et 1000 km.");
    expect(
      toFieldErrors(effortSchema, { ...COURSE, distanceKm: "1001" }).distanceKm,
    ).toBe("La distance doit être entre 0,1 et 1000 km.");
  });

  it("exige la vitesse ou l'allure selon l'unité", () => {
    expect(toFieldErrors(effortSchema, { ...VELO, speed: "" })).toEqual({
      speed: "La vitesse est obligatoire.",
    });
    expect(toFieldErrors(effortSchema, { ...COURSE, speed: "" })).toEqual({
      speed: "L'allure est obligatoire.",
    });
  });

  it("refuse une allure mal formée (exemple 4)", () => {
    expect(toFieldErrors(effortSchema, { ...COURSE, speed: "5:75" })).toEqual({
      speed: "L'allure doit être au format mm:ss (ex. 5:30).",
    });
  });

  it("borne l'allure entre 0:36 et 60:00 min/km", () => {
    expect(
      toFieldErrors(effortSchema, { ...COURSE, speed: "0:30" }).speed,
    ).toBe("L'allure doit être entre 0:36 et 60:00 min/km.");
  });

  it("borne la vitesse entre 1 et 100 km/h", () => {
    expect(toFieldErrors(effortSchema, { ...VELO, speed: "101" }).speed).toBe(
      "La vitesse doit être entre 1 et 100 km/h.",
    );
    expect(toFieldErrors(effortSchema, { ...VELO, speed: "abc" }).speed).toBe(
      "La vitesse doit être entre 1 et 100 km/h.",
    );
  });

  it("signale une durée hors 1 min – 24 h sur la distance (exemple 4)", () => {
    expect(
      toFieldErrors(effortSchema, {
        distanceKm: "1000",
        speed: "1",
        speedUnit: "kmh",
      }),
    ).toEqual({
      distanceKm: "La durée calculée doit être entre 1 minute et 24 h.",
    });
  });

  it("n'évalue la durée que si la distance et la vitesse sont valides", () => {
    expect(
      toFieldErrors(effortSchema, { ...COURSE, distanceKm: "abc" }),
    ).toEqual({ distanceKm: "La distance doit être entre 0,1 et 1000 km." });
    expect(toFieldErrors(effortSchema, { ...COURSE, speed: "abc" })).toEqual({
      speed: "L'allure doit être au format mm:ss (ex. 5:30).",
    });
  });
});
