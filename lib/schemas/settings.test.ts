import { describe, expect, it } from "vitest";

import { settingsFormSchema } from "@/lib/schemas/settings";

const VALID = {
  profile: {
    sex: "male",
    age: "30",
    weightKg: "70",
    heightCm: "175",
  },
  activityIndex: 1,
  athlete: {
    vmaKmh: "",
    pmaWatts: "",
    hasBike: false,
    bikeKg: "",
    bikePosition: "hoods",
  },
};

describe("settingsFormSchema", () => {
  it("accepte des paramètres valides sans vélo (exemple 1)", () => {
    expect(settingsFormSchema.safeParse(VALID).success).toBe(true);
  });

  it("signale l'âge hors bornes sous profile.age (exemple 2)", () => {
    const result = settingsFormSchema.safeParse({
      ...VALID,
      profile: { ...VALID.profile, age: "9" },
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    const issue = result.error.issues.find(
      (entry) => entry.path.join(".") === "profile.age",
    );
    expect(issue?.path).toEqual(["profile", "age"]);
    expect(issue?.message).toBe("L'âge doit être entre 10 et 100 ans.");
  });

  it("signale le poids du vélo manquant sous athlete.bikeKg (exemple 3)", () => {
    const result = settingsFormSchema.safeParse({
      ...VALID,
      athlete: { ...VALID.athlete, hasBike: true, bikeKg: "" },
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    const issue = result.error.issues.find(
      (entry) => entry.path.join(".") === "athlete.bikeKg",
    );
    expect(issue?.path).toEqual(["athlete", "bikeKg"]);
    expect(issue?.message).toBe("Le poids du vélo est obligatoire.");
  });

  it("refuse une position de vélo inconnue (exemple 4)", () => {
    const values: unknown = {
      ...VALID,
      athlete: { ...VALID.athlete, bikePosition: "x" },
    };

    expect(settingsFormSchema.safeParse(values).success).toBe(false);
  });
});
