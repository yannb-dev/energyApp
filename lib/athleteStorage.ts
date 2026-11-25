import { type BikePositionId } from "@/lib/intensity";
import {
  athleteSchema,
  athleteSettingsSchema,
} from "@/lib/schemas/athlete";
import { toFieldErrors } from "@/lib/schemas/errors";
import { loadItem, removeItems, saveItem } from "@/lib/storage";

/** Clé des données athlète, séparée du profil « Paramètres » (SPEC-06). */
export const ATHLETE_STORAGE_KEY = "kcalapp:athlete:v1";

/** Bornes partagées avec les schémas de validation (lib/schemas/limits.ts). */
export {
  BIKE_KG_MAX,
  BIKE_KG_MIN,
  PMA_WATTS_MAX,
  PMA_WATTS_MIN,
  VMA_KMH_MAX,
  VMA_KMH_MIN,
} from "@/lib/schemas/limits";

/** Valeurs brutes du formulaire athlète : tout arrive en texte depuis les champs. */
export type AthleteSettings = {
  /** Vitesse maximale aérobie, en km/h ; "" si non renseignée. */
  vmaKmh: string;
  /** Puissance maximale aérobie, en watts ; "" si non renseignée. */
  pmaWatts: string;
  hasBike: boolean;
  /** Poids du vélo, utilisé seulement si hasBike. */
  bikeKg: string;
  bikePosition: BikePositionId;
};

export const EMPTY_ATHLETE: AthleteSettings = {
  vmaKmh: "",
  pmaWatts: "",
  hasBike: false,
  bikeKg: "",
  bikePosition: "hoods",
};

export type AthleteField = "vmaKmh" | "pmaWatts" | "bikeKg";

/** Valide les champs athlète : VMA et PMA optionnelles, poids du vélo requis avec vélo. */
export function validateAthlete(
  values: AthleteSettings,
): Partial<Record<AthleteField, string>> {
  return toFieldErrors(athleteSchema, values);
}

/** Données athlète enregistrées, ou null si absentes, illisibles ou hors bornes. */
export function loadAthlete(): AthleteSettings | null {
  return loadItem(ATHLETE_STORAGE_KEY, athleteSettingsSchema);
}

/** Enregistre les données athlète ; sans vélo, le poids du vélo n'est pas conservé. */
export function saveAthlete(values: AthleteSettings): void {
  saveItem(ATHLETE_STORAGE_KEY, {
    ...values,
    bikeKg: values.hasBike ? values.bikeKg : "",
  });
}

/** Efface les données athlète ; silencieux si le stockage est indisponible. */
export function clearAthlete(): void {
  removeItems(ATHLETE_STORAGE_KEY);
}
