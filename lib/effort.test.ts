import { describe, expect, it } from "vitest";

import {
  computeDurationMinutes,
  computeEffortDuration,
  convertSpeed,
  DISTANCE_KM_MAX,
  DISTANCE_KM_MIN,
  formatDuration,
  formatPace,
  PACE_SEC_PER_KM_MAX,
  PACE_SEC_PER_KM_MIN,
  parsePace,
  SPEED_KMH_MAX,
  SPEED_KMH_MIN,
  speedToKmh,
  validateEffort,
  type EffortFormValues,
} from "@/lib/effort";

const COURSE: EffortFormValues = {
  distanceKm: "10",
  speed: "5:00",
  speedUnit: "minkm",
};

describe("bornes exportées", () => {
  it("reprend les bornes de la SPEC", () => {
    expect(DISTANCE_KM_MIN).toBe(0.1);
    expect(DISTANCE_KM_MAX).toBe(1000);
    expect(SPEED_KMH_MIN).toBe(1);
    expect(SPEED_KMH_MAX).toBe(100);
    expect(PACE_SEC_PER_KM_MIN).toBe(36);
    expect(PACE_SEC_PER_KM_MAX).toBe(3600);
  });
});

describe("parsePace", () => {
  it("convertit « m:ss » et « mm:ss » en secondes par km", () => {
    expect(parsePace("5:30")).toBe(330);
    expect(parsePace("05:30")).toBe(330);
    expect(parsePace("12:00")).toBe(720);
    expect(parsePace("60:00")).toBe(3600);
    expect(parsePace("0:36")).toBe(36);
  });

  it("accepte les espaces autour de la valeur", () => {
    expect(parsePace("  5:30  ")).toBe(330);
  });

  it("refuse un entier seul : le format mm:ss est imposé", () => {
    expect(parsePace("5")).toBeNull();
    expect(parsePace("330")).toBeNull();
  });

  it("refuse des secondes hors 00-59 ou un format inconnu", () => {
    expect(parsePace("5:60")).toBeNull();
    expect(parsePace("5:5x")).toBeNull();
    expect(parsePace("5:5")).toBeNull();
    expect(parsePace("abc")).toBeNull();
    expect(parsePace("")).toBeNull();
    expect(parsePace("5:30:00")).toBeNull();
    expect(parsePace("-5:30")).toBeNull();
  });
});

describe("formatPace", () => {
  it("affiche « 5:30 » pour 330 s/km", () => {
    expect(formatPace(330)).toBe("5:30");
  });

  it("reporte les secondes arrondies sur la minute", () => {
    expect(formatPace(359.6)).toBe("6:00");
    expect(formatPace(330.4)).toBe("5:30");
  });

  it("complète les secondes sur deux chiffres", () => {
    expect(formatPace(305)).toBe("5:05");
    expect(formatPace(36)).toBe("0:36");
    expect(formatPace(3600)).toBe("60:00");
  });
});

describe("speedToKmh", () => {
  it("lit un nombre en km/h, virgule ou point", () => {
    expect(speedToKmh("12", "kmh")).toBe(12);
    expect(speedToKmh("12,5", "kmh")).toBe(12.5);
    expect(speedToKmh("12.5", "kmh")).toBe(12.5);
  });

  it("convertit une allure en km/h", () => {
    expect(speedToKmh("5:30", "minkm")).toBeCloseTo(10.909, 3);
    expect(speedToKmh("5:00", "minkm")).toBeCloseTo(12, 10);
  });

  it("retourne null si la valeur est invalide ou nulle", () => {
    expect(speedToKmh("", "kmh")).toBeNull();
    expect(speedToKmh("abc", "kmh")).toBeNull();
    expect(speedToKmh("0", "kmh")).toBeNull();
    expect(speedToKmh("-5", "kmh")).toBeNull();
    expect(speedToKmh("", "minkm")).toBeNull();
    expect(speedToKmh("abc", "minkm")).toBeNull();
    expect(speedToKmh("0:00", "minkm")).toBeNull();
  });
});

describe("convertSpeed", () => {
  it("convertit km/h vers allure à la seconde", () => {
    expect(convertSpeed("12", "kmh", "minkm")).toBe("5:00");
    expect(convertSpeed("10,9", "kmh", "minkm")).toBe("5:30");
  });

  it("convertit une allure vers des km/h arrondis à 0,1", () => {
    expect(convertSpeed("5:00", "minkm", "kmh")).toBe("12");
    expect(convertSpeed("5:30", "minkm", "kmh")).toBe("10.9");
  });

  it("ne touche pas une valeur déjà dans l'unité cible", () => {
    expect(convertSpeed("12,5", "kmh", "kmh")).toBe("12,5");
    expect(convertSpeed("5:30", "minkm", "minkm")).toBe("5:30");
  });

  it("retourne une chaîne vide si la valeur est vide ou invalide", () => {
    expect(convertSpeed("", "kmh", "minkm")).toBe("");
    expect(convertSpeed("abc", "kmh", "minkm")).toBe("");
    expect(convertSpeed("0", "kmh", "minkm")).toBe("");
  });
});

describe("computeDurationMinutes", () => {
  it("calcule 50 min pour 10 km à 12 km/h (exemple 2)", () => {
    expect(computeDurationMinutes(10, 12)).toBe(50);
  });

  it("calcule 50 min pour 10 km à 5:00 min/km (exemple 1)", () => {
    expect(computeDurationMinutes(10, 3600 / 300)).toBe(50);
  });

  it("calcule 240 min pour 100 km à 25 km/h (exemple 3)", () => {
    expect(computeDurationMinutes(100, 25)).toBe(240);
  });

  it("arrondit 116,05 à 116 min pour 21,1 km à 5:30 min/km (exemple 4)", () => {
    expect(computeDurationMinutes(21.1, 3600 / 330)).toBe(116);
  });

  it("retourne toujours un entier", () => {
    expect(Number.isInteger(computeDurationMinutes(7.3, 13.7))).toBe(true);
  });
});

describe("formatDuration", () => {
  it("affiche « 45 min » sous l'heure", () => {
    expect(formatDuration(45)).toBe("45 min");
  });

  it("affiche « 2 h 05 min » avec les minutes sur deux chiffres", () => {
    expect(formatDuration(125)).toBe("2 h 05 min");
  });

  it("affiche « 2 h » quand il n'y a pas de minute restante", () => {
    expect(formatDuration(120)).toBe("2 h");
    expect(formatDuration(60)).toBe("1 h");
  });
});

describe("computeEffortDuration", () => {
  it("trouve 50 min pour 10 km à 5:00 min/km (exemple 1)", () => {
    expect(computeEffortDuration(COURSE)).toEqual({ minutes: 50, speedKmh: 12 });
  });

  it("trouve 50 min pour 10 km à 12 km/h (exemple 2)", () => {
    expect(
      computeEffortDuration({ distanceKm: "10", speed: "12", speedUnit: "kmh" }),
    ).toEqual({ minutes: 50, speedKmh: 12 });
  });

  it("trouve 240 min pour 100 km à 25 km/h (exemple 3)", () => {
    expect(
      computeEffortDuration({ distanceKm: "100", speed: "25", speedUnit: "kmh" }),
    ).toEqual({ minutes: 240, speedKmh: 25 });
  });

  it("trouve 116 min pour 21,1 km à 5:30 min/km (exemple 4)", () => {
    const result = computeEffortDuration({
      distanceKm: "21,1",
      speed: "5:30",
      speedUnit: "minkm",
    });
    expect(result?.minutes).toBe(116);
    expect(result?.speedKmh).toBeCloseTo(10.909, 3);
  });

  it("donne la même durée avec la virgule et le point décimal (exemple 5)", () => {
    const withComma = computeEffortDuration({
      distanceKm: "21,1",
      speed: "5:30",
      speedUnit: "minkm",
    });
    const withDot = computeEffortDuration({
      distanceKm: "21.1",
      speed: "5:30",
      speedUnit: "minkm",
    });
    expect(withDot).toEqual(withComma);
  });

  it("retourne null pour une allure mal formée ou hors bornes (exemple 6)", () => {
    for (const speed of ["5:60", "5:5x", "5", "abc", "0:00"]) {
      expect(computeEffortDuration({ ...COURSE, speed })).toBeNull();
    }
  });

  it("retourne null pour une vitesse nulle, négative ou hors bornes (exemple 7)", () => {
    for (const speed of ["0", "-5", "101"]) {
      expect(computeEffortDuration({ ...COURSE, speed, speedUnit: "kmh" })).toBeNull();
    }
  });

  it("refuse une durée supérieure à 24 h (exemple 8)", () => {
    expect(
      computeEffortDuration({ distanceKm: "1000", speed: "10", speedUnit: "kmh" }),
    ).toBeNull();
  });

  it("refuse une durée arrondie à moins d'une minute (exemple 9)", () => {
    expect(
      computeEffortDuration({ distanceKm: "0,1", speed: "100", speedUnit: "kmh" }),
    ).toBeNull();
  });
});

describe("validateEffort", () => {
  it("ne retourne aucune erreur pour un effort valide", () => {
    expect(validateEffort(COURSE)).toEqual({});
  });

  it("exige la distance", () => {
    expect(validateEffort({ ...COURSE, distanceKm: "" })).toEqual({
      distanceKm: "La distance est obligatoire.",
    });
  });

  it("borne la distance entre 0,1 et 1000 km", () => {
    for (const distanceKm of ["0", "0,05", "1001", "abc"]) {
      expect(validateEffort({ ...COURSE, distanceKm }).distanceKm).toBe(
        "La distance doit être entre 0,1 et 1000 km.",
      );
    }
  });

  it("exige la vitesse ou l'allure selon l'unité", () => {
    expect(validateEffort({ ...COURSE, speed: "", speedUnit: "kmh" })).toEqual({
      speed: "La vitesse est obligatoire.",
    });
    expect(validateEffort({ ...COURSE, speed: "", speedUnit: "minkm" })).toEqual({
      speed: "L'allure est obligatoire.",
    });
  });

  it("borne la vitesse entre 1 et 100 km/h", () => {
    for (const speed of ["0", "-5", "101"]) {
      expect(validateEffort({ ...COURSE, speed, speedUnit: "kmh" }).speed).toBe(
        "La vitesse doit être entre 1 et 100 km/h.",
      );
    }
  });

  it("refuse une allure mal formée", () => {
    for (const speed of ["5:60", "5:5x", "5", "abc"]) {
      expect(validateEffort({ ...COURSE, speed }).speed).toBe(
        "L'allure doit être au format mm:ss (ex. 5:30).",
      );
    }
  });

  it("borne l'allure entre 0:36 et 60:00 min/km", () => {
    for (const speed of ["0:00", "0:30", "61:00"]) {
      expect(validateEffort({ ...COURSE, speed }).speed).toBe(
        "L'allure doit être entre 0:36 et 60:00 min/km.",
      );
    }
  });

  it("signale une durée calculée hors 1 min – 24 h (exemples 8 et 9)", () => {
    expect(
      validateEffort({ distanceKm: "1000", speed: "10", speedUnit: "kmh" }),
    ).toEqual({ distanceKm: "La durée calculée doit être entre 1 minute et 24 h." });
    expect(
      validateEffort({ distanceKm: "0,1", speed: "100", speedUnit: "kmh" }),
    ).toEqual({ distanceKm: "La durée calculée doit être entre 1 minute et 24 h." });
  });

  it("n'évalue la durée que si la distance et la vitesse sont valides", () => {
    expect(validateEffort({ ...COURSE, distanceKm: "abc" })).toEqual({
      distanceKm: "La distance doit être entre 0,1 et 1000 km.",
    });
    expect(validateEffort({ ...COURSE, speed: "abc" })).toEqual({
      speed: "L'allure doit être au format mm:ss (ex. 5:30).",
    });
  });
});
