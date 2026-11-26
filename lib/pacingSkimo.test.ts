import { describe, expect, it } from "vitest";

import type { Track, TrackKm, TrackSegment } from "@/lib/gpx";
import type { IntensityId, SkiLevelId } from "@/lib/intensity";
import {
  computeSkimoPacing,
  SKIMO_ASCENT_UNITS_PER_HOUR,
  skimoAverageMet,
  SKIMO_PHASE_MIN_VERTICAL_M,
  SKIMO_TRANSITION_MET,
  SKIMO_TRANSITION_MIN,
} from "@/lib/pacingSkimo";

const SEGMENT_KM = 0.1;

function repeat(pattern: number[], times: number): number[] {
  const grades: number[] = [];
  for (let index = 0; index < times; index += 1) {
    grades.push(...pattern);
  }
  return grades;
}

/**
 * Trace construite à la main depuis une suite de pentes par segment de 0,1 km.
 * L'altitude est cumulée pour que `eleM` serve à la détection des phases.
 */
function trackFromGrades(grades: number[], hasElevation = true): Track {
  const segments: TrackSegment[] = [];
  let altitude = 0;
  let startKm = 0;

  for (const grade of grades) {
    const before = altitude;
    const change = hasElevation ? (SEGMENT_KM * 1000 * grade) / 100 : 0;
    altitude += change;
    segments.push({
      startKm,
      lengthKm: SEGMENT_KM,
      gradePct: hasElevation ? grade : 0,
      eleM: (before + altitude) / 2,
    });
    startKm += SEGMENT_KM;
  }

  const distanceKm = segments.length * SEGMENT_KM;
  const kmCount = Math.max(1, Math.ceil(distanceKm - 1e-9));
  const kilometers: TrackKm[] = [];
  for (let km = 1; km <= kmCount; km += 1) {
    const inKm = segments.filter(
      (segment) => Math.floor(segment.startKm + 1e-9) === km - 1,
    );
    kilometers.push({
      km,
      distanceKm: inKm.reduce((sum, segment) => sum + segment.lengthKm, 0),
      ascentM: inKm.reduce(
        (sum, segment) =>
          sum + Math.max(0, (segment.lengthKm * 1000 * segment.gradePct) / 100),
        0,
      ),
      descentM: inKm.reduce(
        (sum, segment) =>
          sum + Math.max(0, -(segment.lengthKm * 1000 * segment.gradePct) / 100),
        0,
      ),
    });
  }

  return {
    distanceKm,
    ascentM: 0,
    descentM: 0,
    hasElevation,
    segments,
    kilometers,
    profile: [],
  };
}

describe("constantes du modèle ski", () => {
  it("exporte les valeurs de référence (SPEC-09)", () => {
    expect(SKIMO_ASCENT_UNITS_PER_HOUR).toEqual({
      endurance: 3.5,
      moderate: 4,
      sustained: 5,
      race: 6.5,
    });
    expect(SKIMO_PHASE_MIN_VERTICAL_M).toBe(50);
    expect(SKIMO_TRANSITION_MIN).toBe(8);
    expect(SKIMO_TRANSITION_MET).toBe(2.5);
  });
});

describe("computeSkimoPacing", () => {
  it("plat de 4 km en rythme modéré : 60 min, aucune descente ni transition (exemple 1)", () => {
    const track = trackFromGrades(repeat([0], 40));

    const result = computeSkimoPacing(track, {
      intensity: "moderate",
      skiLevel: "intermediate",
    });

    expect(result.minutes).toBe(60);
    expect(result.phases?.transitions).toBe(0);
    expect(result.phases?.descentSec).toBe(0);
  });

  it("rampe de 1 km à +40 % en rythme modéré : 75 min (exemple 2)", () => {
    const track = trackFromGrades(repeat([40], 10));

    const result = computeSkimoPacing(track, {
      intensity: "moderate",
      skiLevel: "intermediate",
    });

    expect(result.minutes).toBe(75);
    expect(result.totalSec).toBeCloseTo(4500, 6);
  });

  it("même rampe en endurance : 86 min (exemple 2)", () => {
    const track = trackFromGrades(repeat([40], 10));

    expect(
      computeSkimoPacing(track, { intensity: "endurance", skiLevel: "intermediate" })
        .minutes,
    ).toBe(86);
  });

  it("même rampe en compétition : 46 min (exemple 2)", () => {
    const track = trackFromGrades(repeat([40], 10));

    expect(
      computeSkimoPacing(track, { intensity: "race", skiLevel: "intermediate" })
        .minutes,
    ).toBe(46);
  });

  it("descente de 2,5 km à −40 % : 30 min en intermédiaire (exemple 3)", () => {
    const track = trackFromGrades(repeat([-40], 25));

    const result = computeSkimoPacing(track, {
      intensity: "moderate",
      skiLevel: "intermediate",
    });

    expect(result.minutes).toBe(30);
    expect(result.phases?.ascentSec).toBe(0);
  });

  it("même descente : 50 min en débutant et 20 min en expert (exemple 3)", () => {
    const track = trackFromGrades(repeat([-40], 25));

    expect(
      computeSkimoPacing(track, { intensity: "moderate", skiLevel: "beginner" })
        .minutes,
    ).toBe(50);
    expect(
      computeSkimoPacing(track, { intensity: "moderate", skiLevel: "expert" })
        .minutes,
    ).toBe(20);
  });

  it("descente douce de 5 km à −6 % : plafond horizontal, ≈ 1000 s (exemple 4)", () => {
    const track = trackFromGrades(repeat([-6], 50));

    const result = computeSkimoPacing(track, {
      intensity: "moderate",
      skiLevel: "intermediate",
    });

    expect(result.minutes).toBe(17);
    expect(result.phases?.descentSec).toBeCloseTo(1000, 6);
  });

  it("aller-retour : montée 4500 s, transition 480 s, descente 720 s, 95 min (exemple 5)", () => {
    const track = trackFromGrades([...repeat([40], 10), ...repeat([-40], 10)]);

    const result = computeSkimoPacing(track, {
      intensity: "moderate",
      skiLevel: "intermediate",
    });

    expect(result.phases?.ascentSec).toBeCloseTo(4500, 6);
    expect(result.phases?.transitionSec).toBeCloseTo(480, 6);
    expect(result.phases?.descentSec).toBeCloseTo(720, 6);
    expect(result.phases?.transitions).toBe(1);
    expect(result.minutes).toBe(95);
  });

  it("bosses de ± 20 m : aucune direction confirmée, pas de descente (exemple 6)", () => {
    const track = trackFromGrades(repeat([40, 0, -40, 0], 5));

    const result = computeSkimoPacing(track, {
      intensity: "moderate",
      skiLevel: "intermediate",
    });

    expect(result.phases?.transitions).toBe(0);
    expect(result.phases?.descentSec).toBe(0);
  });

  it("sans altitude : 4 km à plat font 60 min, aucune descente (exemple 7)", () => {
    const track = trackFromGrades(repeat([0], 40), false);

    const result = computeSkimoPacing(track, {
      intensity: "moderate",
      skiLevel: "intermediate",
    });

    expect(result.minutes).toBe(60);
    expect(result.phases?.descentSec).toBe(0);
    expect(result.phases?.transitions).toBe(0);
  });

  it("lève une erreur pour une intensité inconnue (exemple 9)", () => {
    const track = trackFromGrades(repeat([0], 10));

    expect(() =>
      computeSkimoPacing(track, {
        intensity: "x" as IntensityId,
        skiLevel: "intermediate",
      }),
    ).toThrow();
  });

  it("lève une erreur pour un niveau de ski inconnu (exemple 9)", () => {
    const track = trackFromGrades(repeat([0], 10));

    expect(() =>
      computeSkimoPacing(track, {
        intensity: "moderate",
        skiLevel: "x" as SkiLevelId,
      }),
    ).toThrow();
  });
});

describe("skimoAverageMet", () => {
  it("moyenne pondérée par les durées de phase (exemple 8)", () => {
    expect(
      skimoAverageMet(
        { ascentSec: 3600, descentSec: 1800, transitionSec: 480 },
        { ascent: 8, descent: 5.3 },
      ),
    ).toBeCloseTo(6.72, 2);
  });

  it("renvoie le MET de montée si la durée totale est nulle (exemple 8)", () => {
    expect(
      skimoAverageMet(
        { ascentSec: 0, descentSec: 0, transitionSec: 0 },
        { ascent: 8, descent: 5.3 },
      ),
    ).toBe(8);
  });
});
