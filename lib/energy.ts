export type Sex = "male" | "female";

export type ActivityLevel = {
  label: string;
  /** Multiplicateur appliqué au métabolisme de base. */
  coefficient: number;
};

export const ACTIVITY_LEVELS: readonly ActivityLevel[] = [
  { label: "Sédentaire", coefficient: 1.2 },
  { label: "Léger", coefficient: 1.375 },
  { label: "Modéré", coefficient: 1.55 },
  { label: "Actif", coefficient: 1.725 },
  { label: "Très actif", coefficient: 1.9 },
];

/** Palier par défaut du slider : Léger. */
export const DEFAULT_ACTIVITY_INDEX = 1;

export const AGE_MIN = 10;
export const AGE_MAX = 100;
export const WEIGHT_KG_MIN = 30;
export const WEIGHT_KG_MAX = 300;
export const HEIGHT_CM_MIN = 100;
export const HEIGHT_CM_MAX = 250;
export const MINUTES_MAX = 1440;

/** Valeurs brutes du formulaire : tout arrive en texte depuis les champs. */
export type EnergyFormValues = {
  sex: Sex | "";
  age: string;
  weightKg: string;
  heightCm: string;
  sportId: string;
  minutes: string;
};

export type EnergyField = keyof EnergyFormValues;

export type FieldErrors = Partial<Record<EnergyField, string>>;

export type BmrProfile = {
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
};

export type EnergyResults = {
  bmr: number;
  tdee: number;
  effortKcal: number;
  effortShare: number;
};

/** Lit un nombre saisi à la française (« 70,5 » comme « 70.5 »). */
export function parseDecimal(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (normalized === "") {
    return null;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** BMR selon Mifflin-St Jeor, sans arrondi. */
export function computeBmr({ sex, age, weightKg, heightCm }: BmrProfile): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

/** Dépense énergétique journalière, sans arrondi. */
export function computeTdee(bmr: number, activityCoefficient: number): number {
  return bmr * activityCoefficient;
}

/** kcal brûlées par l'effort, sans arrondi. */
export function computeEffortKcal(met: number, weightKg: number, minutes: number): number {
  return met * weightKg * (minutes / 60);
}

/** Part de l'effort dans la dépense journalière, en pourcentage, sans arrondi. */
export function computeEffortShare(effortKcal: number, tdee: number): number {
  if (tdee <= 0) {
    return 0;
  }
  return (effortKcal / tdee) * 100;
}

/** Valide chaque champ et retourne une erreur lisible par champ invalide. */
export function validateInputs(values: EnergyFormValues): FieldErrors {
  const errors: FieldErrors = {};

  if (values.sex !== "male" && values.sex !== "female") {
    errors.sex = "Choisis un sexe.";
  }

  const age = parseDecimal(values.age);
  if (age === null) {
    errors.age = "L'âge est obligatoire.";
  } else if (!Number.isInteger(age)) {
    errors.age = "L'âge doit être un nombre entier.";
  } else if (age < AGE_MIN || age > AGE_MAX) {
    errors.age = `L'âge doit être entre ${AGE_MIN} et ${AGE_MAX} ans.`;
  }

  const weightKg = parseDecimal(values.weightKg);
  if (weightKg === null) {
    errors.weightKg = "Le poids est obligatoire.";
  } else if (weightKg < WEIGHT_KG_MIN || weightKg > WEIGHT_KG_MAX) {
    errors.weightKg = `Le poids doit être entre ${WEIGHT_KG_MIN} et ${WEIGHT_KG_MAX} kg.`;
  }

  const heightCm = parseDecimal(values.heightCm);
  if (heightCm === null) {
    errors.heightCm = "La taille est obligatoire.";
  } else if (heightCm < HEIGHT_CM_MIN || heightCm > HEIGHT_CM_MAX) {
    errors.heightCm = `La taille doit être entre ${HEIGHT_CM_MIN} et ${HEIGHT_CM_MAX} cm.`;
  }

  if (values.sportId.trim() === "") {
    errors.sportId = "Choisis un sport.";
  }

  const minutes = parseDecimal(values.minutes);
  if (minutes === null) {
    errors.minutes = "La durée est obligatoire.";
  } else if (minutes <= 0 || minutes > MINUTES_MAX) {
    errors.minutes = `La durée doit être entre 1 et ${MINUTES_MAX} minutes.`;
  }

  return errors;
}

/**
 * Enchaîne les formules pour le formulaire complet.
 * Retourne null si une valeur est inexploitable : les formules ne vivent pas dans le JSX.
 */
export function computeEnergyResults(
  values: EnergyFormValues,
  activityCoefficient: number,
  met: number,
): EnergyResults | null {
  const age = parseDecimal(values.age);
  const weightKg = parseDecimal(values.weightKg);
  const heightCm = parseDecimal(values.heightCm);
  const minutes = parseDecimal(values.minutes);

  if (
    (values.sex !== "male" && values.sex !== "female") ||
    age === null ||
    weightKg === null ||
    heightCm === null ||
    minutes === null
  ) {
    return null;
  }

  const bmr = computeBmr({ sex: values.sex, age, weightKg, heightCm });
  const tdee = computeTdee(bmr, activityCoefficient);
  const effortKcal = computeEffortKcal(met, weightKg, minutes);

  return {
    bmr,
    tdee,
    effortKcal,
    effortShare: computeEffortShare(effortKcal, tdee),
  };
}
