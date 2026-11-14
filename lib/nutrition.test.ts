import { describe, expect, it } from "vitest";

import {
  CARB_CAP_DEFAULT_G_PER_HOUR,
  CARB_CAP_MAX,
  CARB_CAP_MIN,
  computeNutritionPlan,
  DEFAULT_NUTRITION_VALUES,
  DRINK_INTERVAL_MINUTES,
  DRINK_SERVING_ML,
  PRODUCT_TYPES,
  SODIUM_CAP_DEFAULT_MG_PER_HOUR,
  SODIUM_CAP_MAX,
  SODIUM_CAP_MIN,
  SODIUM_MG_PER_GRAM_SALT,
  TEXT_MAX_LENGTH,
  WARNING_DRINK_CONCENTRATION,
  WARNING_NO_UNIT_FITS,
  validateNutritionInputs,
  type NutritionFormValues,
} from "@/lib/nutrition";

/** Barre de référence : 25 g de glucides, 0,25 g de sel, 200 kcal, 60 g. */
function formValues(overrides: Partial<NutritionFormValues> = {}): NutritionFormValues {
  return {
    carbCap: "60",
    sodiumCap: "600",
    minutes: "120",
    productBrand: "Overstims",
    productName: "Barre endurance",
    productType: "Barre",
    productKcal: "200",
    productCarbs: "25",
    productSalt: "0.25",
    productWeight: "60",
    drinkEnabled: false,
    drinkBrand: "Overstims",
    drinkName: "Boisson énergétique",
    drinkConcentration: "40",
    drinkKcalPer100: "380",
    drinkCarbsPer100: "75",
    drinkSaltPer100: "3",
    ...overrides,
  };
}

describe("constantes de nutrition", () => {
  it("fixe les plafonds par défaut de la SPEC", () => {
    expect(CARB_CAP_DEFAULT_G_PER_HOUR).toBe(60);
    expect(SODIUM_CAP_DEFAULT_MG_PER_HOUR).toBe(600);
    expect(DEFAULT_NUTRITION_VALUES.carbCap).toBe("60");
    expect(DEFAULT_NUTRITION_VALUES.sodiumCap).toBe("600");
  });

  it("expose les bornes des plafonds", () => {
    expect(CARB_CAP_MIN).toBe(20);
    expect(CARB_CAP_MAX).toBe(120);
    expect(SODIUM_CAP_MIN).toBe(100);
    expect(SODIUM_CAP_MAX).toBe(1500);
  });

  it("expose les types de produit", () => {
    expect(PRODUCT_TYPES).toEqual(["Barre", "Gel", "Compote", "Pâte de fruits", "Autre"]);
  });

  it("expose les constantes de conversion", () => {
    expect(SODIUM_MG_PER_GRAM_SALT).toBe(400);
    expect(DRINK_SERVING_ML).toBe(150);
    expect(DRINK_INTERVAL_MINUTES).toBe(15);
    expect(TEXT_MAX_LENGTH).toBe(50);
  });
});

describe("validateNutritionInputs", () => {
  it("accepte un formulaire complet sans boisson", () => {
    expect(validateNutritionInputs(formValues())).toEqual({});
  });

  it("accepte un formulaire complet avec boisson", () => {
    expect(validateNutritionInputs(formValues({ drinkEnabled: true }))).toEqual({});
  });

  it("ignore les champs de la boisson quand la case est décochée", () => {
    const errors = validateNutritionInputs(
      formValues({
        drinkEnabled: false,
        drinkBrand: "",
        drinkName: "",
        drinkConcentration: "",
        drinkKcalPer100: "",
        drinkCarbsPer100: "",
        drinkSaltPer100: "",
      }),
    );
    expect(errors).toEqual({});
  });

  it("signale chaque champ vide", () => {
    const errors = validateNutritionInputs({
      carbCap: "",
      sodiumCap: "",
      minutes: "",
      productBrand: "",
      productName: "",
      productType: "",
      productKcal: "",
      productCarbs: "",
      productSalt: "",
      productWeight: "",
      drinkEnabled: true,
      drinkBrand: "",
      drinkName: "",
      drinkConcentration: "",
      drinkKcalPer100: "",
      drinkCarbsPer100: "",
      drinkSaltPer100: "",
    });

    expect(Object.keys(errors).sort()).toEqual(
      [
        "carbCap",
        "sodiumCap",
        "minutes",
        "productBrand",
        "productName",
        "productType",
        "productKcal",
        "productCarbs",
        "productSalt",
        "productWeight",
        "drinkBrand",
        "drinkName",
        "drinkConcentration",
        "drinkKcalPer100",
        "drinkCarbsPer100",
        "drinkSaltPer100",
      ].sort(),
    );
  });

  it("borne les plafonds et la durée", () => {
    expect(validateNutritionInputs(formValues({ carbCap: "19" })).carbCap).toMatch(/entre 20 et 120/);
    expect(validateNutritionInputs(formValues({ carbCap: "121" })).carbCap).toMatch(/entre 20 et 120/);
    expect(validateNutritionInputs(formValues({ sodiumCap: "99" })).sodiumCap).toMatch(
      /entre 100 et 1500/,
    );
    expect(validateNutritionInputs(formValues({ sodiumCap: "1501" })).sodiumCap).toMatch(
      /entre 100 et 1500/,
    );
    expect(validateNutritionInputs(formValues({ minutes: "0" })).minutes).toMatch(/entre 1 et 1440/);
    expect(validateNutritionInputs(formValues({ minutes: "1441" })).minutes).toMatch(
      /entre 1 et 1440/,
    );
  });

  it("borne les champs du produit solide", () => {
    expect(validateNutritionInputs(formValues({ productKcal: "1001" })).productKcal).toMatch(
      /entre 0 et 1000/,
    );
    expect(validateNutritionInputs(formValues({ productSalt: "6" })).productSalt).toMatch(
      /entre 0 et 5/,
    );
    expect(validateNutritionInputs(formValues({ productWeight: "0" })).productWeight).toMatch(
      /entre 1 et 500/,
    );
    expect(validateNutritionInputs(formValues({ productWeight: "501" })).productWeight).toMatch(
      /entre 1 et 500/,
    );
    expect(validateNutritionInputs(formValues({ productCarbs: "0" })).productCarbs).toBeTruthy();
    expect(validateNutritionInputs(formValues({ productCarbs: "61" })).productCarbs).toMatch(
      /poids/,
    );
  });

  it("exige un type de produit de la liste", () => {
    const errors = validateNutritionInputs(
      formValues({ productType: "Boisson" as NutritionFormValues["productType"] }),
    );
    expect(errors.productType).toBeTruthy();
  });

  it("limite les textes à 50 caractères", () => {
    const tropLong = "x".repeat(TEXT_MAX_LENGTH + 1);
    expect(validateNutritionInputs(formValues({ productBrand: tropLong })).productBrand).toMatch(
      /50/,
    );
    expect(validateNutritionInputs(formValues({ productName: tropLong })).productName).toMatch(/50/);
    expect(
      validateNutritionInputs(formValues({ drinkEnabled: true, drinkBrand: tropLong })).drinkBrand,
    ).toMatch(/50/);
  });

  it("borne les champs de la boisson seulement si elle est activée", () => {
    expect(validateNutritionInputs(formValues({ drinkConcentration: "151" })).drinkConcentration).toBeUndefined();
    expect(
      validateNutritionInputs(formValues({ drinkEnabled: true, drinkConcentration: "0" }))
        .drinkConcentration,
    ).toMatch(/entre 1 et 150/);
    expect(
      validateNutritionInputs(formValues({ drinkEnabled: true, drinkKcalPer100: "501" }))
        .drinkKcalPer100,
    ).toMatch(/entre 0 et 500/);
    expect(
      validateNutritionInputs(formValues({ drinkEnabled: true, drinkCarbsPer100: "0" }))
        .drinkCarbsPer100,
    ).toBeTruthy();
    expect(
      validateNutritionInputs(formValues({ drinkEnabled: true, drinkCarbsPer100: "101" }))
        .drinkCarbsPer100,
    ).toMatch(/100/);
    expect(
      validateNutritionInputs(formValues({ drinkEnabled: true, drinkSaltPer100: "101" }))
        .drinkSaltPer100,
    ).toMatch(/entre 0 et 100/);
  });
});

describe("computeNutritionPlan — exemple 1", () => {
  it("recommande 4 unités limitées par les glucides à 50 g/h", () => {
    const plan = computeNutritionPlan(formValues());
    expect(plan).not.toBeNull();
    if (!plan) return;

    expect(plan.drink).toBeNull();
    expect(plan.units).toBe(4);
    expect(plan.limitingFactor).toBe("carbs");
    expect(plan.rates.carbsGPerHour).toBeCloseTo(50, 6);
    expect(plan.intervalMinutes).toBeCloseTo(30, 6);
    expect(plan.totals.carbsG).toBeCloseTo(100, 6);
    expect(plan.totals.sodiumMg).toBeCloseTo(400, 6);
    expect(plan.totals.kcal).toBeCloseTo(800, 6);
    expect(plan.warnings).toEqual([]);
  });
});

describe("computeNutritionPlan — exemple 2", () => {
  const plan = computeNutritionPlan(formValues({ drinkEnabled: true }));

  it("calcule la boisson : 8 prises, 1200 ml, 48 g de poudre", () => {
    expect(plan?.drink).not.toBeNull();
    if (!plan?.drink) return;

    expect(plan.drink.servings).toBe(8);
    expect(plan.drink.volumeMl).toBeCloseTo(1200, 6);
    expect(plan.drink.powderG).toBeCloseTo(48, 6);
    expect(plan.drink.carbsG).toBeCloseTo(36, 6);
    expect(plan.drink.sodiumMg).toBeCloseTo(576, 6);
  });

  it("recommande 3 unités et totalise 111 g / 876 mg", () => {
    expect(plan).not.toBeNull();
    if (!plan) return;

    expect(plan.units).toBe(3);
    expect(plan.limitingFactor).toBe("carbs");
    expect(plan.totals.carbsG).toBeCloseTo(111, 6);
    expect(plan.totals.sodiumMg).toBeCloseTo(876, 6);
    expect(plan.rates.carbsGPerHour).toBeCloseTo(55.5, 6);
    expect(plan.rates.sodiumMgPerHour).toBeCloseTo(438, 6);
    expect(plan.intervalMinutes).toBeCloseTo(40, 6);
  });
});

describe("computeNutritionPlan — exemple 3", () => {
  it("recommande 3 unités limitées par le sodium avec une barre à 1 g de sel", () => {
    const plan = computeNutritionPlan(formValues({ productSalt: "1" }));
    expect(plan).not.toBeNull();
    if (!plan) return;

    expect(plan.units).toBe(3);
    expect(plan.limitingFactor).toBe("sodium");
    expect(plan.totals.sodiumMg).toBeCloseTo(1200, 6);
  });
});

describe("computeNutritionPlan — exemple 4", () => {
  it("alerte sur la concentration et ne recommande aucune unité", () => {
    const plan = computeNutritionPlan(
      formValues({
        minutes: "60",
        drinkEnabled: true,
        drinkConcentration: "150",
        drinkCarbsPer100: "90",
        drinkSaltPer100: "0",
      }),
    );
    expect(plan).not.toBeNull();
    if (!plan) return;

    expect(plan.drink?.servings).toBe(4);
    expect(plan.drink?.volumeMl).toBeCloseTo(600, 6);
    expect(plan.drink?.powderG).toBeCloseTo(90, 6);
    expect(plan.drink?.carbsG).toBeCloseTo(81, 6);
    expect(plan.rates.carbsGPerHour).toBeCloseTo(81, 6);
    expect(plan.units).toBe(0);
    expect(plan.intervalMinutes).toBeNull();
    expect(plan.warnings).toContain(WARNING_DRINK_CONCENTRATION);
    expect(plan.warnings).not.toContain(WARNING_NO_UNIT_FITS);
  });
});

describe("computeNutritionPlan — cas limites", () => {
  it("alerte quand une unité dépasserait le plafond glucides", () => {
    const plan = computeNutritionPlan(
      formValues({ minutes: "60", productCarbs: "100", productWeight: "120" }),
    );
    expect(plan?.units).toBe(0);
    expect(plan?.warnings).toContain(WARNING_NO_UNIT_FITS);
  });

  it("ne pose aucune limite sodium quand l'unité n'en contient pas", () => {
    const plan = computeNutritionPlan(formValues({ productSalt: "0" }));
    expect(plan?.limits.unitsBySodium).toBe(Number.POSITIVE_INFINITY);
    expect(plan?.units).toBe(4);
  });

  it("tranche en faveur des glucides en cas d'égalité", () => {
    const plan = computeNutritionPlan(
      formValues({ productCarbs: "30", productWeight: "60", productSalt: "0.75" }),
    );
    expect(plan?.limits.unitsByCarbs).toBe(4);
    expect(plan?.limits.unitsBySodium).toBe(4);
    expect(plan?.units).toBe(4);
    expect(plan?.limitingFactor).toBe("carbs");
  });

  it("retourne null quand le formulaire est invalide", () => {
    expect(computeNutritionPlan(formValues({ minutes: "" }))).toBeNull();
    expect(computeNutritionPlan(formValues({ productWeight: "0" }))).toBeNull();
  });
});
