export const INTENSITY_LEVELS = [
  { id: "endurance", label: "Endurance fondamentale", ratio: 0.6 },
  { id: "moderate", label: "Rythme modéré", ratio: 0.7 },
  { id: "sustained", label: "Rythme soutenu", ratio: 0.8 },
  { id: "race", label: "Compétition", ratio: 0.85 },
] as const;

export type IntensityId = (typeof INTENSITY_LEVELS)[number]["id"];

/** Niveau d'intensité par identifiant ; undefined si l'identifiant est inconnu. */
export function findIntensity(
  id: string,
): (typeof INTENSITY_LEVELS)[number] | undefined {
  return INTENSITY_LEVELS.find((level) => level.id === id);
}

export const TERRAIN_TYPES = [
  { id: "rolling", label: "Roulant" },
  { id: "rough", label: "Accidenté" },
  { id: "technical", label: "Très technique" },
] as const;

export type TerrainId = (typeof TERRAIN_TYPES)[number]["id"];

export const BIKE_POSITIONS = [
  { id: "upright", label: "Relevée", cdA: 0.4 },
  { id: "hoods", label: "Mains en bas", cdA: 0.32 },
  { id: "aero", label: "Aéro", cdA: 0.26 },
] as const;

export type BikePositionId = (typeof BIKE_POSITIONS)[number]["id"];

/** Niveau de ski : pilote la vitesse de descente (SPEC-09). */
export const SKI_LEVELS = [
  {
    id: "beginner",
    label: "Débutant",
    descentVerticalMh: 1200,
    descentMaxKmh: 10,
  },
  {
    id: "intermediate",
    label: "Intermédiaire",
    descentVerticalMh: 2000,
    descentMaxKmh: 18,
  },
  { id: "expert", label: "Expert", descentVerticalMh: 3000, descentMaxKmh: 30 },
] as const;

export type SkiLevelId = (typeof SKI_LEVELS)[number]["id"];
