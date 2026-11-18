import { ACTIVITY_LEVELS, validateInputs } from "@/lib/energy";

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

/** Champ factice : validateInputs exige un sport, le profil n'en contient pas. */
const PROFILE_SPORT_PLACEHOLDER = "profil";

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

/** Relit un profil champ par champ ; null au moindre doute (tout ou rien). */
function readProfile(record: Record<string, unknown>): ProfileSettings | null {
  const sex = record.sex;
  if (sex !== "male" && sex !== "female") {
    return null;
  }

  const age = readString(record.age);
  const weightKg = readString(record.weightKg);
  const heightCm = readString(record.heightCm);
  const activityIndex = record.activityIndex;

  if (age === null || weightKg === null || heightCm === null) {
    return null;
  }
  if (typeof activityIndex !== "number" || !Number.isInteger(activityIndex)) {
    return null;
  }
  if (activityIndex < 0 || activityIndex > ACTIVITY_LEVELS.length - 1) {
    return null;
  }

  // Mêmes bornes que les champs du calculateur : aucune règle dupliquée.
  const errors = validateInputs({
    sex,
    age,
    weightKg,
    heightCm,
    sportId: PROFILE_SPORT_PLACEHOLDER,
    minutes: "",
  });
  if (Object.keys(errors).length > 0) {
    return null;
  }

  return { sex, age, weightKg, heightCm, activityIndex };
}

/** Profil enregistré, ou null si absent, illisible ou hors bornes. */
export function loadProfile(): ProfileSettings | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  let raw: string | null;
  try {
    raw = storage.getItem(PROFILE_STORAGE_KEY);
  } catch {
    return null;
  }

  if (raw === null) {
    return null;
  }

  const record = parseRecord(raw);
  return record === null ? null : readProfile(record);
}

/** Enregistre le profil ; silencieux si le stockage est indisponible. */
export function saveProfile(profile: ProfileSettings): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Stockage indisponible : l'application continue sans persistance.
  }
}

/** Efface le profil enregistré ; silencieux si le stockage est indisponible. */
export function clearProfile(): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(PROFILE_STORAGE_KEY);
  } catch {
    // Stockage indisponible : l'application continue sans persistance.
  }
}
