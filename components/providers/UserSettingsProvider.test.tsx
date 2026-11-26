import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import UserSettingsProvider, {
  useUserSettings,
} from "@/components/providers/UserSettingsProvider";
import {
  ATHLETE_STORAGE_KEY,
  type AthleteSettings,
} from "@/lib/athleteStorage";
import {
  NUTRITION_STORAGE_KEY,
  type NutritionSettings,
} from "@/lib/nutritionStorage";
import {
  PROFILE_STORAGE_KEY,
  type ProfileSettings,
} from "@/lib/profileStorage";

const PROFILE: ProfileSettings = {
  sex: "female",
  age: "35",
  weightKg: "65",
  heightCm: "168",
  activityIndex: 2,
};

const ATHLETE: AthleteSettings = {
  vmaKmh: "16",
  pmaWatts: "250",
  hasBike: false,
  bikeKg: "",
  bikePosition: "hoods",
};

const NUTRITION: NutritionSettings = {
  carbCap: "60",
  sodiumCap: "600",
  products: [],
  selectedIds: [],
  strategyKey: null,
  drinkEnabled: false,
  drinkBrand: "",
  drinkName: "",
  drinkConcentration: "",
  drinkKcalPer100: "",
  drinkCarbsPer100: "",
  drinkSaltPer100: "",
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <UserSettingsProvider>{children}</UserSettingsProvider>
);

function renderSettings() {
  return renderHook(() => useUserSettings(), { wrapper });
}

describe("UserSettingsProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("passe à « ready » avec un stockage vide (exemple 9)", async () => {
    const { result } = renderSettings();

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.profile).toBeNull();
    expect(result.current.athlete).toBeNull();
    expect(result.current.nutrition).toBeNull();
  });

  it("restaure les trois valeurs enregistrées (exemple 10)", async () => {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(PROFILE));
    window.localStorage.setItem(ATHLETE_STORAGE_KEY, JSON.stringify(ATHLETE));
    window.localStorage.setItem(NUTRITION_STORAGE_KEY, JSON.stringify(NUTRITION));

    const { result } = renderSettings();

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.profile).toEqual(PROFILE);
    expect(result.current.athlete).toEqual(ATHLETE);
    expect(result.current.nutrition).toEqual(NUTRITION);
  });

  it("écrit chaque mise à jour dans le stockage (exemple 11)", async () => {
    const { result } = renderSettings();
    await waitFor(() => expect(result.current.status).toBe("ready"));

    act(() => result.current.updateNutrition(NUTRITION));
    expect(result.current.nutrition).toEqual(NUTRITION);
    expect(window.localStorage.getItem(NUTRITION_STORAGE_KEY)).toBe(
      JSON.stringify(NUTRITION),
    );

    act(() => result.current.resetNutrition());
    expect(result.current.nutrition).toBeNull();
    expect(window.localStorage.getItem(NUTRITION_STORAGE_KEY)).toBeNull();

    act(() => result.current.updateProfile(PROFILE));
    expect(result.current.profile).toEqual(PROFILE);
    expect(window.localStorage.getItem(PROFILE_STORAGE_KEY)).toBe(
      JSON.stringify(PROFILE),
    );

    act(() => result.current.updateAthlete(ATHLETE));
    expect(result.current.athlete).toEqual(ATHLETE);
    expect(window.localStorage.getItem(ATHLETE_STORAGE_KEY)).toBe(
      JSON.stringify(ATHLETE),
    );
  });

  it("lève une erreur explicite hors du provider (exemple 12)", () => {
    expect(() => renderHook(() => useUserSettings())).toThrow(
      "useUserSettings doit être utilisé dans <UserSettingsProvider>",
    );
  });

  it("reste utilisable quand localStorage lève (exemple 13)", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("stockage indisponible");
    });

    const { result } = renderSettings();

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.profile).toBeNull();
    expect(result.current.athlete).toBeNull();
    expect(result.current.nutrition).toBeNull();
  });
});
