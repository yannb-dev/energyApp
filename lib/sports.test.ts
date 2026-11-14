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
    expect(SPORTS.find((sport) => sport.label === "Marche rapide")?.met).toBe(
      4.3,
    );
    expect(SPORTS.find((sport) => sport.label === "Course 8 km/h")?.met).toBe(
      8.3,
    );
    expect(SPORTS.find((sport) => sport.label === "Course 10 km/h")?.met).toBe(
      9.8,
    );
    expect(SPORTS.find((sport) => sport.label === "Ski Randonnée")?.met).toBe(
      10,
    );
    expect(
      SPORTS.find((sport) => sport.label === "Vélo route soutenu")?.met,
    ).toBe(10);
    expect(
      SPORTS.find((sport) => sport.label === "Natation crawl modérée")?.met,
    ).toBe(5.8);
    expect(
      SPORTS.find((sport) => sport.label === "Natation crawl rapide")?.met,
    ).toBe(9.8);
    expect(SPORTS.find((sport) => sport.label === "Aviron modéré")?.met).toBe(
      7,
    );
    expect(SPORTS.find((sport) => sport.label === "Randonnée")?.met).toBe(6);
    expect(SPORTS.find((sport) => sport.label === "Ski de fond")?.met).toBe(9);
  });
});
