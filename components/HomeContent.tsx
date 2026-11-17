"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import EnergyCalculator from "@/components/EnergyCalculator";
import NutritionPlanner from "@/components/NutritionPlanner";
import {
  EMPTY_EFFORT,
  validateEffort,
  type EffortFormValues,
  type SpeedUnit,
} from "@/lib/effort";

function isSpeedUnit(value: string | null): value is SpeedUnit {
  return value === "kmh" || value === "minkm";
}

/** `km`, `v` et `u` de l'URL : les trois sont validés ensemble, sinon aucun. */
function effortFromSearch(searchParams: {
  get(name: string): string | null;
}): EffortFormValues {
  const distanceKm = searchParams.get("km");
  const speed = searchParams.get("v");
  const unit = searchParams.get("u");

  if (distanceKm === null || speed === null || !isSpeedUnit(unit)) {
    return EMPTY_EFFORT;
  }

  const effort: EffortFormValues = { distanceKm, speed, speedUnit: unit };
  if (Object.keys(validateEffort(effort)).length > 0) {
    return EMPTY_EFFORT;
  }
  return effort;
}

export default function HomeContent() {
  const searchParams = useSearchParams();
  // Seul l'effort est restauré depuis l'URL ; le profil repart vide.
  const [effort, setEffort] = useState<EffortFormValues>(() =>
    effortFromSearch(searchParams),
  );
  // Durée dérivée : le calculateur la transmet à chaque changement.
  const [minutes, setMinutes] = useState("");

  return (
    <>
      <EnergyCalculator
        initialEffort={effort}
        onMinutesChange={setMinutes}
        onEffortChange={setEffort}
      />
      <NutritionPlanner minutes={minutes} effort={effort} />
    </>
  );
}
