"use client";

import EnergyCalculator from "@/components/EnergyCalculator";
import NutritionPlanner from "@/components/NutritionPlanner";
import { useUserSettings } from "@/components/providers/UserSettingsProvider";

export default function HomeContent() {
  const { status } = useUserSettings();

  // Les composants initialisent leur état local depuis le contexte : on attend l'hydratation.
  if (status === "loading") {
    return null;
  }

  return (
    <>
      <EnergyCalculator />
      <NutritionPlanner />
    </>
  );
}
