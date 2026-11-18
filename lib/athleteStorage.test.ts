import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ATHLETE_STORAGE_KEY,
  clearAthlete,
  EMPTY_ATHLETE,
  loadAthlete,
  saveAthlete,
  validateAthlete,
  type AthleteSettings,
} from "@/lib/athleteStorage";

const ATHLETE: AthleteSettings = {
  vmaKmh: "16,5",
  pmaWatts: "250",
  hasBike: true,
  bikeKg: "8",
  bikePosition: "hoods",
};

function store(value: unknown) {
  window.localStorage.setItem(ATHLETE_STORAGE_KEY, JSON.stringify(value));
}

describe("athleteStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("utilise une clé séparée du profil", () => {
    expect(ATHLETE_STORAGE_KEY).toBe("kcalapp:athlete:v1");
  });

  it("part d'un athlète vide, position « Mains en bas »", () => {
    expect(EMPTY_ATHLETE).toEqual({
      vmaKmh: "",
      pmaWatts: "",
      hasBike: false,
      bikeKg: "",
      bikePosition: "hoods",
    });
  });

  it("fait un aller-retour complet (exemple 3)", () => {
    saveAthlete(ATHLETE);

    expect(loadAthlete()).toEqual(ATHLETE);
  });

  it("retourne null quand rien n'est enregistré (exemple 3)", () => {
    expect(loadAthlete()).toBeNull();
  });

  it("retourne null pour un JSON invalide (exemple 4)", () => {
    window.localStorage.setItem(
      ATHLETE_STORAGE_KEY,
      "{ceci n'est pas du json",
    );

    expect(loadAthlete()).toBeNull();
  });

  it("retourne null pour une VMA hors bornes (exemple 4)", () => {
    store({ ...ATHLETE, vmaKmh: "45" });

    expect(loadAthlete()).toBeNull();
  });

  it("retourne null pour une PMA hors bornes (exemple 4)", () => {
    store({ ...ATHLETE, pmaWatts: "50" });

    expect(loadAthlete()).toBeNull();
  });

  it("retourne null pour un hasBike qui n'est pas un booléen (exemple 4)", () => {
    store({ ...ATHLETE, hasBike: "true" });

    expect(loadAthlete()).toBeNull();
  });

  it("retourne null pour une position de vélo inconnue (exemple 4)", () => {
    store({ ...ATHLETE, bikePosition: "x" });

    expect(loadAthlete()).toBeNull();
  });

  it("retourne null pour un poids de vélo hors bornes (exemple 4)", () => {
    store({ ...ATHLETE, bikeKg: "3" });

    expect(loadAthlete()).toBeNull();
  });

  it("ne lève pas quand localStorage lève à la lecture (exemple 5)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("stockage indisponible");
    });

    expect(() => loadAthlete()).not.toThrow();
    expect(loadAthlete()).toBeNull();
  });

  it("ne lève pas quand localStorage lève à l'écriture (exemple 5)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota dépassé");
    });

    expect(() => saveAthlete(ATHLETE)).not.toThrow();
  });

  it("supprime la clé avec clearAthlete (exemple 5)", () => {
    saveAthlete(ATHLETE);
    expect(window.localStorage.getItem(ATHLETE_STORAGE_KEY)).not.toBeNull();

    clearAthlete();

    expect(window.localStorage.getItem(ATHLETE_STORAGE_KEY)).toBeNull();
    expect(loadAthlete()).toBeNull();
  });

  it("ne lève pas quand localStorage lève à l'effacement (exemple 5)", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("stockage indisponible");
    });

    expect(() => clearAthlete()).not.toThrow();
  });

  it("n'enregistre pas de poids de vélo quand le vélo est décoché", () => {
    saveAthlete({ ...ATHLETE, hasBike: false, bikeKg: "8" });

    expect(loadAthlete()).toEqual({ ...ATHLETE, hasBike: false, bikeKg: "" });
  });
});

describe("validateAthlete", () => {
  it("n'exige ni VMA ni PMA (exemple 6)", () => {
    expect(validateAthlete(EMPTY_ATHLETE)).toEqual({});
  });

  it("signale une VMA hors bornes (exemple 6)", () => {
    expect(validateAthlete({ ...EMPTY_ATHLETE, vmaKmh: "31" })).toHaveProperty(
      "vmaKmh",
    );
  });

  it("exige le poids du vélo quand un vélo est coché (exemple 6)", () => {
    expect(
      validateAthlete({ ...EMPTY_ATHLETE, hasBike: true, bikeKg: "" }),
    ).toHaveProperty("bikeKg");
  });

  it("n'exige pas le poids du vélo sans vélo (exemple 6)", () => {
    expect(
      validateAthlete({ ...EMPTY_ATHLETE, hasBike: false, bikeKg: "" }),
    ).toEqual({});
  });
});
