import { parseDecimal } from "@/lib/energy";

export const CARB_CAP_DEFAULT_G_PER_HOUR = 60;
export const CARB_CAP_MIN = 20;
export const CARB_CAP_MAX = 120;

export const SODIUM_CAP_DEFAULT_MG_PER_HOUR = 600;
export const SODIUM_CAP_MIN = 100;
export const SODIUM_CAP_MAX = 1500;

/** Repères usuels affichés sous les champs de plafond. */
export const CARB_CAP_RECOMMENDED = { min: 30, max: 90 };
export const SODIUM_CAP_RECOMMENDED = { min: 300, max: 1000 };

export const MINUTES_MIN = 1;
export const MINUTES_MAX = 1440;

export const PRODUCT_TYPES = ["Barre", "Gel", "Compote", "Pâte de fruits", "Autre"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const TEXT_MAX_LENGTH = 50;

export const PRODUCT_KCAL_MIN = 0;
export const PRODUCT_KCAL_MAX = 1000;
export const PRODUCT_SALT_MIN = 0;
export const PRODUCT_SALT_MAX = 5;
export const PRODUCT_WEIGHT_MIN = 1;
export const PRODUCT_WEIGHT_MAX = 500;

export const DRINK_CONCENTRATION_MIN = 1;
export const DRINK_CONCENTRATION_MAX = 150;
export const DRINK_KCAL_MIN = 0;
export const DRINK_KCAL_MAX = 500;
export const DRINK_CARBS_MAX = 100;
export const DRINK_SALT_MIN = 0;
export const DRINK_SALT_MAX = 100;

/** 1 g de sel apporte 400 mg de sodium. */
export const SODIUM_MG_PER_GRAM_SALT = 400;

/** Une prise de boisson toutes les 15 min, 150 ml par prise. */
export const DRINK_SERVING_ML = 150;
export const DRINK_INTERVAL_MINUTES = 15;

/** Plafond hydrique : constante de l'application, jamais saisie ni stockée. */
export const HYDRATION_CAP_ML_PER_HOUR = 750;
export const HYDRATION_CAP_RECOMMENDED = { min: 400, max: 800 };

/** Échelle de la timeline verticale : 20 px par tranche de 10 min. */
export const TIMELINE_PX_PER_10_MIN = 20;

export const WARNING_DRINK_CONCENTRATION = "Réduis la concentration de la boisson.";
export const WARNING_NO_UNIT_FITS = "Une unité dépasserait le plafond.";

export type NutritionFormValues = {
  carbCap: string;
  sodiumCap: string;
  minutes: string;
  productBrand: string;
  productName: string;
  productType: ProductType | "";
  productKcal: string;
  productCarbs: string;
  productSalt: string;
  productWeight: string;
  drinkEnabled: boolean;
  drinkBrand: string;
  drinkName: string;
  drinkConcentration: string;
  drinkKcalPer100: string;
  drinkCarbsPer100: string;
  drinkSaltPer100: string;
};

export type NutritionField = Exclude<keyof NutritionFormValues, "drinkEnabled">;

export type NutritionFieldErrors = Partial<Record<NutritionField, string>>;

export const DEFAULT_NUTRITION_VALUES: NutritionFormValues = {
  carbCap: String(CARB_CAP_DEFAULT_G_PER_HOUR),
  sodiumCap: String(SODIUM_CAP_DEFAULT_MG_PER_HOUR),
  minutes: "",
  productBrand: "",
  productName: "",
  productType: "",
  productKcal: "",
  productCarbs: "",
  productSalt: "",
  productWeight: "",
  drinkEnabled: false,
  drinkBrand: "",
  drinkName: "",
  drinkConcentration: "",
  drinkKcalPer100: "",
  drinkCarbsPer100: "",
  drinkSaltPer100: "",
};

export type DrinkIntake = {
  servings: number;
  volumeMl: number;
  powderG: number;
  carbsG: number;
  kcal: number;
  sodiumMg: number;
};

export type NutritionPlan = {
  units: number;
  limitingFactor: "carbs" | "sodium";
  limits: { unitsByCarbs: number; unitsBySodium: number };
  budgets: { carbsG: number; sodiumMg: number };
  drink: DrinkIntake | null;
  totals: { carbsG: number; sodiumMg: number; kcal: number };
  rates: { carbsGPerHour: number; sodiumMgPerHour: number };
  intervalMinutes: number | null;
  warnings: string[];
};

function rangeMessage(label: string, min: number, max: number, unit: string): string {
  return `${label} : la valeur doit être entre ${min} et ${max} ${unit}.`;
}

function textError(raw: string, label: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return `${label} est obligatoire.`;
  }
  if (trimmed.length > TEXT_MAX_LENGTH) {
    return `${label} ne doit pas dépasser ${TEXT_MAX_LENGTH} caractères.`;
  }
  return null;
}

function isProductType(value: string): value is ProductType {
  return (PRODUCT_TYPES as readonly string[]).includes(value);
}

/** Valide chaque champ ; les champs de la boisson sont ignorés si la case est décochée. */
export function validateNutritionInputs(values: NutritionFormValues): NutritionFieldErrors {
  const errors: NutritionFieldErrors = {};

  const carbCap = parseDecimal(values.carbCap);
  if (carbCap === null) {
    errors.carbCap = "Les glucides max sont obligatoires.";
  } else if (carbCap < CARB_CAP_MIN || carbCap > CARB_CAP_MAX) {
    errors.carbCap = rangeMessage("Les glucides max", CARB_CAP_MIN, CARB_CAP_MAX, "g/h");
  }

  const sodiumCap = parseDecimal(values.sodiumCap);
  if (sodiumCap === null) {
    errors.sodiumCap = "Le sodium max est obligatoire.";
  } else if (sodiumCap < SODIUM_CAP_MIN || sodiumCap > SODIUM_CAP_MAX) {
    errors.sodiumCap = rangeMessage("Le sodium max", SODIUM_CAP_MIN, SODIUM_CAP_MAX, "mg/h");
  }

  const minutes = parseDecimal(values.minutes);
  if (minutes === null) {
    errors.minutes = "La durée de l'effort est obligatoire.";
  } else if (minutes < MINUTES_MIN || minutes > MINUTES_MAX) {
    errors.minutes = rangeMessage("La durée de l'effort", MINUTES_MIN, MINUTES_MAX, "minutes");
  }

  const productBrandError = textError(values.productBrand, "La marque");
  if (productBrandError) {
    errors.productBrand = productBrandError;
  }

  const productNameError = textError(values.productName, "Le nom du produit");
  if (productNameError) {
    errors.productName = productNameError;
  }

  if (!isProductType(values.productType)) {
    errors.productType = "Choisis un type de produit.";
  }

  const productKcal = parseDecimal(values.productKcal);
  if (productKcal === null) {
    errors.productKcal = "L'énergie de l'unité est obligatoire.";
  } else if (productKcal < PRODUCT_KCAL_MIN || productKcal > PRODUCT_KCAL_MAX) {
    errors.productKcal = rangeMessage(
      "L'énergie de l'unité",
      PRODUCT_KCAL_MIN,
      PRODUCT_KCAL_MAX,
      "kcal",
    );
  }

  const productWeight = parseDecimal(values.productWeight);
  if (productWeight === null) {
    errors.productWeight = "Le poids de l'unité est obligatoire.";
  } else if (productWeight < PRODUCT_WEIGHT_MIN || productWeight > PRODUCT_WEIGHT_MAX) {
    errors.productWeight = rangeMessage(
      "Le poids de l'unité",
      PRODUCT_WEIGHT_MIN,
      PRODUCT_WEIGHT_MAX,
      "g",
    );
  }

  const productCarbs = parseDecimal(values.productCarbs);
  if (productCarbs === null) {
    errors.productCarbs = "Les glucides de l'unité sont obligatoires.";
  } else if (productCarbs <= 0 || (productWeight !== null && productCarbs > productWeight)) {
    errors.productCarbs =
      "Les glucides de l'unité doivent être supérieurs à 0 et ne pas dépasser le poids de l'unité.";
  }

  const productSalt = parseDecimal(values.productSalt);
  if (productSalt === null) {
    errors.productSalt = "Le sel de l'unité est obligatoire.";
  } else if (productSalt < PRODUCT_SALT_MIN || productSalt > PRODUCT_SALT_MAX) {
    errors.productSalt = rangeMessage("Le sel de l'unité", PRODUCT_SALT_MIN, PRODUCT_SALT_MAX, "g");
  }

  if (values.drinkEnabled) {
    const drinkBrandError = textError(values.drinkBrand, "La marque de la boisson");
    if (drinkBrandError) {
      errors.drinkBrand = drinkBrandError;
    }

    const drinkNameError = textError(values.drinkName, "Le nom de la boisson");
    if (drinkNameError) {
      errors.drinkName = drinkNameError;
    }

    const concentration = parseDecimal(values.drinkConcentration);
    if (concentration === null) {
      errors.drinkConcentration = "La concentration est obligatoire.";
    } else if (concentration < DRINK_CONCENTRATION_MIN || concentration > DRINK_CONCENTRATION_MAX) {
      errors.drinkConcentration = rangeMessage(
        "La concentration",
        DRINK_CONCENTRATION_MIN,
        DRINK_CONCENTRATION_MAX,
        "g/L",
      );
    }

    const drinkKcal = parseDecimal(values.drinkKcalPer100);
    if (drinkKcal === null) {
      errors.drinkKcalPer100 = "L'énergie pour 100 g de poudre est obligatoire.";
    } else if (drinkKcal < DRINK_KCAL_MIN || drinkKcal > DRINK_KCAL_MAX) {
      errors.drinkKcalPer100 = rangeMessage(
        "L'énergie pour 100 g de poudre",
        DRINK_KCAL_MIN,
        DRINK_KCAL_MAX,
        "kcal",
      );
    }

    const drinkCarbs = parseDecimal(values.drinkCarbsPer100);
    if (drinkCarbs === null) {
      errors.drinkCarbsPer100 = "Les glucides pour 100 g de poudre sont obligatoires.";
    } else if (drinkCarbs <= 0 || drinkCarbs > DRINK_CARBS_MAX) {
      errors.drinkCarbsPer100 =
        "Les glucides pour 100 g de poudre doivent être supérieurs à 0 et au plus 100 g.";
    }

    const drinkSalt = parseDecimal(values.drinkSaltPer100);
    if (drinkSalt === null) {
      errors.drinkSaltPer100 = "Le sel pour 100 g de poudre est obligatoire.";
    } else if (drinkSalt < DRINK_SALT_MIN || drinkSalt > DRINK_SALT_MAX) {
      errors.drinkSaltPer100 = rangeMessage(
        "Le sel pour 100 g de poudre",
        DRINK_SALT_MIN,
        DRINK_SALT_MAX,
        "g",
      );
    }
  }

  return errors;
}

/** Plan de nutrition complet, ou null si le formulaire contient une erreur. */
export function computeNutritionPlan(values: NutritionFormValues): NutritionPlan | null {
  if (Object.keys(validateNutritionInputs(values)).length > 0) {
    return null;
  }

  const carbCap = parseDecimal(values.carbCap);
  const sodiumCap = parseDecimal(values.sodiumCap);
  const minutes = parseDecimal(values.minutes);
  const productKcal = parseDecimal(values.productKcal);
  const productCarbs = parseDecimal(values.productCarbs);
  const productSalt = parseDecimal(values.productSalt);

  if (
    carbCap === null ||
    sodiumCap === null ||
    minutes === null ||
    productKcal === null ||
    productCarbs === null ||
    productSalt === null
  ) {
    return null;
  }

  const hours = minutes / 60;

  let drink: DrinkIntake | null = null;
  if (values.drinkEnabled) {
    const concentration = parseDecimal(values.drinkConcentration) ?? 0;
    const drinkKcalPer100 = parseDecimal(values.drinkKcalPer100) ?? 0;
    const drinkCarbsPer100 = parseDecimal(values.drinkCarbsPer100) ?? 0;
    const drinkSaltPer100 = parseDecimal(values.drinkSaltPer100) ?? 0;

    const servings = Math.floor(minutes / DRINK_INTERVAL_MINUTES);
    const volumeMl = servings * DRINK_SERVING_ML;
    const powderG = (volumeMl * concentration) / 1000;

    drink = {
      servings,
      volumeMl,
      powderG,
      carbsG: (powderG * drinkCarbsPer100) / 100,
      kcal: (powderG * drinkKcalPer100) / 100,
      sodiumMg: (powderG * drinkSaltPer100 * SODIUM_MG_PER_GRAM_SALT) / 100,
    };
  }

  const drinkCarbs = drink?.carbsG ?? 0;
  const drinkSodium = drink?.sodiumMg ?? 0;
  const drinkKcal = drink?.kcal ?? 0;

  const carbsBudget = Math.max(0, carbCap * hours - drinkCarbs);
  const sodiumBudget = Math.max(0, sodiumCap * hours - drinkSodium);

  const unitSodium = productSalt * SODIUM_MG_PER_GRAM_SALT;
  const unitsByCarbs = Math.floor(carbsBudget / productCarbs);
  const unitsBySodium =
    unitSodium > 0 ? Math.floor(sodiumBudget / unitSodium) : Number.POSITIVE_INFINITY;

  const units = Math.min(unitsByCarbs, unitsBySodium);
  const limitingFactor: "carbs" | "sodium" = unitsByCarbs <= unitsBySodium ? "carbs" : "sodium";

  const warnings: string[] = [];
  if (drink && (drink.carbsG / hours > carbCap || drink.sodiumMg / hours > sodiumCap)) {
    warnings.push(WARNING_DRINK_CONCENTRATION);
  }
  if (units === 0 && carbsBudget > 0) {
    warnings.push(WARNING_NO_UNIT_FITS);
  }

  return {
    units,
    limitingFactor,
    limits: { unitsByCarbs, unitsBySodium },
    budgets: { carbsG: carbsBudget, sodiumMg: sodiumBudget },
    drink,
    totals: {
      carbsG: drinkCarbs + units * productCarbs,
      sodiumMg: drinkSodium + units * unitSodium,
      kcal: drinkKcal + units * productKcal,
    },
    rates: {
      carbsGPerHour: (drinkCarbs + units * productCarbs) / hours,
      sodiumMgPerHour: (drinkSodium + units * unitSodium) / hours,
    },
    intervalMinutes: units > 0 ? minutes / units : null,
    warnings,
  };
}

/** Une prise de la timeline : boisson (gorgée) ou solide (unité du produit). */
export type TimelineEvent = {
  minute: number;
  kind: "drink" | "solid";
  carbsG: number;
  sodiumMg: number;
};

/** Point de la courbe cumulée, en glucides et en sodium. */
export type TimelinePoint = {
  minute: number;
  carbsG: number;
  sodiumMg: number;
};

/** Extrémité d'une droite de plafond. */
export type TimelineCapPoint = {
  minute: number;
  value: number;
};

/** Droite de plafond : du départ (0) à la fin de l'effort. */
export type TimelineCapLine = {
  from: TimelineCapPoint;
  to: TimelineCapPoint;
};

export type NutritionTimeline = {
  minutes: number;
  events: TimelineEvent[];
  series: TimelinePoint[];
  capLines: { carbsG: TimelineCapLine; sodiumMg: TimelineCapLine };
};

/** Part du plafond consommée : ratio = valeur / plafond. */
export function computeCapUsage(value: number, cap: number): { ratio: number; exceeded: boolean } {
  return { ratio: value / cap, exceeded: value > cap };
}

/** Données du graphe : prises échelonnées, cumuls et droites de plafond. */
export function buildNutritionTimeline(
  values: NutritionFormValues,
  plan: NutritionPlan,
): NutritionTimeline {
  const minutes = parseDecimal(values.minutes) ?? 0;
  const carbCap = parseDecimal(values.carbCap) ?? 0;
  const sodiumCap = parseDecimal(values.sodiumCap) ?? 0;
  const productCarbs = parseDecimal(values.productCarbs) ?? 0;
  const productSalt = parseDecimal(values.productSalt) ?? 0;

  const events: TimelineEvent[] = [];

  // Boisson : une prise toutes les 15 min, k = 1…servings.
  if (plan.drink && plan.drink.servings > 0) {
    const carbsPerServing = plan.drink.carbsG / plan.drink.servings;
    const sodiumPerServing = plan.drink.sodiumMg / plan.drink.servings;
    for (let index = 1; index <= plan.drink.servings; index += 1) {
      events.push({
        minute: DRINK_INTERVAL_MINUTES * index,
        kind: "drink",
        carbsG: carbsPerServing,
        sodiumMg: sodiumPerServing,
      });
    }
  }

  // Solide : prises réparties au milieu de chaque intervalle (minutes × (i + 0,5) / units).
  for (let index = 0; index < plan.units; index += 1) {
    events.push({
      minute: (minutes * (index + 0.5)) / plan.units,
      kind: "solid",
      carbsG: productCarbs,
      sodiumMg: productSalt * SODIUM_MG_PER_GRAM_SALT,
    });
  }

  events.sort((first, second) => first.minute - second.minute);

  const series: TimelinePoint[] = [{ minute: 0, carbsG: 0, sodiumMg: 0 }];
  let carbsG = 0;
  let sodiumMg = 0;
  for (const event of events) {
    carbsG += event.carbsG;
    sodiumMg += event.sodiumMg;
    series.push({ minute: event.minute, carbsG, sodiumMg });
  }
  if (series[series.length - 1].minute < minutes) {
    series.push({ minute: minutes, carbsG, sodiumMg });
  }

  const hours = minutes / 60;

  return {
    minutes,
    events,
    series,
    capLines: {
      carbsG: {
        from: { minute: 0, value: 0 },
        to: { minute: minutes, value: carbCap * hours },
      },
      sodiumMg: {
        from: { minute: 0, value: 0 },
        to: { minute: minutes, value: sodiumCap * hours },
      },
    },
  };
}

/** Débit de boisson en ml/h ; 0 sans boisson ou sans durée. */
export function computeHydrationRate(plan: NutritionPlan, minutes: number): number {
  if (!plan.drink || minutes <= 0) {
    return 0;
  }
  return plan.drink.volumeMl / (minutes / 60);
}

/** Position verticale d'une minute sur l'axe de la timeline, en pixels. */
export function timelineOffsetPx(minute: number): number {
  return (minute / 10) * TIMELINE_PX_PER_10_MIN;
}
