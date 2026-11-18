import { parseDecimal } from "@/lib/energy";
import { BIKE_POSITIONS, type BikePositionId } from "@/lib/intensity";

/** Clé des données athlète, séparée du profil « Paramètres » (SPEC-06). */
export const ATHLETE_STORAGE_KEY = "kcalapp:athlete:v1";

export const VMA_KMH_MIN = 8;
export const VMA_KMH_MAX = 30;
export const PMA_WATTS_MIN = 100;
export const PMA_WATTS_MAX = 600;
export const BIKE_KG_MIN = 5;
export const BIKE_KG_MAX = 25;

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
  const errors: Partial<Record<AthleteField, string>> = {};

  if (values.vmaKmh.trim() !== "") {
    const vma = parseDecimal(values.vmaKmh);
    if (vma === null || vma < VMA_KMH_MIN || vma > VMA_KMH_MAX) {
      errors.vmaKmh = `La VMA doit être entre ${VMA_KMH_MIN} et ${VMA_KMH_MAX} km/h.`;
    }
  }

  if (values.pmaWatts.trim() !== "") {
    const pma = parseDecimal(values.pmaWatts);
    if (pma === null || !Number.isInteger(pma)) {
      errors.pmaWatts = "La PMA doit être un nombre entier.";
    } else if (pma < PMA_WATTS_MIN || pma > PMA_WATTS_MAX) {
      errors.pmaWatts = `La PMA doit être entre ${PMA_WATTS_MIN} et ${PMA_WATTS_MAX} W.`;
    }
  }

  if (values.hasBike) {
    if (values.bikeKg.trim() === "") {
      errors.bikeKg = "Le poids du vélo est obligatoire.";
    } else {
      const bikeKg = parseDecimal(values.bikeKg);
      if (bikeKg === null || bikeKg < BIKE_KG_MIN || bikeKg > BIKE_KG_MAX) {
        errors.bikeKg = `Le poids du vélo doit être entre ${BIKE_KG_MIN} et ${BIKE_KG_MAX} kg.`;
      }
    }
  }

  return errors;
}

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseRecord(raw: string): Record<string, unknown> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  return parsed as Record<string, unknown>;
}

function isBikePosition(value: unknown): value is BikePositionId {
  return (
    typeof value === "string" &&
    BIKE_POSITIONS.some((position) => position.id === value)
  );
}

/** Relit les données athlète champ par champ ; null au moindre doute (tout ou rien). */
function readAthlete(record: Record<string, unknown>): AthleteSettings | null {
  const vmaKmh = readString(record.vmaKmh);
  const pmaWatts = readString(record.pmaWatts);
  const bikeKg = readString(record.bikeKg);
  const hasBike = record.hasBike;
  const bikePosition = record.bikePosition;

  if (vmaKmh === null || pmaWatts === null || bikeKg === null) {
    return null;
  }
  if (typeof hasBike !== "boolean") {
    return null;
  }
  if (!isBikePosition(bikePosition)) {
    return null;
  }

  const athlete: AthleteSettings = {
    vmaKmh,
    pmaWatts,
    hasBike,
    bikeKg,
    bikePosition,
  };

  // Mêmes bornes que les champs du calculateur : aucune règle dupliquée.
  const errors = validateAthlete(athlete);
  return Object.keys(errors).length === 0 ? athlete : null;
}

/** Données athlète enregistrées, ou null si absentes, illisibles ou hors bornes. */
export function loadAthlete(): AthleteSettings | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  let raw: string | null;
  try {
    raw = storage.getItem(ATHLETE_STORAGE_KEY);
  } catch {
    return null;
  }

  if (raw === null) {
    return null;
  }

  const record = parseRecord(raw);
  return record === null ? null : readAthlete(record);
}

/** Enregistre les données athlète ; sans vélo, le poids du vélo n'est pas conservé. */
export function saveAthlete(values: AthleteSettings): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  const toStore: AthleteSettings = {
    ...values,
    bikeKg: values.hasBike ? values.bikeKg : "",
  };

  try {
    storage.setItem(ATHLETE_STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    // Stockage indisponible : l'application continue sans persistance.
  }
}

/** Efface les données athlète ; silencieux si le stockage est indisponible. */
export function clearAthlete(): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(ATHLETE_STORAGE_KEY);
  } catch {
    // Stockage indisponible : l'application continue sans persistance.
  }
}
