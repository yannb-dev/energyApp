import { describe, expect, it } from "vitest";

import { formatPace } from "@/lib/effort";
import {
  buildTrack,
  SEGMENT_KM,
  type GpxPoint,
  type Track,
  type TrackKm,
  type TrackSegment,
} from "@/lib/gpx";
import {
  computeRunPacing,
  DOWNHILL_SPEED_FACTOR_MAX,
  MINETTI_COEFFS,
  MINETTI_GRADE_MAX,
  minettiCost,
  slopeSpeedFactor,
  TERRAIN_SPEED_FACTORS,
  UPHILL_SPEED_FACTOR_MIN,
} from "@/lib/pacingRun";

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

const FLAT_10_KM = makeTrack(flatGrades(100));
const MODERATE_16 = { vmaKmh: 16, intensity: "moderate" } as const;

describe("constantes", () => {
  it("expose le polynôme de Minetti du degré 5 au degré 0", () => {
    expect([...MINETTI_COEFFS]).toEqual([155.4, -30.4, -43.3, 46.3, 19.5, 3.6]);
  });

  it("borne la pente à ±0,45 et plafonne les facteurs de vitesse", () => {
    expect(MINETTI_GRADE_MAX).toBe(0.45);
    expect(DOWNHILL_SPEED_FACTOR_MAX).toBe(1.25);
    expect(UPHILL_SPEED_FACTOR_MIN).toBe(0.25);
  });

  it("expose les facteurs terrain roulant / accidenté / très technique", () => {
    expect(TERRAIN_SPEED_FACTORS).toEqual({
      rolling: 1,
      rough: 0.92,
      technical: 0.82,
    });
  });
});

describe("minettiCost", () => {
  it("vaut 3,6 J/kg/m à plat", () => {
    expect(minettiCost(0)).toBeCloseTo(3.6, 10);
  });

  it("reproduit les coûts de référence en montée", () => {
    expect(minettiCost(0.05)).toBeCloseTo(4.6852, 4);
    expect(minettiCost(0.1)).toBeCloseTo(5.9682, 4);
  });

  it("reproduit les coûts de référence en descente", () => {
    expect(minettiCost(-0.05)).toBeCloseTo(2.7459, 4);
    expect(minettiCost(-0.1)).toBeCloseTo(2.1517, 4);
  });

  it("borne la pente à MINETTI_GRADE_MAX", () => {
    expect(minettiCost(0.6)).toBeCloseTo(minettiCost(MINETTI_GRADE_MAX), 10);
    expect(minettiCost(-0.6)).toBeCloseTo(minettiCost(-MINETTI_GRADE_MAX), 10);
  });
});

describe("slopeSpeedFactor", () => {
  it("vaut 1 à plat", () => {
    expect(slopeSpeedFactor(0)).toBe(1);
  });

  it("ralentit en montée : 0,7684 à +5 % et 0,6032 à +10 % (exemple 3)", () => {
    expect(slopeSpeedFactor(5)).toBeCloseTo(0.7684, 4);
    expect(slopeSpeedFactor(10)).toBeCloseTo(0.6032, 4);
    expect(slopeSpeedFactor(5)).toBeLessThan(1);
  });

  it("plafonne le gain en descente à 1,25 (exemple 4)", () => {
    expect(slopeSpeedFactor(-5)).toBe(DOWNHILL_SPEED_FACTOR_MAX);
    expect(slopeSpeedFactor(-10)).toBe(DOWNHILL_SPEED_FACTOR_MAX);
  });

  it("plafonne le ralentissement en forte montée à 0,25", () => {
    expect(slopeSpeedFactor(45)).toBe(UPHILL_SPEED_FACTOR_MIN);
  });
});

describe("computeRunPacing — trace plate", () => {
  it("VMA 16, 70 % : 11,2 km/h partout, 3214,3 s, 54 min (exemple 1)", () => {
    const result = computeRunPacing(FLAT_10_KM, MODERATE_16);

    expect(result.splits).toHaveLength(10);
    expect(result.totalSec).toBeCloseTo(3214.3, 1);
    expect(result.minutes).toBe(54);
    expect(result.averageSpeedKmh).toBeCloseTo(11.2, 6);
    for (const split of result.splits) {
      expect(split.distanceKm).toBeCloseTo(1, 10);
      expect(split.durationSec).toBeCloseTo(321.43, 1);
      expect(split.paceSecPerKm).toBeCloseTo(321.43, 1);
      expect(split.speedKmh).toBeCloseTo(11.2, 6);
      expect(formatPace(split.paceSecPerKm)).toBe("5:21");
    }
    expect(result.splits[9].cumulativeSec).toBeCloseTo(result.totalSec, 10);
  });

  it("endurance 60 % donne 9,6 km/h et 63 min, compétition 85 % donne 44 min (exemple 2)", () => {
    const endurance = computeRunPacing(FLAT_10_KM, {
      vmaKmh: 16,
      intensity: "endurance",
    });
    expect(endurance.totalSec).toBeCloseTo(3750, 1);
    expect(endurance.minutes).toBe(63);
    expect(endurance.averageSpeedKmh).toBeCloseTo(9.6, 6);

    const race = computeRunPacing(FLAT_10_KM, {
      vmaKmh: 16,
      intensity: "race",
    });
    expect(race.totalSec).toBeCloseTo(2647.06, 1);
    expect(race.minutes).toBe(44);
    expect(race.averageSpeedKmh).toBeCloseTo(13.6, 6);
  });
});

describe("computeRunPacing — pente", () => {
  it("un kilomètre à +5 % roule à 8,61 km/h (exemple 3)", () => {
    const result = computeRunPacing(makeTrack(new Array<number>(10).fill(5)), MODERATE_16);

    expect(result.splits).toHaveLength(1);
    expect(result.splits[0].speedKmh).toBeCloseTo(8.61, 2);
    expect(result.totalSec).toBeCloseTo(418.31, 1);
    expect(result.splits[0].ascentM).toBeCloseTo(50, 6);
    expect(result.splits[0].descentM).toBe(0);
  });

  it("un kilomètre à −5 % roule à 14,0 km/h, plafond de descente (exemple 4)", () => {
    const result = computeRunPacing(makeTrack(new Array<number>(10).fill(-5)), MODERATE_16);

    expect(result.splits[0].speedKmh).toBeCloseTo(14, 6);
    expect(result.totalSec).toBeCloseTo(257.14, 1);
    expect(result.splits[0].descentM).toBeCloseTo(50, 6);
  });

  it("la descente gagne moins que la montée ne perd (aller-retour 5 %, exemple 4)", () => {
    const roundTrip = makeTrack([
      ...new Array<number>(50).fill(5),
      ...new Array<number>(50).fill(-5),
    ]);

    expect(roundTrip.distanceKm).toBeCloseTo(10, 10);
    expect(computeRunPacing(roundTrip, MODERATE_16).totalSec).toBeGreaterThan(
      computeRunPacing(FLAT_10_KM, MODERATE_16).totalSec,
    );
  });
});

describe("computeRunPacing — terrain", () => {
  it("applique 0,82 en très technique et 0,92 en accidenté (exemple 5)", () => {
    const technical = computeRunPacing(FLAT_10_KM, {
      ...MODERATE_16,
      terrain: "technical",
    });
    expect(technical.averageSpeedKmh).toBeCloseTo(9.184, 3);
    expect(technical.splits[0].speedKmh).toBeCloseTo(9.184, 3);

    const rough = computeRunPacing(FLAT_10_KM, {
      ...MODERATE_16,
      terrain: "rough",
    });
    expect(rough.averageSpeedKmh).toBeCloseTo(10.304, 3);
  });

  it("sans terrain ou en roulant, la vitesse reste celle de la course (exemple 5)", () => {
    const withoutTerrain = computeRunPacing(FLAT_10_KM, MODERATE_16);
    const rolling = computeRunPacing(FLAT_10_KM, {
      ...MODERATE_16,
      terrain: "rolling",
    });

    expect(withoutTerrain.averageSpeedKmh).toBeCloseTo(11.2, 6);
    expect(rolling.averageSpeedKmh).toBeCloseTo(withoutTerrain.averageSpeedKmh, 10);
  });
});

describe("computeRunPacing — cas limites", () => {
  it("ignore les pentes quand la trace n'a pas d'altitude (exemple 6)", () => {
    const wild = makeTrack(
      Array.from({ length: 100 }, (_, index) => (index % 2 === 0 ? 5 : -5)),
      false,
    );
    const result = computeRunPacing(wild, MODERATE_16);

    expect(result.totalSec).toBeCloseTo(3214.3, 1);
    for (const split of result.splits) {
      expect(split.speedKmh).toBeCloseTo(11.2, 6);
    }
  });

  it("découpe une trace de 2,5 km en 1 + 1 + 0,5 (exemple 7)", () => {
    const result = computeRunPacing(makeTrack(flatGrades(25)), MODERATE_16);

    expect(result.splits).toHaveLength(3);
    expect(result.splits[0].distanceKm).toBeCloseTo(1, 10);
    expect(result.splits[1].distanceKm).toBeCloseTo(1, 10);
    expect(result.splits[2].distanceKm).toBeCloseTo(0.5, 10);
    expect(result.splits[2].km).toBe(3);
    const totalDistance = result.splits.reduce(
      (sum, split) => sum + split.distanceKm,
      0,
    );
    expect(totalDistance).toBeCloseTo(2.5, 10);
    expect(result.totalSec).toBeCloseTo(803.57, 1);
    expect(result.splits[2].cumulativeSec).toBeCloseTo(result.totalSec, 10);
  });

  it("reste monotone : plus de VMA, d'intensité ou de technique raccourcit ou allonge (exemple 8)", () => {
    const slow = computeRunPacing(FLAT_10_KM, { vmaKmh: 15, intensity: "moderate" });
    expect(slow.totalSec).toBeGreaterThan(
      computeRunPacing(FLAT_10_KM, { vmaKmh: 16, intensity: "moderate" }).totalSec,
    );

    const byIntensity = (["endurance", "moderate", "sustained", "race"] as const).map(
      (intensity) => computeRunPacing(FLAT_10_KM, { vmaKmh: 16, intensity }).totalSec,
    );
    for (let index = 1; index < byIntensity.length; index += 1) {
      expect(byIntensity[index]).toBeLessThan(byIntensity[index - 1]);
    }

    const byTerrain = (["rolling", "rough", "technical"] as const).map(
      (terrain) => computeRunPacing(FLAT_10_KM, { ...MODERATE_16, terrain }).totalSec,
    );
    for (let index = 1; index < byTerrain.length; index += 1) {
      expect(byTerrain[index]).toBeGreaterThan(byTerrain[index - 1]);
    }
  });

  it("lève une erreur pour une VMA nulle ou non finie (exemple 9)", () => {
    expect(() => computeRunPacing(FLAT_10_KM, { vmaKmh: 0, intensity: "moderate" })).toThrow(
      Error,
    );
    expect(() =>
      computeRunPacing(FLAT_10_KM, { vmaKmh: Number.NaN, intensity: "moderate" }),
    ).toThrow(Error);
  });
});

describe("computeRunPacing — intégration avec buildTrack", () => {
  it("agrège la trace issue de points GPX sur le même découpage", () => {
    const points: GpxPoint[] = Array.from({ length: 91 }, (_, index) => ({
      lat: 45,
      lon: 0.001 * index,
      ele: 200,
    }));
    const track = buildTrack(points);
    const result = computeRunPacing(track, MODERATE_16);

    expect(track.distanceKm).toBeGreaterThan(1);
    expect(result.splits).toHaveLength(track.kilometers.length);
    const sum = result.splits.reduce((total, split) => total + split.durationSec, 0);
    expect(sum).toBeCloseTo(result.totalSec, 10);
    expect(result.minutes).toBe(Math.round(result.totalSec / 60));
    expect(result.averageSpeedKmh).toBeCloseTo(
      (track.distanceKm / result.totalSec) * 3600,
      10,
    );
  });
});
