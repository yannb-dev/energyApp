import { describe, expect, it } from "vitest";

import { findIntensity, INTENSITY_LEVELS } from "@/lib/intensity";

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
