import type { SpeedUnit } from "@/lib/effort";

export type Sport = {
  /** Identifiant stable, utilisé comme valeur du champ de sélection. */
  id: string;
  label: string;
  /** MET : dépense énergétique de l'activité, en multiples du métabolisme de repos. */
  met: number;
  /** Unité de vitesse proposée par défaut quand on choisit ce sport. */
  defaultSpeedUnit: SpeedUnit;
  /** Famille du sport : pilote la proposition du mode GPX. */
  family: "run" | "trail" | "bike" | "other";
};

/** Sports d'endurance, MET issus du Compendium of Physical Activities. */
export const SPORTS: readonly Sport[] = [
  {
    id: "velo-route-vtt-modere",
    label: "Vélo de route - VTT (modéré)",
    met: 8,
    defaultSpeedUnit: "kmh",
    family: "bike",
  },
  {
    id: "velo-route-vtt-intense",
    label: "Vélo de route - VTT (intense)",
    met: 10,
    defaultSpeedUnit: "kmh",
    family: "bike",
  },
  {
    id: "course-modere",
    label: "Course à pied (modéré)",
    met: 8.3,
    defaultSpeedUnit: "minkm",
    family: "run",
  },
  {
    id: "course-intense",
    label: "Course à pied (intense)",
    met: 9.8,
    defaultSpeedUnit: "minkm",
    family: "run",
  },
  {
    id: "trail-modere",
    label: "Trail (modéré)",
    met: 9,
    defaultSpeedUnit: "minkm",
    family: "trail",
  },
  {
    id: "trail-intense",
    label: "Trail (intense)",
    met: 11,
    defaultSpeedUnit: "minkm",
    family: "trail",
  },
  {
    id: "ski-rando-modere",
    label: "Ski de randonnée (modéré)",
    met: 7,
    defaultSpeedUnit: "kmh",
    family: "other",
  },
  {
    id: "ski-rando-intense",
    label: "Ski de randonnée (intense)",
    met: 10,
    defaultSpeedUnit: "kmh",
    family: "other",
  },
  {
    id: "randonnee-modere",
    label: "Randonnée (modéré)",
    met: 6,
    defaultSpeedUnit: "kmh",
    family: "other",
  },
  {
    id: "randonnee-intense",
    label: "Randonnée (intense)",
    met: 7.8,
    defaultSpeedUnit: "kmh",
    family: "other",
  },
];

export function findSport(id: string): Sport | undefined {
  return SPORTS.find((sport) => sport.id === id);
}

/** Vrai pour les sports pouvant être définis par une trace GPX. */
export function supportsGpx(sport: Sport): boolean {
  return (
    sport.family === "run" ||
    sport.family === "trail" ||
    sport.family === "bike"
  );
}
