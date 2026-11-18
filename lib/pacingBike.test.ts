import { describe, expect, it } from "vitest";

import { SEGMENT_KM, type Track, type TrackKm, type TrackSegment } from "@/lib/gpx";
import {
  AIR_DENSITY,
  BIKE_SPEED_MAX_KMH,
  BIKE_SPEED_MIN_KMH,
  computeBikePacing,
  CRR,
  DEFAULT_BIKE_KG,
  DRIVETRAIN_EFFICIENCY,
  GRAVITY,
  solveSpeedMs,
  type BikePacingInput,
} from "@/lib/pacingBike";

const SEGMENTS_PER_KM = Math.round(1 / SEGMENT_KM);

/** Trace construite à la main : un segment de 0,1 km par pente fournie (%). */
function makeTrack(grades: number[], hasElevation = true): Track {
  const segments: TrackSegment[] = grades.map((gradePct, index) => ({
    startKm: index * SEGMENT_KM,
    lengthKm: SEGMENT_KM,
    gradePct,
    eleM: 0,
  }));

  const kilometers: TrackKm[] = [];
  for (let start = 0; start < grades.length; start += SEGMENTS_PER_KM) {
    const stop = Math.min(start + SEGMENTS_PER_KM, grades.length);
    let ascentM = 0;
    let descentM = 0;
    for (let index = start; index < stop; index += 1) {
      const riseM = (SEGMENT_KM * 1000 * grades[index]) / 100;
      if (riseM > 0) {
        ascentM += riseM;
      } else {
        descentM -= riseM;
      }
    }
    kilometers.push({
      km: kilometers.length + 1,
      distanceKm: (stop - start) * SEGMENT_KM,
      ascentM,
      descentM,
    });
  }

  return {
    distanceKm: grades.length * SEGMENT_KM,
    ascentM: kilometers.reduce((sum, km) => sum + km.ascentM, 0),
    descentM: kilometers.reduce((sum, km) => sum + km.descentM, 0),
    hasElevation,
    segments,
    kilometers,
    profile: [],
  };
}

/** Pentes d'une trace plate de `count` segments. */
function flatGrades(count: number): number[] {
  return new Array<number>(count).fill(0);
}

/** Cas de base : PMA 300 W, rythme modéré (210 W), 75 + 8 kg, CdA 0,32. */
const BASE: BikePacingInput = {
  pmaWatts: 300,
  intensity: "moderate",
  riderKg: 75,
  bikeKg: 8,
  cdA: 0.32,
};

const BASE_POWER_W = 210;
const BASE_MASS_KG = 83;

/** Équivalent km/h d'une vitesse en m/s. */
function kmh(speedMs: number): number {
  return speedMs * 3.6;
}

/** Écart (W) entre puissance disponible et résistance à la vitesse `speedMs`. */
function gapWatts(
  powerW: number,
  massKg: number,
  cdA: number,
  gradeFraction: number,
  speedMs: number,
): number {
  const theta = Math.atan(gradeFraction);
  const resistance =
    0.5 * AIR_DENSITY * cdA * speedMs ** 3 +
    massKg * GRAVITY * (CRR * Math.cos(theta) + Math.sin(theta)) * speedMs;
  return Math.abs(powerW * DRIVETRAIN_EFFICIENCY - resistance);
}

const FLAT_10_KM = makeTrack(flatGrades(100));

describe("constantes", () => {
  it("expose les coefficients de résistance et de rendement", () => {
    expect(CRR).toBe(0.005);
    expect(AIR_DENSITY).toBe(1.2);
    expect(DRIVETRAIN_EFFICIENCY).toBe(0.975);
    expect(GRAVITY).toBe(9.80665);
  });

  it("expose les bornes de vitesse et le vélo par défaut", () => {
    expect(BIKE_SPEED_MAX_KMH).toBe(70);
    expect(BIKE_SPEED_MIN_KMH).toBe(1);
    expect(DEFAULT_BIKE_KG).toBe(9);
  });
});

describe("solveSpeedMs — cas de base à plat", () => {
  it("210 W, 83 kg, CdA 0,32 : 34,29 km/h (exemple 1)", () => {
    const speedMs = solveSpeedMs(BASE_POWER_W, BASE_MASS_KG, 0.32, 0);

    expect(kmh(speedMs)).toBeCloseTo(34.29, 1);
  });
});

describe("solveSpeedMs — intensité", () => {
  it("60 % donne 32,32 km/h, 80 % 36,08 km/h, 85 % 36,91 km/h (exemple 2)", () => {
    expect(kmh(solveSpeedMs(180, BASE_MASS_KG, 0.32, 0))).toBeCloseTo(32.32, 1);
    expect(kmh(solveSpeedMs(240, BASE_MASS_KG, 0.32, 0))).toBeCloseTo(36.08, 1);
    expect(kmh(solveSpeedMs(255, BASE_MASS_KG, 0.32, 0))).toBeCloseTo(36.91, 1);
  });

  it("une intensité plus haute va plus vite (exemple 9)", () => {
    const byIntensity = ([0.6, 0.7, 0.8, 0.85] as const).map((ratio) =>
      solveSpeedMs(300 * ratio, BASE_MASS_KG, 0.32, 0),
    );
    for (let index = 1; index < byIntensity.length; index += 1) {
      expect(byIntensity[index]).toBeGreaterThan(byIntensity[index - 1]);
    }
  });
});

describe("solveSpeedMs — position aérodynamique", () => {
  it("CdA 0,26 donne 36,56 km/h et CdA 0,40 32,00 km/h (exemple 3)", () => {
    expect(kmh(solveSpeedMs(BASE_POWER_W, BASE_MASS_KG, 0.26, 0))).toBeCloseTo(36.56, 1);
    expect(kmh(solveSpeedMs(BASE_POWER_W, BASE_MASS_KG, 0.4, 0))).toBeCloseTo(32.0, 1);
  });

  it("un CdA plus petit va plus vite (exemple 9)", () => {
    expect(kmh(solveSpeedMs(BASE_POWER_W, BASE_MASS_KG, 0.26, 0))).toBeGreaterThan(
      kmh(solveSpeedMs(BASE_POWER_W, BASE_MASS_KG, 0.32, 0)),
    );
    expect(kmh(solveSpeedMs(BASE_POWER_W, BASE_MASS_KG, 0.32, 0))).toBeGreaterThan(
      kmh(solveSpeedMs(BASE_POWER_W, BASE_MASS_KG, 0.4, 0)),
    );
  });
});

describe("solveSpeedMs — pente", () => {
  it("+5 % donne 15,30 km/h et +10 % 8,56 km/h (exemple 4)", () => {
    expect(kmh(solveSpeedMs(BASE_POWER_W, BASE_MASS_KG, 0.32, 0.05))).toBeCloseTo(15.3, 1);
    expect(kmh(solveSpeedMs(BASE_POWER_W, BASE_MASS_KG, 0.32, 0.1))).toBeCloseTo(8.56, 1);
  });

  it("−5 % donne 57,72 km/h et −10 % est plafonné à 70 km/h (exemple 4)", () => {
    expect(kmh(solveSpeedMs(BASE_POWER_W, BASE_MASS_KG, 0.32, -0.05))).toBeCloseTo(57.72, 1);
    expect(kmh(solveSpeedMs(BASE_POWER_W, BASE_MASS_KG, 0.32, -0.1))).toBeCloseTo(
      BIKE_SPEED_MAX_KMH,
      6,
    );
  });
});

describe("solveSpeedMs — masse", () => {
  it("95 kg à +5 % donne 13,66 km/h (exemple 5)", () => {
    expect(kmh(solveSpeedMs(BASE_POWER_W, 95, 0.32, 0.05))).toBeCloseTo(13.66, 1);
  });

  it("plus lourd, plus lent en montée (exemple 9)", () => {
    const light = solveSpeedMs(BASE_POWER_W, 83, 0.32, 0.05);
    const heavy = solveSpeedMs(BASE_POWER_W, 95, 0.32, 0.05);
    expect(heavy).toBeLessThan(light);
  });
});

describe("solveSpeedMs — cas limites et convergence", () => {
  it("lève une erreur pour une puissance nulle (exemple 10)", () => {
    expect(() => solveSpeedMs(0, BASE_MASS_KG, 0.32, 0)).toThrow(Error);
  });

  it("accepte une masse nulle (bikeKg = 0 côté appelant, exemple 10)", () => {
    const speedMs = solveSpeedMs(BASE_POWER_W, 75, 0.32, 0);
    expect(kmh(speedMs)).toBeGreaterThan(34.29);
  });

  it("l'équation est équilibrée à 0,1 W près hors plafond (exemple 11)", () => {
    const grades = [0, 0.05, 0.1, -0.05];
    for (const grade of grades) {
      const speedMs = solveSpeedMs(BASE_POWER_W, BASE_MASS_KG, 0.32, grade);
      expect(gapWatts(BASE_POWER_W, BASE_MASS_KG, 0.32, grade, speedMs)).toBeLessThan(0.1);
    }
  });
});

describe("computeBikePacing — trace plate", () => {
  it("10 km à plat : 1049,7 s, 17 min, 10 splits de 104,97 s (exemple 6)", () => {
    const result = computeBikePacing(FLAT_10_KM, BASE);

    expect(result.splits).toHaveLength(10);
    expect(result.totalSec).toBeCloseTo(1049.7, 1);
    expect(result.minutes).toBe(17);
    expect(result.averageSpeedKmh).toBeCloseTo(34.29, 1);
    for (const split of result.splits) {
      expect(split.distanceKm).toBeCloseTo(1, 10);
      expect(split.durationSec).toBeCloseTo(104.97, 1);
      expect(split.speedKmh).toBeCloseTo(34.29, 1);
    }
  });

  it("sans altitude, le résultat est celui de la trace plate (exemple 7)", () => {
    const wild = makeTrack(
      Array.from({ length: 100 }, (_, index) => (index % 2 === 0 ? 5 : -5)),
      false,
    );
    const withoutElevation = computeBikePacing(wild, BASE);
    const flat = computeBikePacing(FLAT_10_KM, BASE);

    expect(withoutElevation.totalSec).toBeCloseTo(flat.totalSec, 6);
    for (const split of withoutElevation.splits) {
      expect(split.speedKmh).toBeCloseTo(34.29, 1);
    }
  });
});

describe("computeBikePacing — pente", () => {
  it("un aller-retour ±5 % est plus long que le plat (exemple 8)", () => {
    const roundTrip = makeTrack([
      ...new Array<number>(50).fill(5),
      ...new Array<number>(50).fill(-5),
    ]);

    expect(roundTrip.distanceKm).toBeCloseTo(10, 10);
    expect(computeBikePacing(roundTrip, BASE).totalSec).toBeGreaterThan(
      computeBikePacing(FLAT_10_KM, BASE).totalSec,
    );
  });

  it("une montée coûte plus que la descente ne rapporte (exemple 8)", () => {
    const climb = computeBikePacing(makeTrack(new Array<number>(10).fill(5)), BASE);
    const descent = computeBikePacing(makeTrack(new Array<number>(10).fill(-5)), BASE);

    expect(climb.totalSec).toBeGreaterThan(descent.totalSec);
    expect(climb.splits[0].ascentM).toBeCloseTo(50, 6);
    expect(descent.splits[0].descentM).toBeCloseTo(50, 6);
  });
});

describe("computeBikePacing — monotonie et cas limites", () => {
  it("plus de PMA, un CdA plus petit ou plus d'intensité raccourcissent la durée (exemple 9)", () => {
    const base = computeBikePacing(FLAT_10_KM, BASE).totalSec;
    expect(computeBikePacing(FLAT_10_KM, { ...BASE, pmaWatts: 320 }).totalSec).toBeLessThan(base);
    expect(computeBikePacing(FLAT_10_KM, { ...BASE, cdA: 0.26 }).totalSec).toBeLessThan(base);
    expect(
      computeBikePacing(FLAT_10_KM, { ...BASE, intensity: "race" }).totalSec,
    ).toBeLessThan(base);
  });

  it("une masse plus grande est plus lente en montée (exemple 9)", () => {
    const climb = makeTrack(new Array<number>(10).fill(5));
    expect(computeBikePacing(climb, { ...BASE, riderKg: 90 }).totalSec).toBeGreaterThan(
      computeBikePacing(climb, BASE).totalSec,
    );
  });

  it("lève une erreur pour une PMA nulle et accepte un vélo de 0 kg (exemple 10)", () => {
    expect(() => computeBikePacing(FLAT_10_KM, { ...BASE, pmaWatts: 0 })).toThrow(Error);
    expect(() => computeBikePacing(FLAT_10_KM, { ...BASE, bikeKg: 0 })).not.toThrow();
  });

  it("lève une erreur pour un CdA nul ou non fini (exemple 10)", () => {
    expect(() => computeBikePacing(FLAT_10_KM, { ...BASE, cdA: 0 })).toThrow(Error);
    expect(() => computeBikePacing(FLAT_10_KM, { ...BASE, cdA: Number.NaN })).toThrow(Error);
  });

  it("lève une erreur pour une masse de cycliste négative (exemple 10)", () => {
    expect(() => computeBikePacing(FLAT_10_KM, { ...BASE, riderKg: -1 })).toThrow(Error);
  });

  it("respecte le plancher de vitesse sur une rampe extrême", () => {
    const wall = makeTrack(new Array<number>(10).fill(45));
    const result = computeBikePacing(wall, BASE);

    expect(result.splits[0].speedKmh).toBeGreaterThanOrEqual(BIKE_SPEED_MIN_KMH);
    expect(result.splits[0].speedKmh).toBeLessThan(BIKE_SPEED_MAX_KMH);
  });
});
