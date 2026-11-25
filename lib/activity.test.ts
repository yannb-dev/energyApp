import { describe, expect, it } from "vitest";

import {
  activityReducer,
  INITIAL_ACTIVITY,
  selectMinutes,
  type ActivityState,
} from "@/lib/activity";
import { EMPTY_EFFORT, type EffortFormValues } from "@/lib/effort";
import type { Track } from "@/lib/gpx";

/** Trace factice : seules les valeurs utiles au modèle d'activité comptent. */
const TRACK: Track = {
  distanceKm: 10,
  ascentM: 0,
  descentM: 0,
  hasElevation: true,
  segments: [],
  kilometers: [],
  profile: [],
};

/** Effort de référence : 10 km à 12 km/h, soit 50 min. */
const EFFORT_10_KM_12: EffortFormValues = {
  distanceKm: "10",
  speed: "12",
  speedUnit: "kmh",
};

/** État en mode GPX avec une trace et une durée de 54 minutes. */
const GPX_STATE: ActivityState = {
  ...INITIAL_ACTIVITY,
  sportId: "course-modere",
  inputMode: "gpx",
  track: TRACK,
  gpxMinutes: 54,
};

describe("INITIAL_ACTIVITY", () => {
  it("part d'une activité vide en saisie manuelle (exemple 1)", () => {
    expect(INITIAL_ACTIVITY).toEqual({
      sportId: "",
      inputMode: "manual",
      effort: EMPTY_EFFORT,
      track: null,
      intensity: "moderate",
      terrain: "rolling",
      gpxMinutes: null,
    });
  });
});

describe("sportChanged", () => {
  it("adopte l'unité du vélo quand la vitesse est vide (exemple 2)", () => {
    const state = activityReducer(INITIAL_ACTIVITY, {
      type: "sportChanged",
      sportId: "velo-route-vtt-modere",
    });

    expect(state.sportId).toBe("velo-route-vtt-modere");
    expect(state.effort.speedUnit).toBe("kmh");
  });

  it("laisse l'effort intact quand une vitesse est déjà saisie (exemple 2)", () => {
    const effort: EffortFormValues = {
      distanceKm: "",
      speed: "12",
      speedUnit: "minkm",
    };
    const state = activityReducer(
      { ...INITIAL_ACTIVITY, effort },
      { type: "sportChanged", sportId: "velo-route-vtt-modere" },
    );

    expect(state.effort).toBe(effort);
  });

  it("repasse en manuel et vide la trace pour un sport sans GPX (exemple 3)", () => {
    const state = activityReducer(GPX_STATE, {
      type: "sportChanged",
      sportId: "randonnee-modere",
    });

    expect(state.inputMode).toBe("manual");
    expect(state.track).toBeNull();
    expect(state.gpxMinutes).toBeNull();
  });
});

describe("inputModeChanged", () => {
  it("vide trace et durée GPX en manuel, sans toucher à l'effort (exemple 4)", () => {
    const state = activityReducer(
      { ...GPX_STATE, effort: EFFORT_10_KM_12 },
      { type: "inputModeChanged", mode: "manual" },
    );

    expect(state.track).toBeNull();
    expect(state.gpxMinutes).toBeNull();
    expect(state.effort).toEqual(EFFORT_10_KM_12);
  });

  it("conserve l'effort en passant en GPX (exemple 4)", () => {
    const state = activityReducer(
      { ...INITIAL_ACTIVITY, effort: EFFORT_10_KM_12 },
      { type: "inputModeChanged", mode: "gpx" },
    );

    expect(state.inputMode).toBe("gpx");
    expect(state.effort).toEqual(EFFORT_10_KM_12);
  });
});

describe("reset", () => {
  it("revient à l'état initial (exemple 5)", () => {
    const dirty: ActivityState = {
      ...GPX_STATE,
      effort: EFFORT_10_KM_12,
      intensity: "race",
      terrain: "technical",
    };

    expect(activityReducer(dirty, { type: "reset" })).toEqual(INITIAL_ACTIVITY);
  });
});

describe("selectMinutes", () => {
  it("déduit la durée de l'effort manuel (exemple 6)", () => {
    expect(
      selectMinutes({ ...INITIAL_ACTIVITY, effort: EFFORT_10_KM_12 }),
    ).toBe(50);
  });

  it("retourne null pour un effort invalide (exemple 6)", () => {
    expect(selectMinutes(INITIAL_ACTIVITY)).toBeNull();
  });

  it("ignore l'effort manuel en mode GPX (exemple 6)", () => {
    expect(selectMinutes({ ...GPX_STATE, effort: EFFORT_10_KM_12 })).toBe(54);
  });

  it("retourne null sans durée GPX (exemple 6)", () => {
    expect(selectMinutes({ ...GPX_STATE, gpxMinutes: null })).toBeNull();
  });
});
