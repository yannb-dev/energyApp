import { describe, expect, it } from "vitest";

import type { Track } from "@/lib/gpx";
import { buildProfileSummary, formatClock } from "@/lib/pacingFormat";

/** Trace minimale : seuls les champs lus par les helpers sont renseignés. */
function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    distanceKm: 42.2,
    ascentM: 850,
    descentM: 840,
    hasElevation: true,
    segments: [],
    kilometers: [],
    profile: [
      { km: 0.05, eleM: 120 },
      { km: 21, eleM: 640 },
      { km: 42.15, eleM: 120 },
    ],
    ...overrides,
  };
}

describe("formatClock", () => {
  it("affiche m:ss sous une heure (exemple 1)", () => {
    expect(formatClock(3214)).toBe("53:34");
    expect(formatClock(59)).toBe("0:59");
  });

  it("affiche h:mm:ss au-delà d'une heure (exemple 1)", () => {
    expect(formatClock(3909)).toBe("1:05:09");
  });

  it("arrondit les secondes et repart proprement à la minute", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(59.6)).toBe("1:00");
    expect(formatClock(3599.7)).toBe("1:00:00");
  });
});

describe("buildProfileSummary", () => {
  it("résume distance, altitude et dénivelé positif (exemple 11)", () => {
    const summary = buildProfileSummary(makeTrack());

    expect(summary).toContain("42,2");
    expect(summary).toContain("120");
    expect(summary).toContain("640");
    expect(summary).toContain("850");
    expect(summary).toContain("dénivelé positif");
  });

  it("signale l'absence d'altitude sans inventer de valeurs", () => {
    const summary = buildProfileSummary(
      makeTrack({ hasElevation: false, ascentM: 0, descentM: 0, profile: [] }),
    );

    expect(summary).toContain("42,2");
    expect(summary).toContain("altitude absente");
  });
});
