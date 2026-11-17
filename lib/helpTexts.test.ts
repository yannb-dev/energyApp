import { describe, expect, it } from "vitest";

import { ACTIVITY_LEVELS } from "@/lib/energy";
import { BMR_HELP, CAPS_HELP, LIMITING_FACTOR_HELP, STRATEGY_HELP, TDEE_HELP } from "@/lib/helpTexts";
import {
  CARB_CAP_RECOMMENDED,
  HYDRATION_CAP_ML_PER_HOUR,
  HYDRATION_CAP_RECOMMENDED,
  SODIUM_CAP_RECOMMENDED,
} from "@/lib/nutrition";

describe("helpTexts", () => {
  it("CAPS_HELP reprend les repères usuels des constantes de nutrition", () => {
    const references = [
      CARB_CAP_RECOMMENDED.min,
      CARB_CAP_RECOMMENDED.max,
      SODIUM_CAP_RECOMMENDED.min,
      SODIUM_CAP_RECOMMENDED.max,
      HYDRATION_CAP_RECOMMENDED.min,
      HYDRATION_CAP_RECOMMENDED.max,
      HYDRATION_CAP_ML_PER_HOUR,
    ];

    for (const reference of references) {
      expect(CAPS_HELP).toContain(String(reference));
    }
  });

  it("CAPS_HELP contient les repères attendus", () => {
    for (const value of ["30", "90", "300", "1000", "400", "800"]) {
      expect(CAPS_HELP).toContain(value);
    }
  });

  it("TDEE_HELP liste chaque palier d'activité et son coefficient", () => {
    for (const level of ACTIVITY_LEVELS) {
      expect(TDEE_HELP).toContain(level.label);
      expect(TDEE_HELP).toContain(String(level.coefficient));
    }
  });

  it("BMR_HELP décrit la formule de Mifflin-St Jeor", () => {
    expect(BMR_HELP).toContain("Mifflin-St Jeor");
    expect(BMR_HELP).toContain("poids");
    expect(BMR_HELP).toContain("taille");
    expect(BMR_HELP).toContain("âge");
    expect(BMR_HELP).toContain("161");
  });

  it("LIMITING_FACTOR_HELP explique le calcul en double", () => {
    expect(LIMITING_FACTOR_HELP).toContain("glucides");
    expect(LIMITING_FACTOR_HELP).toContain("sodium");
    expect(LIMITING_FACTOR_HELP).toContain("moins d'unités");
  });

  it("les textes restent une information générale, pas un conseil médical", () => {
    for (const text of [CAPS_HELP, BMR_HELP, TDEE_HELP, LIMITING_FACTOR_HELP]) {
      expect(text).toContain("Information générale, pas un conseil médical.");
    }
  });

  it("LIMITING_FACTOR_HELP décrit la répartition entre plusieurs produits", () => {
    expect(LIMITING_FACTOR_HELP).toContain("part");
    expect(LIMITING_FACTOR_HELP).toContain("produit");
    expect(LIMITING_FACTOR_HELP).toContain("boisson");
  });

  it("STRATEGY_HELP explique les stratégies de répartition", () => {
    expect(STRATEGY_HELP).toContain("stratégie");
    expect(STRATEGY_HELP).toContain("répart");
    expect(STRATEGY_HELP).toContain("produits");
    expect(STRATEGY_HELP).toContain("Information générale, pas un conseil médical.");
  });
});
