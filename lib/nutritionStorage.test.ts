import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Product } from "@/lib/products";
import {
  clearNutrition,
  loadNutrition,
  NUTRITION_STORAGE_KEY,
  NUTRITION_STORAGE_KEY_V1,
  saveNutrition,
  type NutritionSettings,
} from "@/lib/nutritionStorage";

const BARRE: Product = {
  id: "barre",
  brand: "Overstims",
  name: "Barre endurance",
  type: "Barre",
  kcal: 200,
  carbs: 25,
  salt: 0.25,
  weight: 60,
};

const GEL: Product = {
  id: "gel",
  brand: "Overstims",
  name: "Gel café",
  type: "Gel",
  kcal: 100,
  carbs: 22,
  salt: 0.1,
  weight: 35,
};

const settings: NutritionSettings = {
  carbCap: "70",
  sodiumCap: "700",
  products: [BARRE, GEL],
  selectedIds: ["barre", "gel"],
  strategyKey: "mixte75",
  drinkEnabled: true,
  drinkBrand: "Overstims",
  drinkName: "Boisson énergétique",
  drinkConcentration: "40",
  drinkKcalPer100: "380",
  drinkCarbsPer100: "75",
  drinkSaltPer100: "3",
};

/** Ancien format v1 : un seul produit, en texte. */
const V1_VALUES = {
  carbCap: "60",
  sodiumCap: "600",
  productBrand: "Materne",
  productName: "Compote pomme",
  productType: "Compote",
  productKcal: "90",
  productCarbs: "18",
  productSalt: "0",
  productWeight: "90",
  drinkEnabled: true,
  drinkBrand: "Overstims",
  drinkName: "Boisson énergétique",
  drinkConcentration: "40",
  drinkKcalPer100: "380",
  drinkCarbsPer100: "75",
  drinkSaltPer100: "3",
};

function storeV2(value: unknown) {
  window.localStorage.setItem(NUTRITION_STORAGE_KEY, JSON.stringify(value));
}

describe("nutritionStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("utilise la clé v2 de la SPEC", () => {
    expect(NUTRITION_STORAGE_KEY).toBe("kcalapp:nutrition:v2");
    expect(NUTRITION_STORAGE_KEY_V1).toBe("kcalapp:nutrition:v1");
  });

  it("retourne null quand rien n'est enregistré", () => {
    expect(loadNutrition()).toBeNull();
  });

  it("fait un aller-retour complet", () => {
    saveNutrition(settings);

    expect(loadNutrition()).toEqual(settings);
  });

  it("ignore un JSON corrompu", () => {
    window.localStorage.setItem(NUTRITION_STORAGE_KEY, "{ceci n'est pas du json");
    expect(loadNutrition()).toBeNull();
  });

  it("ignore une valeur hors bornes (exemple 14)", () => {
    storeV2({ ...settings, carbCap: "999" });
    expect(loadNutrition()).toBeNull();
  });

  it("ignore un type de produit inconnu (exemple 14)", () => {
    storeV2({ ...settings, products: [{ ...BARRE, type: "Compote" }] });
    expect(loadNutrition()).toBeNull();
  });

  it("ignore un produit aux glucides incohérents (exemple 14)", () => {
    storeV2({ ...settings, products: [{ ...BARRE, carbs: 80 }] });
    expect(loadNutrition()).toBeNull();
  });

  it("ignore un champ manquant (exemple 14)", () => {
    const { products, ...incomplet } = settings;
    expect(products).toHaveLength(2);
    storeV2(incomplet);
    expect(loadNutrition()).toBeNull();
  });

  it("ignore une sélection qui pointe un produit absent (exemple 14)", () => {
    storeV2({ ...settings, selectedIds: ["barre", "inconnu"] });
    expect(loadNutrition()).toBeNull();
  });

  it("ignore un type inattendu pour drinkEnabled", () => {
    storeV2({ ...settings, drinkEnabled: "oui" });
    expect(loadNutrition()).toBeNull();
  });

  it("accepte une stratégie absente", () => {
    const { strategyKey, ...sansStrategie } = settings;
    expect(strategyKey).toBe("mixte75");
    storeV2(sansStrategie);

    expect(loadNutrition()?.strategyKey).toBeNull();
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

    expect(() => saveNutrition(settings)).not.toThrow();
  });

  it("efface la clé", () => {
    saveNutrition(settings);
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

  describe("migration v1 → v2 (exemple 13)", () => {
    it("convertit le produit v1 en « Pate » sélectionnée", () => {
      window.localStorage.setItem(NUTRITION_STORAGE_KEY_V1, JSON.stringify(V1_VALUES));

      const migrated = loadNutrition();

      expect(migrated).not.toBeNull();
      expect(migrated?.products).toHaveLength(1);
      expect(migrated?.products[0]).toMatchObject({
        brand: "Materne",
        name: "Compote pomme",
        type: "Pate",
        kcal: 90,
        carbs: 18,
        salt: 0,
        weight: 90,
      });
      expect(migrated?.selectedIds).toEqual([migrated?.products[0].id]);
      expect(migrated?.carbCap).toBe("60");
      expect(migrated?.sodiumCap).toBe("600");
    });

    it("conserve la boisson et laisse la stratégie au défaut", () => {
      window.localStorage.setItem(NUTRITION_STORAGE_KEY_V1, JSON.stringify(V1_VALUES));

      const migrated = loadNutrition();

      expect(migrated?.drinkEnabled).toBe(true);
      expect(migrated?.drinkName).toBe("Boisson énergétique");
      expect(migrated?.strategyKey).toBeNull();
    });

    it("supprime la clé v1 et écrit la v2", () => {
      window.localStorage.setItem(NUTRITION_STORAGE_KEY_V1, JSON.stringify(V1_VALUES));

      loadNutrition();

      expect(window.localStorage.getItem(NUTRITION_STORAGE_KEY_V1)).toBeNull();
      expect(window.localStorage.getItem(NUTRITION_STORAGE_KEY)).not.toBeNull();
    });

    it("convertit aussi « Autre » et « Pâte de fruits » en « Pate »", () => {
      for (const ancien of ["Autre", "Pâte de fruits"]) {
        window.localStorage.clear();
        window.localStorage.setItem(
          NUTRITION_STORAGE_KEY_V1,
          JSON.stringify({ ...V1_VALUES, productType: ancien }),
        );

        expect(loadNutrition()?.products[0].type).toBe("Pate");
      }
    });

    it("ignore un produit v1 incomplet mais garde plafonds et boisson", () => {
      window.localStorage.setItem(
        NUTRITION_STORAGE_KEY_V1,
        JSON.stringify({ ...V1_VALUES, productKcal: "" }),
      );

      const migrated = loadNutrition();

      expect(migrated?.products).toEqual([]);
      expect(migrated?.selectedIds).toEqual([]);
      expect(migrated?.carbCap).toBe("60");
    });

    it("ne migre pas quand la clé v2 existe déjà", () => {
      saveNutrition(settings);
      window.localStorage.setItem(NUTRITION_STORAGE_KEY_V1, JSON.stringify(V1_VALUES));

      expect(loadNutrition()).toEqual(settings);
      expect(window.localStorage.getItem(NUTRITION_STORAGE_KEY_V1)).not.toBeNull();
    });

    it("retourne null pour une v1 illisible sans détruire la clé", () => {
      window.localStorage.setItem(NUTRITION_STORAGE_KEY_V1, "{pas du json");

      expect(loadNutrition()).toBeNull();
      expect(window.localStorage.getItem(NUTRITION_STORAGE_KEY_V1)).not.toBeNull();
    });
  });
});
