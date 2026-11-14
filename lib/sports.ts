export type Sport = {
  /** Identifiant stable, utilisé comme valeur du champ de sélection. */
  id: string;
  label: string;
  /** MET : dépense énergétique de l'activité, en multiples du métabolisme de repos. */
  met: number;
};

/** Sports d'endurance, MET issus du Compendium of Physical Activities. */
export const SPORTS: readonly Sport[] = [
  { id: "marche-rapide", label: "Marche rapide", met: 4.3 },
  { id: "course-8", label: "Course 8 km/h", met: 8.3 },
  { id: "course-10", label: "Course 10 km/h", met: 9.8 },
  { id: "ski-randonnée", label: "Ski Randonnée", met: 10 },
  { id: "velo-route-soutenu", label: "Vélo route soutenu", met: 10 },
  { id: "natation-crawl-moderee", label: "Natation crawl modérée", met: 5.8 },
  { id: "natation-crawl-rapide", label: "Natation crawl rapide", met: 9.8 },
  { id: "aviron-modere", label: "Aviron modéré", met: 7 },
  { id: "randonnee", label: "Randonnée", met: 6 },
  { id: "ski-fond", label: "Ski de fond", met: 9 },
];

export function findSport(id: string): Sport | undefined {
  return SPORTS.find((sport) => sport.id === id);
}
