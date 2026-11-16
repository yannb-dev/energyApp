import { describe, expect, it } from "vitest";

import { SPORTS } from "@/lib/sports";

describe("SPORTS", () => {
  it("propose 10 sports", () => {
    expect(SPORTS).toHaveLength(10);
  });

  it("a des identifiants uniques et non vides", () => {
    const ids = SPORTS.map((sport) => sport.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.length).toBeGreaterThan(0);
    }
  });

  it("a des libellés non vides", () => {
    for (const sport of SPORTS) {
      expect(sport.label.length).toBeGreaterThan(0);
    }
  });

  it("a des MET strictement positifs", () => {
    for (const sport of SPORTS) {
      expect(sport.met).toBeGreaterThan(0);
    }
  });

  it("reprend les MET du Compendium of Physical Activities", () => {
    expect(
      SPORTS.find((sport) => sport.label === "Course à pied (modéré)")?.met,
    ).toBe(8.3);
    expect(
      SPORTS.find((sport) => sport.label === "Course à pied (intense)")?.met,
    ).toBe(9.8);
    expect(SPORTS.find((sport) => sport.label === "Trail (modéré)")?.met).toBe(
      9,
    );
    expect(SPORTS.find((sport) => sport.label === "Trail (intense)")?.met).toBe(
      11,
    );
    expect(
      SPORTS.find((sport) => sport.label === "Ski de randonnée (modéré)")?.met,
    ).toBe(7);
    expect(
      SPORTS.find((sport) => sport.label === "Ski de randonnée (intense)")?.met,
    ).toBe(10);
    expect(
      SPORTS.find((sport) => sport.label === "Randonnée (modéré)")?.met,
    ).toBe(6);
    expect(
      SPORTS.find((sport) => sport.label === "Randonnée (intense)")?.met,
    ).toBe(7.8);
  });
});
