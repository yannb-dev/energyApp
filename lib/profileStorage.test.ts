import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearProfile,
  loadProfile,
  PROFILE_STORAGE_KEY,
  saveProfile,
  type ProfileSettings,
} from "@/lib/profileStorage";

const PROFILE: ProfileSettings = {
  sex: "female",
  age: "35",
  weightKg: "65",
  heightCm: "168",
  activityIndex: 2,
};

function store(value: unknown) {
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(value));
}

describe("profileStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("utilise la clé de la SPEC", () => {
    expect(PROFILE_STORAGE_KEY).toBe("kcalapp:profile:v1");
  });

  it("fait un aller-retour complet (exemple 3)", () => {
    saveProfile(PROFILE);

    expect(loadProfile()).toEqual(PROFILE);
  });

  it("accepte les valeurs décimales à la française (exemple 3)", () => {
    const profile: ProfileSettings = { ...PROFILE, weightKg: "62,5" };
    saveProfile(profile);

    expect(loadProfile()).toEqual(profile);
  });

  it("retourne null quand rien n'est enregistré (exemple 4)", () => {
    expect(loadProfile()).toBeNull();
  });

  it("retourne null pour un JSON invalide (exemple 4)", () => {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, "{ceci n'est pas du json");

    expect(loadProfile()).toBeNull();
  });

  it("retourne null pour un âge hors bornes (exemple 4)", () => {
    store({ ...PROFILE, age: "9" });

    expect(loadProfile()).toBeNull();
  });

  it("retourne null pour un sexe inconnu (exemple 4)", () => {
    store({ ...PROFILE, sex: "autre" });

    expect(loadProfile()).toBeNull();
  });

  it("retourne null pour un activityIndex hors bornes ou non entier (exemple 4)", () => {
    for (const activityIndex of [9, 1.5, -1]) {
      store({ ...PROFILE, activityIndex });
      expect(loadProfile()).toBeNull();
    }
  });

  it("retourne null pour un champ manquant (exemple 4)", () => {
    const { heightCm, ...incomplet } = PROFILE;
    expect(heightCm).toBe("168");
    store(incomplet);

    expect(loadProfile()).toBeNull();
  });

  it("retourne null pour un poids ou une taille hors bornes (exemple 4)", () => {
    store({ ...PROFILE, weightKg: "29" });
    expect(loadProfile()).toBeNull();

    store({ ...PROFILE, heightCm: "251" });
    expect(loadProfile()).toBeNull();
  });

  it("ne lève pas quand localStorage lève à la lecture (exemple 5)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("stockage indisponible");
    });

    expect(() => loadProfile()).not.toThrow();
    expect(loadProfile()).toBeNull();
  });

  it("ne lève pas quand localStorage lève à l'écriture (exemple 5)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota dépassé");
    });

    expect(() => saveProfile(PROFILE)).not.toThrow();
  });

  it("supprime la clé avec clearProfile (exemple 6)", () => {
    saveProfile(PROFILE);
    expect(window.localStorage.getItem(PROFILE_STORAGE_KEY)).not.toBeNull();

    clearProfile();

    expect(window.localStorage.getItem(PROFILE_STORAGE_KEY)).toBeNull();
    expect(loadProfile()).toBeNull();
  });

  it("ne lève pas quand localStorage lève à l'effacement (exemple 5)", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("stockage indisponible");
    });

    expect(() => clearProfile()).not.toThrow();
  });
});
