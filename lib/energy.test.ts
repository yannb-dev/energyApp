import { describe, expect, it } from "vitest";

import {
  ACTIVITY_LEVELS,
  computeBmr,
  computeEffortKcal,
  computeEffortShare,
  computeTdee,
  DEFAULT_ACTIVITY_INDEX,
  validateInputs,
  type EnergyFormValues,
} from "@/lib/energy";

const validValues: EnergyFormValues = {
  sex: "male",
  age: "30",
  weightKg: "70",
  heightCm: "175",
  sportId: "course-8",
  minutes: "30",
};

describe("computeBmr (Mifflin-St Jeor)", () => {
  it("calcule 1648,75 pour un homme de 30 ans, 70 kg, 175 cm", () => {
    const bmr = computeBmr({ sex: "male", age: 30, weightKg: 70, heightCm: 175 });
    expect(bmr).toBeCloseTo(1648.75, 10);
  });

  it("calcule 1320,25 pour une femme de 30 ans, 60 kg, 165 cm", () => {
    const bmr = computeBmr({ sex: "female", age: 30, weightKg: 60, heightCm: 165 });
    expect(bmr).toBeCloseTo(1320.25, 10);
  });

  it("n'arrondit pas le résultat", () => {
    const bmr = computeBmr({ sex: "female", age: 41, weightKg: 58.4, heightCm: 162.5 });
    expect(bmr).not.toBe(Math.round(bmr));
  });
});

describe("computeTdee", () => {
  it("multiplie le métabolisme de base par le coefficient d'activité", () => {
    expect(computeTdee(1648.75, 1.55)).toBeCloseTo(2555.5625, 10);
  });

  it("donne un TDEE d'autant plus élevé que le coefficient augmente", () => {
    const bmr = 1648.75;
    const sedentary = computeTdee(bmr, ACTIVITY_LEVELS[0].coefficient);
    const veryActive = computeTdee(bmr, ACTIVITY_LEVELS[4].coefficient);
    expect(veryActive).toBeGreaterThan(sedentary);
  });
});

describe("ACTIVITY_LEVELS", () => {
  it("propose les 5 paliers de la SPEC", () => {
    expect(ACTIVITY_LEVELS).toHaveLength(5);
    expect(ACTIVITY_LEVELS.map((level) => level.label)).toEqual([
      "Sédentaire",
      "Léger",
      "Modéré",
      "Actif",
      "Très actif",
    ]);
    expect(ACTIVITY_LEVELS.map((level) => level.coefficient)).toEqual([
      1.2, 1.375, 1.55, 1.725, 1.9,
    ]);
  });

  it("a pour défaut le palier Léger", () => {
    expect(ACTIVITY_LEVELS[DEFAULT_ACTIVITY_INDEX].label).toBe("Léger");
  });
});

describe("computeEffortKcal", () => {
  it("calcule 290,5 kcal pour la course 8 km/h, 70 kg, 30 min", () => {
    expect(computeEffortKcal(8.3, 70, 30)).toBeCloseTo(290.5, 10);
  });

  it("double les kcal quand la durée double", () => {
    const trenteMinutes = computeEffortKcal(6, 80, 30);
    const uneHeure = computeEffortKcal(6, 80, 60);
    expect(uneHeure).toBeCloseTo(trenteMinutes * 2, 10);
  });
});

describe("computeEffortShare", () => {
  it("exprime l'effort en pourcentage du TDEE", () => {
    expect(computeEffortShare(290.5, 2555.5625)).toBeCloseTo(11.3673, 3);
  });

  it("vaut 100 % quand l'effort couvre la dépense journalière", () => {
    expect(computeEffortShare(2000, 2000)).toBeCloseTo(100, 10);
  });
});

describe("validateInputs", () => {
  it("ne retourne aucune erreur pour un formulaire complet et valide", () => {
    expect(validateInputs(validValues)).toEqual({});
  });

  it("exige le sexe", () => {
    const errors = validateInputs({ ...validValues, sex: "" });
    expect(errors.sex).toBeTruthy();
  });

  it("exige l'âge, entier, entre 10 et 100", () => {
    expect(validateInputs({ ...validValues, age: "" }).age).toBeTruthy();
    expect(validateInputs({ ...validValues, age: "9" }).age).toMatch(/entre 10 et 100/);
    expect(validateInputs({ ...validValues, age: "101" }).age).toMatch(/entre 10 et 100/);
    expect(validateInputs({ ...validValues, age: "30.5" }).age).toMatch(/entier/);
    expect(validateInputs({ ...validValues, age: "abc" }).age).toBeTruthy();
  });

  it("exige un poids entre 30 et 300 kg", () => {
    expect(validateInputs({ ...validValues, weightKg: "" }).weightKg).toBeTruthy();
    expect(validateInputs({ ...validValues, weightKg: "29" }).weightKg).toMatch(/entre 30 et 300/);
    expect(validateInputs({ ...validValues, weightKg: "301" }).weightKg).toMatch(/entre 30 et 300/);
    expect(validateInputs({ ...validValues, weightKg: "0" }).weightKg).toBeTruthy();
  });

  it("exige une taille entre 100 et 250 cm", () => {
    expect(validateInputs({ ...validValues, heightCm: "" }).heightCm).toBeTruthy();
    expect(validateInputs({ ...validValues, heightCm: "99" }).heightCm).toMatch(/entre 100 et 250/);
    expect(validateInputs({ ...validValues, heightCm: "251" }).heightCm).toMatch(/entre 100 et 250/);
  });

  it("exige une durée supérieure à 0 et au plus 1440 minutes", () => {
    expect(validateInputs({ ...validValues, minutes: "" }).minutes).toBeTruthy();
    expect(validateInputs({ ...validValues, minutes: "0" }).minutes).toMatch(/entre 1 et 1440/);
    expect(validateInputs({ ...validValues, minutes: "-5" }).minutes).toMatch(/entre 1 et 1440/);
    expect(validateInputs({ ...validValues, minutes: "1441" }).minutes).toMatch(/entre 1 et 1440/);
    expect(validateInputs({ ...validValues, minutes: "1440" }).minutes).toBeUndefined();
  });

  it("exige un sport", () => {
    expect(validateInputs({ ...validValues, sportId: "" }).sportId).toBeTruthy();
  });

  it("cumule les erreurs champ par champ", () => {
    const errors = validateInputs({
      sex: "",
      age: "",
      weightKg: "10",
      heightCm: "300",
      sportId: "",
      minutes: "",
    });
    expect(Object.keys(errors).sort()).toEqual(
      ["age", "heightCm", "minutes", "sex", "sportId", "weightKg"].sort(),
    );
  });
});
