"use client";

/**
 * Orchestration de la page 1 (SPEC-08.5) : un seul bouton « Voir mes résultats »
 * valide Paramètres, Activité et Nutrition, puis navigue vers `/nutrition`.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useWatch } from "react-hook-form";

import EnergyCalculator from "@/components/EnergyCalculator";
import InfoTooltip from "@/components/InfoTooltip";
import NutritionPlanner from "@/components/NutritionPlanner";
import { CapsFields } from "@/components/forms/CapsFields";
import { CARD_TITLE } from "@/components/forms/styles";
import useNutritionForms from "@/components/forms/useNutritionForms";
import useSettingsForm from "@/components/forms/useSettingsForm";
import { useActivity } from "@/components/providers/ActivityProvider";
import { useUserSettings } from "@/components/providers/UserSettingsProvider";
import { validateInputs } from "@/lib/energy";
import { validateEffort } from "@/lib/effort";
import { CAPS_HELP } from "@/lib/helpTexts";
import { findSport, supportsGpx } from "@/lib/sports";

export default function HomeContent() {
  const { status } = useUserSettings();

  // Les composants initialisent leur état local depuis le contexte : on attend l'hydratation.
  if (status === "loading") {
    return null;
  }

  return <HomeForm />;
}

function HomeForm() {
  const router = useRouter();
  const { activity, minutes } = useActivity();
  const settingsForm = useSettingsForm();
  const forms = useNutritionForms();
  /** Passe à true au premier « Voir mes résultats » : les champs vides s'annoncent. */
  const [attempted, setAttempted] = useState(false);

  const profileValues = useWatch({
    control: settingsForm.form.control,
    name: "profile",
  });

  const sport = findSport(activity.sportId);
  const gpxMode =
    activity.inputMode === "gpx" &&
    sport !== undefined &&
    supportsGpx(sport);

  const sex =
    profileValues.sex === "male" || profileValues.sex === "female"
      ? profileValues.sex
      : "";
  const inputErrors = validateInputs({
    sex,
    age: profileValues.age,
    weightKg: profileValues.weightKg,
    heightCm: profileValues.heightCm,
    sportId: activity.sportId,
    minutes: "",
  });
  const effortErrors = validateEffort(activity.effort);
  const activityOk = gpxMode
    ? minutes !== null
    : Object.keys(inputErrors).length === 0 &&
      Object.keys(effortErrors).length === 0;

  /** Les trois validations s'exécutent toujours : toutes les erreurs restent visibles. */
  async function handleShowResults() {
    const settingsOk = await settingsForm.validateProfile();
    setAttempted(true);
    const nutritionOk = await forms.submitAll();

    if (settingsOk && activityOk && nutritionOk && minutes !== null) {
      router.push("/nutrition");
    }
  }

  const caps = (
    <div className="mt-4">
      <div className="flex items-start justify-between gap-2">
        <h3 id="titre-plafond" className={CARD_TITLE}>
          Plafond à respecter
        </h3>
        <InfoTooltip
          id="help-caps"
          label="Aide : plafond à respecter"
          title="Plafond à respecter"
        >
          {CAPS_HELP}
        </InfoTooltip>
      </div>
      <FormProvider {...forms.capsForm}>
        <CapsFields patchSettings={forms.patchSettings} />
      </FormProvider>
    </div>
  );

  return (
    <>
      <EnergyCalculator
        settings={settingsForm}
        showEmptyErrors={attempted}
        onReset={() => setAttempted(false)}
        caps={caps}
      />
      <NutritionPlanner
        forms={forms}
        onShowResults={() => void handleShowResults()}
      />
    </>
  );
}
