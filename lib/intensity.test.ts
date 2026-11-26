import { describe, expect, it } from "vitest";

import { findIntensity, INTENSITY_LEVELS, SKI_LEVELS } from "@/lib/intensity";

describe("INTENSITY_LEVELS", () => {
  it("retrouve le niveau modéré et son ratio (exemple 1)", () => {
    expect(findIntensity("moderate")?.ratio).toBe(0.7);
  });

  it("expose les quatre ratios 0,6 / 0,7 / 0,8 / 0,85 (exemple 1)", () => {
    expect(INTENSITY_LEVELS.map((level) => level.ratio)).toEqual([
      0.6, 0.7, 0.8, 0.85,
    ]);
  });

  it("retourne undefined pour un identifiant inconnu (exemple 1)", () => {
    expect(findIntensity("x")).toBeUndefined();
  });
});

describe("SKI_LEVELS", () => {
  it("expose trois niveaux de ski dans l'ordre (SPEC-09)", () => {
    expect(SKI_LEVELS.map((level) => level.id)).toEqual([
      "beginner",
      "intermediate",
      "expert",
    ]);
  });

  it("associe une vitesse verticale et une vitesse horizontale croissantes (SPEC-09)", () => {
    expect(SKI_LEVELS.map((level) => level.descentVerticalMh)).toEqual([
      1200, 2000, 3000,
    ]);
    expect(SKI_LEVELS.map((level) => level.descentMaxKmh)).toEqual([10, 18, 30]);
  });

  it("a des libellés non vides (SPEC-09)", () => {
    for (const level of SKI_LEVELS) {
      expect(level.label.length).toBeGreaterThan(0);
    }
  });
});
