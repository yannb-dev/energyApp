"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  loadAthlete,
  saveAthlete,
  type AthleteSettings,
} from "@/lib/athleteStorage";
import {
  clearNutrition,
  loadNutrition,
  saveNutrition,
  type NutritionSettings,
} from "@/lib/nutritionStorage";
import {
  loadProfile,
  saveProfile,
  type ProfileSettings,
} from "@/lib/profileStorage";

type UserSettingsContextValue = {
  status: "loading" | "ready";
  profile: ProfileSettings | null;
  athlete: AthleteSettings | null;
  nutrition: NutritionSettings | null;
  updateProfile(profile: ProfileSettings): void;
  updateAthlete(athlete: AthleteSettings): void;
  updateNutrition(settings: NutritionSettings): void;
  resetNutrition(): void;
};

const UserSettingsContext = createContext<UserSettingsContextValue | null>(
  null,
);

/**
 * Profil, données athlète et nutrition, lus une seule fois au montage.
 * Aucun accès direct au stockage du navigateur : uniquement lib/*Storage.ts.
 */
export default function UserSettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [profile, setProfile] = useState<ProfileSettings | null>(null);
  const [athlete, setAthlete] = useState<AthleteSettings | null>(null);
  const [nutrition, setNutrition] = useState<NutritionSettings | null>(null);

  // Lecture du stockage après le montage : jamais pendant le rendu.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- hydratation demandée dans un useEffect : le stockage n'existe pas au rendu serveur */
    setProfile(loadProfile());
    setAthlete(loadAthlete());
    setNutrition(loadNutrition());
    setStatus("ready");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function updateProfile(next: ProfileSettings) {
    setProfile(next);
    saveProfile(next);
  }

  function updateAthlete(next: AthleteSettings) {
    setAthlete(next);
    saveAthlete(next);
  }

  function updateNutrition(next: NutritionSettings) {
    setNutrition(next);
    saveNutrition(next);
  }

  function resetNutrition() {
    setNutrition(null);
    clearNutrition();
  }

  return (
    <UserSettingsContext
      value={{
        status,
        profile,
        athlete,
        nutrition,
        updateProfile,
        updateAthlete,
        updateNutrition,
        resetNutrition,
      }}
    >
      {children}
    </UserSettingsContext>
  );
}

export function useUserSettings(): UserSettingsContextValue {
  const value = useContext(UserSettingsContext);
  if (value === null) {
    throw new Error(
      "useUserSettings doit être utilisé dans <UserSettingsProvider>",
    );
  }
  return value;
}
