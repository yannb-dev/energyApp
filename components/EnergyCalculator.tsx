"use client";

/**
 * Page 1 — saisie seule (SPEC-08.5) : Paramètres et Activité.
 * Le profil vient de `useSettingsForm` ; les plafonds sont passés en `caps`.
 */

import { useRef, type ReactNode } from "react";
import { FormProvider, useWatch } from "react-hook-form";

import { AthleteFields } from "@/components/forms/AthleteFields";
import { EffortFields } from "@/components/forms/EffortFields";
import { ProfileFields } from "@/components/forms/ProfileFields";
import { BUTTON_BASE, CARD, CARD_TITLE } from "@/components/forms/styles";
import type { SettingsForm } from "@/components/forms/useSettingsForm";
import { useActivity } from "@/components/providers/ActivityProvider";

type EnergyCalculatorProps = {
  settings: SettingsForm;
  /** Les erreurs des champs vides n'apparaissent qu'après « Voir mes résultats ». */
  showEmptyErrors: boolean;
  onReset: () => void;
  /** Bloc « Plafond à respecter », rendu en fin du bloc Activité. */
  caps: ReactNode;
};

export default function EnergyCalculator({
  settings,
  showEmptyErrors,
  onReset,
  caps,
}: EnergyCalculatorProps) {
  const { dispatch } = useActivity();
  const sportRef = useRef<HTMLSelectElement>(null);

  const {
    form,
    profileOpen,
    modifyButtonRef,
    handleValidateProfile,
    handleEditProfile,
    handleOpenSettings,
  } = settings;

  const profileValues = useWatch({ control: form.control, name: "profile" });
  const athlete = useWatch({ control: form.control, name: "athlete" });

  const { weightKg } = profileValues;

  /** Reset : sport, distance et vitesse seulement — le profil et l'état replié sont conservés. */
  function handleReset() {
    dispatch({ type: "reset" });
    sportRef.current?.focus();
    onReset();
  }

  return (
    <div className="flex flex-col gap-4">
      <FormProvider {...form}>
        <section
          className={`animate-rise ${CARD}`}
          aria-labelledby="titre-parametres"
        >
          <h2 id="titre-parametres" className={CARD_TITLE}>
            Paramètres
          </h2>

          {profileOpen ? (
            <>
              <ProfileFields />
              <AthleteFields />

              <div className="mt-4 flex">
                <button
                  type="button"
                  onClick={handleValidateProfile}
                  className={`${BUTTON_BASE} bg-accent text-canvas hover:bg-accent-strong`}
                >
                  Valider
                </button>
              </div>
            </>
          ) : (
            <button
              ref={modifyButtonRef}
              type="button"
              aria-expanded={false}
              onClick={handleEditProfile}
              className="flex h-11 w-full items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold text-ink transition duration-200 hover:border-accent hover:text-accent-strong focus-visible:ring-2 focus-visible:ring-accent-strong"
            >
              Modifier mes paramètres
            </button>
          )}
        </section>

        <section
          className={`animate-rise rise-delay-1 ${CARD}`}
          aria-labelledby="titre-activite"
        >
          <h2 id="titre-activite" className={CARD_TITLE}>
            Activité
          </h2>

          <EffortFields
            showEmptyErrors={showEmptyErrors}
            sportRef={sportRef}
            onEditSettings={handleOpenSettings}
            profile={{ weightKg }}
            athlete={athlete}
          />

          {caps}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleReset}
              className={`${BUTTON_BASE} border border-line text-ink hover:border-accent hover:text-accent-strong`}
            >
              Reset
            </button>
          </div>
        </section>
      </FormProvider>

      <p className="text-xs text-muted">Estimation indicative, non médicale.</p>
    </div>
  );
}
