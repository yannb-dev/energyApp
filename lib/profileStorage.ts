import { z } from "zod";

import { ACTIVITY_LEVELS } from "@/lib/energy";
import { profileSchema } from "@/lib/schemas/profile";
import { loadItem, removeItems, saveItem } from "@/lib/storage";

/** Clé du profil « Paramètres » (sexe, âge, poids, taille, niveau d'activité). */
export const PROFILE_STORAGE_KEY = "kcalapp:profile:v1";

export type ProfileSettings = {
  sex: "male" | "female";
  age: string;
  weightKg: string;
  heightCm: string;
  /** Index dans ACTIVITY_LEVELS. */
  activityIndex: number;
};

/**
 * Format enregistré : les règles du formulaire, complétées par le sexe typé et
 * l'index d'activité. Aucune borne recopiée : profileSchema les importe déjà.
 */
const storedProfileSchema = profileSchema.extend({
  sex: z.enum(["male", "female"]),
  activityIndex: z.number().int().min(0).max(ACTIVITY_LEVELS.length - 1),
});

/** Profil enregistré, ou null si absent, illisible ou hors bornes. */
export function loadProfile(): ProfileSettings | null {
  return loadItem(PROFILE_STORAGE_KEY, storedProfileSchema);
}

/** Enregistre le profil ; silencieux si le stockage est indisponible. */
export function saveProfile(profile: ProfileSettings): void {
  saveItem(PROFILE_STORAGE_KEY, profile);
}

/** Efface le profil enregistré ; silencieux si le stockage est indisponible. */
export function clearProfile(): void {
  removeItems(PROFILE_STORAGE_KEY);
}
