import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { NutritionFormValues } from "@/lib/nutrition";
import {
  clearNutrition,
  loadNutrition,
  NUTRITION_STORAGE_KEY,
  saveNutrition,
  type NutritionPersistedValues,
} from "@/lib/nutritionStorage";

const persisted: NutritionPersistedValues = {
  carbCap: "70",
  sodiumCap: "700",
  productBrand: "Overstims",
  productName: "Barre endurance",
  productType: "Barre",
  productKcal: "200",
  productCarbs: "25",
  productSalt: "0.25",
  productWeight: "60",
  drinkEnabled: true,
  drinkBrand: "Overstims",
  drinkName: "Boisson énergétique",
  drinkConcentration: "40",
  drinkKcalPer100: "380",
  drinkCarbsPer100: "75",
  drinkSaltPer100: "3",
};

const formValues: NutritionFormValues = { ...persisted, minutes: "90" };

describe("nutritionStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("utilise la clé de stockage de la SPEC", () => {
    expect(NUTRITION_STORAGE_KEY).toBe("kcalapp:nutrition:v1");
  });

  it("retourne null quand rien n'est enregistré", () => {
    expect(loadNutrition()).toBeNull();
  });

  it("fait un aller-retour complet sans la durée", () => {
    saveNutrition(formValues);

    expect(loadNutrition()).toEqual(persisted);

    const raw = window.localStorage.getItem(NUTRITION_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(Object.keys(JSON.parse(raw ?? "{}"))).not.toContain("minutes");
  });

  it("ignore un JSON corrompu", () => {
    window.localStorage.setItem(NUTRITION_STORAGE_KEY, "{ceci n'est pas du json");
    expect(loadNutrition()).toBeNull();
  });

  it("ignore une valeur hors bornes", () => {
    window.localStorage.setItem(
      NUTRITION_STORAGE_KEY,
      JSON.stringify({ ...persisted, carbCap: "999" }),
    );
    expect(loadNutrition()).toBeNull();
  });

  it("ignore un type inattendu", () => {
    window.localStorage.setItem(
      NUTRITION_STORAGE_KEY,
      JSON.stringify({ ...persisted, drinkEnabled: "oui" }),
    );
    expect(loadNutrition()).toBeNull();
  });

  it("ignore un type de produit inconnu", () => {
    window.localStorage.setItem(
      NUTRITION_STORAGE_KEY,
      JSON.stringify({ ...persisted, productType: "Boisson" }),
    );
    expect(loadNutrition()).toBeNull();
  });

  it("ignore un champ manquant", () => {
    const { productName, ...incomplet } = persisted;
    expect(productName).toBe("Barre endurance");
    window.localStorage.setItem(NUTRITION_STORAGE_KEY, JSON.stringify(incomplet));
    expect(loadNutrition()).toBeNull();
  });

  it("survit à un localStorage qui lève à la lecture", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("stockage indisponible");
    });

    expect(() => loadNutrition()).not.toThrow();
    expect(loadNutrition()).toBeNull();
  });

  it("survit à un localStorage qui lève à l'écriture", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota dépassé");
    });

    expect(() => saveNutrition(formValues)).not.toThrow();
  });

  it("efface la clé", () => {
    saveNutrition(formValues);
    expect(loadNutrition()).not.toBeNull();

    clearNutrition();

    expect(window.localStorage.getItem(NUTRITION_STORAGE_KEY)).toBeNull();
    expect(loadNutrition()).toBeNull();
  });

  it("survit à un localStorage qui lève à l'effacement", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("stockage indisponible");
    });

    expect(() => clearNutrition()).not.toThrow();
  });
});
