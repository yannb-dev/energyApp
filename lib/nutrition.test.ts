import { describe, expect, it } from "vitest";

import type { Product } from "@/lib/products";
import {
  buildMultiProductTimeline,
  buildNutritionTimeline,
  CARB_CAP_DEFAULT_G_PER_HOUR,
  CARB_CAP_MAX,
  CARB_CAP_MIN,
  CARB_CAP_RECOMMENDED,
  computeCapUsage,
  computeHydrationRate,
  computeMultiProductPlan,
  computeNutritionPlan,
  DEFAULT_NUTRITION_VALUES,
  DRINK_INTERVAL_MINUTES,
  DRINK_SERVING_ML,
  HYDRATION_CAP_ML_PER_HOUR,
  HYDRATION_CAP_RECOMMENDED,
  PRODUCT_TYPES,
  SODIUM_CAP_DEFAULT_MG_PER_HOUR,
  SODIUM_CAP_MAX,
  SODIUM_CAP_MIN,
  SODIUM_CAP_RECOMMENDED,
  SODIUM_MG_PER_GRAM_SALT,
  TEXT_MAX_LENGTH,
  TIMELINE_PX_PER_10_MIN,
  timelineOffsetPx,
  WARNING_DRINK_CONCENTRATION,
  WARNING_NO_UNIT_FITS,
  validateNutritionInputs,
  type MultiProductInput,
  type MultiTimelineInput,
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

describe("repères recommandés", () => {
  it("expose les repères usuels de glucides et de sodium", () => {
    expect(CARB_CAP_RECOMMENDED).toEqual({ min: 30, max: 90 });
    expect(SODIUM_CAP_RECOMMENDED).toEqual({ min: 300, max: 1000 });
  });
});

describe("computeCapUsage — exemple 4", () => {
  it("donne le ratio d'usage d'un plafond sans dépassement", () => {
    const usage = computeCapUsage(55.5, 60);
    expect(usage.ratio).toBeCloseTo(0.925, 6);
    expect(usage.exceeded).toBe(false);
  });

  it("signale le dépassement d'un plafond", () => {
    const usage = computeCapUsage(81, 60);
    expect(usage.ratio).toBeCloseTo(1.35, 6);
    expect(usage.exceeded).toBe(true);
  });
});

describe("buildNutritionTimeline — exemple 1", () => {
  it("place 4 prises solides à 15, 45, 75 et 105 min", () => {
    const values = formValues();
    const plan = computeNutritionPlan(values);
    expect(plan).not.toBeNull();
    if (!plan) return;

    const timeline = buildNutritionTimeline(values, plan);

    expect(timeline.minutes).toBe(120);
    expect(timeline.events).toHaveLength(4);
    expect(timeline.events.map((event) => event.minute)).toEqual([15, 45, 75, 105]);
    expect(timeline.events.every((event) => event.kind === "solid")).toBe(true);
    expect(timeline.events[0].carbsG).toBeCloseTo(25, 6);
    expect(timeline.events[0].sodiumMg).toBeCloseTo(100, 6);

    const last = timeline.series[timeline.series.length - 1];
    expect(last.minute).toBe(120);
    expect(last.carbsG).toBeCloseTo(100, 6);
    expect(last.sodiumMg).toBeCloseTo(400, 6);
    expect(last.carbsG).toBeCloseTo(plan.totals.carbsG, 6);
    expect(last.sodiumMg).toBeCloseTo(plan.totals.sodiumMg, 6);

    expect(timeline.capLines.carbsG.from).toEqual({ minute: 0, value: 0 });
    expect(timeline.capLines.carbsG.to).toEqual({ minute: 120, value: 120 });
    expect(timeline.capLines.sodiumMg.from).toEqual({ minute: 0, value: 0 });
    expect(timeline.capLines.sodiumMg.to.value).toBeCloseTo(1200, 6);
  });
});

describe("buildNutritionTimeline — exemple 2", () => {
  it("place 8 gorgées et 3 prises solides pour un cumul final de 111 g / 876 mg", () => {
    const values = formValues({ drinkEnabled: true });
    const plan = computeNutritionPlan(values);
    expect(plan).not.toBeNull();
    if (!plan) return;

    const timeline = buildNutritionTimeline(values, plan);
    const drinks = timeline.events.filter((event) => event.kind === "drink");
    const solids = timeline.events.filter((event) => event.kind === "solid");

    expect(drinks.map((event) => event.minute)).toEqual([15, 30, 45, 60, 75, 90, 105, 120]);
    expect(drinks[0].carbsG).toBeCloseTo(4.5, 6);
    expect(drinks[0].sodiumMg).toBeCloseTo(72, 6);
    expect(solids.map((event) => event.minute)).toEqual([20, 60, 100]);
    expect(solids[0].carbsG).toBeCloseTo(25, 6);
    expect(solids[0].sodiumMg).toBeCloseTo(100, 6);

    const minutes = timeline.events.map((event) => event.minute);
    expect(minutes).toEqual([...minutes].sort((a, b) => a - b));

    expect(timeline.series[0]).toEqual({ minute: 0, carbsG: 0, sodiumMg: 0 });
    const last = timeline.series[timeline.series.length - 1];
    expect(last.minute).toBe(120);
    expect(last.carbsG).toBeCloseTo(111, 6);
    expect(last.sodiumMg).toBeCloseTo(876, 6);
    expect(last.carbsG).toBeCloseTo(plan.totals.carbsG, 6);
    expect(last.sodiumMg).toBeCloseTo(plan.totals.sodiumMg, 6);
  });
});

describe("buildNutritionTimeline — exemple 3", () => {
  it("ne crée aucune prise de boisson quand la durée est plus courte que l'intervalle", () => {
    const values = formValues({ minutes: "10", drinkEnabled: true });
    const plan = computeNutritionPlan(values);
    expect(plan).not.toBeNull();
    if (!plan) return;

    const timeline = buildNutritionTimeline(values, plan);

    expect(plan.drink?.servings).toBe(0);
    expect(timeline.minutes).toBe(10);
    expect(timeline.events.filter((event) => event.kind === "drink")).toHaveLength(0);
    expect(timeline.events.filter((event) => event.kind === "solid")).toHaveLength(0);
    expect(timeline.series[timeline.series.length - 1]).toEqual({
      minute: 10,
      carbsG: 0,
      sodiumMg: 0,
    });
  });
});

describe("plafond hydrique et axe vertical", () => {
  it("expose les constantes de la timeline verticale", () => {
    expect(HYDRATION_CAP_ML_PER_HOUR).toBe(750);
    expect(HYDRATION_CAP_RECOMMENDED).toEqual({ min: 400, max: 800 });
    expect(TIMELINE_PX_PER_10_MIN).toBe(20);
  });

  it("convertit une minute en pixels d'axe (exemple 3)", () => {
    expect(timelineOffsetPx(0)).toBe(0);
    expect(timelineOffsetPx(10)).toBe(20);
    expect(timelineOffsetPx(120)).toBe(240);
  });

  it("calcule le débit de boisson en ml/h (exemple 4)", () => {
    const plan = computeNutritionPlan(formValues({ drinkEnabled: true }));
    expect(plan).not.toBeNull();
    if (!plan) return;

    expect(plan.drink?.volumeMl).toBeCloseTo(1200, 6);
    expect(computeHydrationRate(plan, 120)).toBeCloseTo(600, 6);
  });

  it("ne compte aucune eau sans boisson ou sans durée", () => {
    const withoutDrink = computeNutritionPlan(formValues());
    expect(withoutDrink).not.toBeNull();
    if (!withoutDrink) return;
    expect(computeHydrationRate(withoutDrink, 120)).toBe(0);

    const withDrink = computeNutritionPlan(formValues({ drinkEnabled: true }));
    expect(withDrink).not.toBeNull();
    if (!withDrink) return;
    expect(computeHydrationRate(withDrink, 0)).toBe(0);
  });

  it("signale un dépassement hydrique avec le plafond de 750 ml/h", () => {
    const usage = computeCapUsage(900, HYDRATION_CAP_ML_PER_HOUR);
    expect(usage.ratio).toBeCloseTo(1.2, 6);
    expect(usage.exceeded).toBe(true);
  });
});

/** Produits de référence des cas multi-produits. */
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

const PATE: Product = {
  id: "pate",
  brand: "Baovola",
  name: "Pâte pomme",
  type: "Pâte de fruit",
  kcal: 90,
  carbs: 18,
  salt: 0,
  weight: 25,
};

const DRINK = { concentration: 40, kcalPer100: 380, carbsPer100: 75, saltPer100: 3 };

function multi(overrides: Partial<MultiProductInput> = {}): MultiProductInput {
  return {
    carbCap: 60,
    sodiumCap: 600,
    minutes: 120,
    products: [BARRE],
    shares: [100],
    drink: null,
    ...overrides,
  };
}

function itemUnits(plan: ReturnType<typeof computeMultiProductPlan>, productId: string): number {
  return plan.items.find((item) => item.productId === productId)?.units ?? -1;
}

describe("computeMultiProductPlan — exemple 1", () => {
  it("retrouve le calcul à un produit (non-régression)", () => {
    const plan = computeMultiProductPlan(multi());

    expect(plan.items).toHaveLength(1);
    expect(plan.items[0]).toMatchObject({ productId: "barre", units: 4, limitingFactor: "carbs" });
    expect(plan.limitingFactor).toBe("carbs");
    expect(plan.totals.carbsG).toBeCloseTo(100, 6);
    expect(plan.totals.sodiumMg).toBeCloseTo(400, 6);
    expect(plan.totals.kcal).toBeCloseTo(800, 6);
    expect(plan.rates.carbsGPerHour).toBeCloseTo(50, 6);
    expect(plan.warnings).toEqual([]);
  });
});

describe("computeMultiProductPlan — exemple 2", () => {
  const plan = computeMultiProductPlan(
    multi({ products: [BARRE, GEL], shares: [50, 50] }),
  );

  it("partage le budget en deux", () => {
    expect(itemUnits(plan, "barre")).toBe(2);
    expect(itemUnits(plan, "gel")).toBe(2);
  });

  it("additionne les apports des deux produits", () => {
    expect(plan.totals.carbsG).toBeCloseTo(94, 6);
    expect(plan.totals.sodiumMg).toBeCloseTo(280, 6);
    expect(plan.totals.kcal).toBeCloseTo(600, 6);
    expect(plan.rates.carbsGPerHour).toBeCloseTo(47, 6);
  });
});

describe("computeMultiProductPlan — exemple 3", () => {
  it("donne 75 % du budget à A et 25 % à B", () => {
    const plan = computeMultiProductPlan(multi({ products: [BARRE, GEL], shares: [75, 25] }));

    expect(itemUnits(plan, "barre")).toBe(3);
    expect(itemUnits(plan, "gel")).toBe(1);
    expect(plan.totals.carbsG).toBeCloseTo(97, 6);
    expect(plan.totals.sodiumMg).toBeCloseTo(340, 6);
    expect(plan.totals.kcal).toBeCloseTo(700, 6);
  });
});

describe("computeMultiProductPlan — exemple 5", () => {
  const products = [BARRE, GEL, PATE];

  it("répartit en 33/33/34", () => {
    const plan = computeMultiProductPlan(multi({ products, shares: [33, 33, 34] }));

    expect(itemUnits(plan, "barre")).toBe(1);
    expect(itemUnits(plan, "gel")).toBe(1);
    expect(itemUnits(plan, "pate")).toBe(2);
    expect(plan.totals.carbsG).toBeCloseTo(83, 6);
    expect(plan.totals.sodiumMg).toBeCloseTo(140, 6);
    expect(plan.totals.kcal).toBeCloseTo(480, 6);
  });

  it("répartit en 50/25/25", () => {
    const plan = computeMultiProductPlan(multi({ products, shares: [50, 25, 25] }));

    expect(itemUnits(plan, "barre")).toBe(2);
    expect(itemUnits(plan, "gel")).toBe(1);
    expect(itemUnits(plan, "pate")).toBe(1);
    expect(plan.totals.carbsG).toBeCloseTo(90, 6);
    expect(plan.totals.sodiumMg).toBeCloseTo(240, 6);
    expect(plan.totals.kcal).toBeCloseTo(590, 6);
  });
});

describe("computeMultiProductPlan — exemple 6", () => {
  it("déduit la boisson du budget avant la répartition", () => {
    const plan = computeMultiProductPlan(
      multi({ products: [BARRE, GEL], shares: [50, 50], drink: DRINK }),
    );

    expect(plan.drink?.carbsG).toBeCloseTo(36, 6);
    expect(plan.drink?.sodiumMg).toBeCloseTo(576, 6);
    expect(itemUnits(plan, "barre")).toBe(1);
    expect(itemUnits(plan, "gel")).toBe(1);
    expect(plan.totals.carbsG).toBeCloseTo(83, 6);
    expect(plan.totals.sodiumMg).toBeCloseTo(716, 6);
    expect(plan.totals.kcal).toBeCloseTo(482.4, 6);
  });
});

describe("computeMultiProductPlan — exemple 7", () => {
  it("ne pose aucune limite sodium quand le produit n'en contient pas", () => {
    const plan = computeMultiProductPlan(multi({ products: [PATE], shares: [100] }));

    expect(itemUnits(plan, "pate")).toBe(6);
    expect(plan.items[0].limitingFactor).toBe("carbs");
    expect(plan.totals.sodiumMg).toBe(0);
  });
});

describe("computeMultiProductPlan — exemple 8", () => {
  it("alerte quand aucune unité ne rentre", () => {
    const barreLourde: Product = { ...BARRE, carbs: 100, weight: 120 };
    const plan = computeMultiProductPlan(
      multi({ minutes: 60, products: [barreLourde], shares: [100] }),
    );

    expect(plan.items[0].units).toBe(0);
    expect(plan.warnings).toContain(WARNING_NO_UNIT_FITS);
    expect(plan.totals.carbsG).toBe(0);
    expect(plan.totals.kcal).toBe(0);
  });

  it("reste silencieux sur les autres produits quand un seul n'a pas d'unité", () => {
    const plan = computeMultiProductPlan(
      multi({ minutes: 60, products: [BARRE, GEL], shares: [50, 50] }),
    );

    expect(itemUnits(plan, "gel")).toBe(1);
    expect(plan.warnings).not.toContain(WARNING_NO_UNIT_FITS);
  });
});

describe("computeMultiProductPlan — facteur limitant global", () => {
  it("suit le produit limité par le sodium", () => {
    const plan = computeMultiProductPlan(multi({ products: [{ ...BARRE, salt: 1 }], shares: [100] }));

    expect(plan.items[0].units).toBe(3);
    expect(plan.items[0].limitingFactor).toBe("sodium");
    expect(plan.limitingFactor).toBe("sodium");
  });

  it("suit le produit qui donne le moins d'unités", () => {
    const plan = computeMultiProductPlan(
      multi({ products: [BARRE, { ...GEL, carbs: 35 }], shares: [50, 50] }),
    );

    expect(itemUnits(plan, "barre")).toBe(2);
    expect(itemUnits(plan, "gel")).toBe(1);
    expect(plan.limitingFactor).toBe("carbs");
  });
});

describe("computeMultiProductPlan — exemple 15", () => {
  it("calcule uniquement avec la boisson quand aucun solide n'est sélectionné", () => {
    const plan = computeMultiProductPlan(multi({ products: [], shares: [], drink: DRINK }));

    expect(plan.items).toEqual([]);
    expect(plan.totals.carbsG).toBeCloseTo(36, 6);
    expect(plan.totals.sodiumMg).toBeCloseTo(576, 6);
    expect(plan.totals.kcal).toBeCloseTo(182.4, 6);
    expect(plan.rates.carbsGPerHour).toBeCloseTo(18, 6);
    expect(plan.warnings).not.toContain(WARNING_NO_UNIT_FITS);
  });
});

describe("buildMultiProductTimeline — exemple 2", () => {
  it("consomme A puis B en séquence", () => {
    const plan = computeMultiProductPlan(multi({ products: [BARRE, GEL], shares: [50, 50] }));
    const input: MultiTimelineInput = {
      minutes: 120,
      carbCap: 60,
      sodiumCap: 600,
      products: [BARRE, GEL],
      items: plan.items,
      order: "sequence",
      drink: plan.drink,
    };

    const timeline = buildMultiProductTimeline(input);
    const solids = timeline.events.filter((event) => event.kind === "solid");

    expect(solids.map((event) => event.productId)).toEqual(["barre", "barre", "gel", "gel"]);
    expect(solids.map((event) => event.minute)).toEqual([15, 45, 75, 105]);
    expect(solids[2].carbsG).toBeCloseTo(22, 6);
    expect(solids[2].sodiumMg).toBeCloseTo(40, 6);
    expect(timeline.series[timeline.series.length - 1].carbsG).toBeCloseTo(plan.totals.carbsG, 6);
  });
});

describe("buildMultiProductTimeline — exemple 4", () => {
  it("alterne A, B, A, B", () => {
    const plan = computeMultiProductPlan(multi({ products: [BARRE, GEL], shares: [50, 50] }));
    const timeline = buildMultiProductTimeline({
      minutes: 120,
      carbCap: 60,
      sodiumCap: 600,
      products: [BARRE, GEL],
      items: plan.items,
      order: "alternate",
      drink: plan.drink,
    });
    const solids = timeline.events.filter((event) => event.kind === "solid");

    expect(solids.map((event) => event.productId)).toEqual(["barre", "gel", "barre", "gel"]);
  });
});

describe("buildMultiProductTimeline — exemple 9", () => {
  it("inverse l'ordre quand on déplace A et B", () => {
    const plan = computeMultiProductPlan(multi({ products: [BARRE, GEL], shares: [50, 50] }));
    const reversed: MultiTimelineInput = {
      minutes: 120,
      carbCap: 60,
      sodiumCap: 600,
      products: [GEL, BARRE],
      items: [plan.items[1], plan.items[0]],
      order: "sequence",
      drink: plan.drink,
    };

    const timeline = buildMultiProductTimeline(reversed);
    const solids = timeline.events.filter((event) => event.kind === "solid");

    expect(solids.map((event) => event.productId)).toEqual(["gel", "gel", "barre", "barre"]);
  });
});

describe("buildMultiProductTimeline — boisson", () => {
  it("place les gorgées et les prises solides dans l'ordre des minutes", () => {
    const plan = computeMultiProductPlan(multi({ products: [BARRE], drink: DRINK }));
    const timeline = buildMultiProductTimeline({
      minutes: 120,
      carbCap: 60,
      sodiumCap: 600,
      products: [BARRE],
      items: plan.items,
      order: "sequence",
      drink: plan.drink,
    });

    expect(timeline.events.filter((event) => event.kind === "drink")).toHaveLength(8);
    expect(timeline.events.filter((event) => event.kind === "solid")).toHaveLength(3);
    const minutes = timeline.events.map((event) => event.minute);
    expect(minutes).toEqual([...minutes].sort((a, b) => a - b));
    expect(timeline.capLines.carbsG.to.value).toBeCloseTo(120, 6);
  });
});
