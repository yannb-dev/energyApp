export type Sport = {
  /** Identifiant stable, utilisé comme valeur du champ de sélection. */
  id: string;
  label: string;
  /** MET : dépense énergétique de l'activité, en multiples du métabolisme de repos. */
  met: number;
};

/** Sports d'endurance, MET issus du Compendium of Physical Activities. */
export const SPORTS: readonly Sport[] = [
  {
    id: "velo-route-vtt-modere",
    label: "Vélo de route - VTT (modéré)",
    met: 8,
  },
  {
    id: "velo-route-vtt-intense",
    label: "Vélo de route - VTT (intense)",
    met: 10,
  },
  { id: "course-modere", label: "Course à pied (modéré)", met: 8.3 },
  { id: "course-intense", label: "Course à pied (intense)", met: 9.8 },
  { id: "trail-modere", label: "Trail (modéré)", met: 9 },
  { id: "trail-intense", label: "Trail (intense)", met: 11 },
  { id: "ski-rando-modere", label: "Ski de randonnée (modéré)", met: 7 },
  { id: "ski-rando-intense", label: "Ski de randonnée (intense)", met: 10 },
  { id: "randonnee-modere", label: "Randonnée (modéré)", met: 6 },
  { id: "randonnee-intense", label: "Randonnée (intense)", met: 7.8 },
];

export function findSport(id: string): Sport | undefined {
  return SPORTS.find((sport) => sport.id === id);
}
