"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import EnergyCalculator from "@/components/EnergyCalculator";
import NutritionPlanner from "@/components/NutritionPlanner";
import { parseDecimal } from "@/lib/energy";
import { MINUTES_MAX, MINUTES_MIN } from "@/lib/nutrition";

/** `min` de l'URL : entier de 1 à 1440 minutes, sinon ignoré. */
function minutesFromSearch(searchParams: { get(name: string): string | null }): string {
  const raw = searchParams.get("min");
  if (raw === null) {
    return "";
  }
  const parsed = parseDecimal(raw);
  if (parsed === null || !Number.isInteger(parsed)) {
    return "";
  }
  if (parsed < MINUTES_MIN || parsed > MINUTES_MAX) {
    return "";
  }
  return String(parsed);
}

export default function HomeContent() {
  const searchParams = useSearchParams();
  // Seule la durée est restaurée depuis l'URL ; le reste du calculateur repart vide.
  const [minutes, setMinutes] = useState(() => minutesFromSearch(searchParams));

  return (
    <>
      <EnergyCalculator initialMinutes={minutes} onMinutesChange={setMinutes} />
      <NutritionPlanner minutes={minutes} />
    </>
  );
}
