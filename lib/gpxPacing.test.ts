import { describe, expect, it } from "vitest";

import { EMPTY_ATHLETE, type AthleteSettings } from "@/lib/athleteStorage";
import { buildTrack, parseGpx } from "@/lib/gpx";
import {
  BIKE_WEIGHT_MESSAGE,
  BOUNDS_MESSAGE,
  computeGpxOutcome,
  VMA_MESSAGE,
  type GpxOutcomeInput,
} from "@/lib/gpxPacing";
import { findSport } from "@/lib/sports";

const RUN = findSport("course-modere")!;
const BIKE = findSport("velo-route-vtt-modere")!;
const SKI = findSport("ski-rando-modere")!;

/** Pas de latitude (degrés) pour 0,1 km : 101 points font une trace plate de 10 km. */
const STEP_DEG = (0.1 * 180) / (Math.PI * 6371);

/** Fichier GPX plat de 10 km, 101 points. */
const FLAT_XML = `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="test"><trk><trkseg>${Array.from(
  { length: 101 },
  (_, index) =>
    `<trkpt lat="${(45 + index * STEP_DEG).toFixed(9)}" lon="6"><ele>100</ele></trkpt>`,
).join("")}</trkseg></trk></gpx>`;

/** Fichier GPX de 21 km à +40 % : plus de 24 h en ski, sans lenteur de construction. */
const LONG_STEEP_XML = `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="test"><trk><trkseg>${Array.from(
  { length: 211 },
  (_, index) =>
    `<trkpt lat="${(45 + index * STEP_DEG).toFixed(9)}" lon="6"><ele>${100 + index * 40}</ele></trkpt>`,
).join("")}</trkseg></trk></gpx>`;

function buildTrackFrom(xml: string) {
  const parsed = parseGpx(xml);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  return buildTrack(parsed.points);
}

/** Trace construite depuis le fichier de référence. */
function buildFlatTrack() {
  return buildTrackFrom(FLAT_XML);
}

const ATHLETE: AthleteSettings = {
  vmaKmh: "16",
  pmaWatts: "300",
  hasBike: false,
  bikeKg: "",
  bikePosition: "hoods",
};

function input(overrides: Partial<GpxOutcomeInput> = {}): GpxOutcomeInput {
  return {
    track: buildFlatTrack(),
    sport: RUN,
    athlete: ATHLETE,
    weightKg: "70",
    intensity: "moderate",
    terrain: "rolling",
    skiLevel: "intermediate",
    ...overrides,
  };
}

describe("computeGpxOutcome", () => {
  it("course à pied, VMA valide et trace valide : issue prête (exemple 1)", () => {
    const outcome = computeGpxOutcome(input());

    expect(outcome.kind).toBe("ready");
    if (outcome.kind !== "ready") {
      throw new Error("issue attendue : ready");
    }
    expect(outcome.bike).toBe(false);
    expect(outcome.result.minutes).toBe(54);
  });

  it("course à pied, VMA vide : message de paramètres (exemple 2)", () => {
    const outcome = computeGpxOutcome(
      input({ athlete: { ...ATHLETE, vmaKmh: "" } }),
    );

    expect(outcome).toEqual({
      kind: "error",
      message: VMA_MESSAGE,
      settingsAction: true,
    });
  });

  it("vélo coché sans poids de vélo : message dédié (exemple 3)", () => {
    const outcome = computeGpxOutcome(
      input({
        sport: BIKE,
        athlete: { ...ATHLETE, hasBike: true, bikeKg: "" },
      }),
    );

    expect(outcome).toEqual({
      kind: "error",
      message: BIKE_WEIGHT_MESSAGE,
      settingsAction: false,
    });
  });

  it("sans trace : rien à calculer (exemple 4)", () => {
    expect(computeGpxOutcome(input({ track: null }))).toEqual({ kind: "idle" });
  });

  it("ski sans VMA ni PMA : issue prête avec un MET, sans erreur (exemple 11)", () => {
    const outcome = computeGpxOutcome(
      input({ sport: SKI, athlete: EMPTY_ATHLETE }),
    );

    expect(outcome.kind).toBe("ready");
    if (outcome.kind !== "ready") {
      throw new Error("issue attendue : ready");
    }
    expect(outcome.bike).toBe(false);
    expect(outcome.met).toBeDefined();
    expect(outcome.met).toBe(8);
  });

  it("ski sur plus de 24 h : message de borne (exemple 11)", () => {
    const outcome = computeGpxOutcome(
      input({
        sport: SKI,
        athlete: EMPTY_ATHLETE,
        track: buildTrackFrom(LONG_STEEP_XML),
      }),
    );

    expect(outcome).toEqual({
      kind: "error",
      message: BOUNDS_MESSAGE,
      settingsAction: false,
    });
  });
});
