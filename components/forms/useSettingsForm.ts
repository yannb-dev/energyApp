"use client";

/**
 * Formulaire « Paramètres » de la page 1 (SPEC-08.5) : extrait d'`EnergyCalculator`
 * pour que `HomeContent` orchestre la validation sans recâbler de callbacks.
 */

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useUserSettings } from "@/components/providers/UserSettingsProvider";
import { EMPTY_ATHLETE } from "@/lib/athleteStorage";
import { DEFAULT_ACTIVITY_INDEX } from "@/lib/energy";
import {
  settingsFormSchema,
  type SettingsFormValues,
} from "@/lib/schemas/settings";

export type SettingsForm = {
  form: UseFormReturn<SettingsFormValues>;
  /** true = édition, false = replié après validation. */
  profileOpen: boolean;
  modifyButtonRef: RefObject<HTMLButtonElement | null>;
  handleValidateProfile: () => void;
  handleEditProfile: () => void;
  handleOpenSettings: () => void;
  /** Valide le bloc Paramètres ; true si le profil est exploitable. */
  validateProfile: () => Promise<boolean>;
};

export default function useSettingsForm(): SettingsForm {
  const {
    profile: storedProfile,
    athlete: storedAthlete,
    updateProfile,
    updateAthlete,
  } = useUserSettings();

  const [profileOpen, setProfileOpen] = useState(() => storedProfile === null);
  const modifyButtonRef = useRef<HTMLButtonElement>(null);
  /** Focus à poser après un changement d'état du bloc (l'élément n'existe pas encore). */
  const pendingFocusRef = useRef<"modify" | "firstField" | null>(null);

  const defaultValues = useMemo<SettingsFormValues>(
    () => ({
      profile: {
        sex: storedProfile?.sex ?? "",
        age: storedProfile?.age ?? "",
        weightKg: storedProfile?.weightKg ?? "",
        heightCm: storedProfile?.heightCm ?? "",
      },
      activityIndex: storedProfile?.activityIndex ?? DEFAULT_ACTIVITY_INDEX,
      athlete: storedAthlete ?? EMPTY_ATHLETE,
    }),
    [storedProfile, storedAthlete],
  );

  const form = useForm<SettingsFormValues>({
    defaultValues,
    resolver: zodResolver(settingsFormSchema, undefined, { raw: true }),
    mode: "onChange",
    shouldFocusError: true,
  });
  const { handleSubmit, setFocus } = form;

  // Focus différé : la cible vient d'apparaître (bloc replié ou rouvert).
  useEffect(() => {
    const target = pendingFocusRef.current;
    if (target === "modify" && !profileOpen) {
      pendingFocusRef.current = null;
      modifyButtonRef.current?.focus();
    }
    if (target === "firstField" && profileOpen) {
      pendingFocusRef.current = null;
      setFocus("profile.sex");
    }
  }, [profileOpen, setFocus]);

  /** « Modifier mes paramètres » du mode GPX : rouvre le bloc ou cible la VMA. */
  function handleOpenSettings() {
    if (profileOpen) {
      setFocus("athlete.vmaKmh");
      return;
    }
    pendingFocusRef.current = "firstField";
    setProfileOpen(true);
  }

  /** « Valider » enregistre le profil et les données athlète ; sport et effort ne bloquent pas. */
  function onValidProfile(data: SettingsFormValues) {
    const profileSex = data.profile.sex;
    if (profileSex !== "male" && profileSex !== "female") {
      return;
    }

    updateProfile({
      sex: profileSex,
      age: data.profile.age,
      weightKg: data.profile.weightKg,
      heightCm: data.profile.heightCm,
      activityIndex: data.activityIndex,
    });
    updateAthlete({
      ...data.athlete,
      bikeKg: data.athlete.hasBike ? data.athlete.bikeKg : "",
    });

    pendingFocusRef.current = "modify";
    setProfileOpen(false);
  }

  function handleValidateProfile() {
    void handleSubmit(onValidProfile)();
  }

  /** Rouvre le bloc avec les valeurs courantes ; rien n'est réenregistré sans « Valider ». */
  function handleEditProfile() {
    pendingFocusRef.current = "firstField";
    setProfileOpen(true);
  }

  /**
   * Bloc replié avec un profil enregistré : rien à resoumettre.
   * Sinon, même effet que « Valider » ; true si le profil a été accepté.
   */
  async function validateProfile(): Promise<boolean> {
    if (!profileOpen && storedProfile !== null) {
      return true;
    }

    let ok = false;
    await handleSubmit((data) => {
      ok = true;
      onValidProfile(data);
    })();
    return ok;
  }

  return {
    form,
    profileOpen,
    modifyButtonRef,
    handleValidateProfile,
    handleEditProfile,
    handleOpenSettings,
    validateProfile,
  };
}
