## SPEC-07.2 — Profil athlète : VMA, PMA, vélo, intensités

### Contexte

Deuxième brique de [SPEC-07](SPEC-07.md). Les modèles de 07.3 et 07.4 ont besoin de données que l'app ne connaît pas encore : **VMA** (course, trail), **PMA** (vélo), et pour le cyclisme le **poids du vélo** et la **position aérodynamique**. Cette spec ajoute :

- les niveaux d'**intensité** (constante partagée) ;
- la **famille** de chaque sport (`run`, `trail`, `bike`, `other`) ;
- un stockage des données athlète, **séparé** du profil de SPEC-06 ;
- les champs correspondants dans le bloc « Paramètres » de `EnergyCalculator`.

Aucune formule de calcul ne change. Aucune base de données, aucun réseau. TDD : test écrit et vu en échec AVANT le code.

### Constantes : `lib/intensity.ts` (créer)

```ts
export const INTENSITY_LEVELS = [
  { id: "endurance", label: "Endurance fondamentale", ratio: 0.6 },
  { id: "moderate", label: "Rythme modéré", ratio: 0.7 },
  { id: "sustained", label: "Rythme soutenu", ratio: 0.8 },
  { id: "race", label: "Compétition", ratio: 0.85 },
] as const;
export type IntensityId = (typeof INTENSITY_LEVELS)[number]["id"];
export function findIntensity(
  id: string,
): (typeof INTENSITY_LEVELS)[number] | undefined;

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
```

Les facteurs de vitesse par terrain sont dans 07.3 (modèle), pas ici : cette constante ne porte que les identifiants et libellés.

### Famille de sport : `lib/sports.ts` (modifier)

Ajouter à `Sport` un champ `family: "run" | "trail" | "bike" | "other"` et le renseigner pour les 10 sports existants : vélo route/VTT → `bike` ; course → `run` ; trail → `trail` ; ski de rando et randonnée → `other`. Ajouter `export function supportsGpx(sport: Sport): boolean` (vrai pour `run`, `trail`, `bike`). Aucun autre champ ni valeur de MET ne change. Adapter les tests.

### Stockage : `lib/athleteStorage.ts` (créer)

Clé séparée `kcalapp:athlete:v1` : ne modifie ni `profileStorage.ts` ni ses tests (SPEC-06). Même style : accès toujours dans un `try/catch`, lecture validée champ par champ.

```ts
export const ATHLETE_STORAGE_KEY = "kcalapp:athlete:v1";

export type AthleteSettings = {
  vmaKmh: string; // "" si non renseignée
  pmaWatts: string; // "" si non renseignée
  hasBike: boolean;
  bikeKg: string; // utilisé si hasBike
  bikePosition: BikePositionId;
};

export const EMPTY_ATHLETE: AthleteSettings; // tout vide, hasBike false, position "hoods"
```

Bornes (constantes exportées) : `VMA_KMH_MIN = 8`, `VMA_KMH_MAX = 30` ; `PMA_WATTS_MIN = 100`, `PMA_WATTS_MAX = 600` ; `BIKE_KG_MIN = 5`, `BIKE_KG_MAX = 25`. Nombres décimaux acceptés avec virgule (`parseDecimal` de `lib/energy.ts`) ; la PMA est un entier.

- `validateAthlete(values: AthleteSettings): Partial<Record<"vmaKmh" | "pmaWatts" | "bikeKg", string>>` : VMA et PMA sont **optionnelles** (vide = pas d'erreur) mais, si renseignées, dans les bornes. `bikeKg` est requis seulement si `hasBike`. Messages sur le modèle de `validateEffort` (« La VMA doit être entre 8 et 30 km/h. »).
- `loadAthlete(): AthleteSettings | null` : `null` si clé absente, JSON invalide, champ de type incorrect, valeur hors bornes ou `bikePosition` inconnue. Tout ou rien.
- `saveAthlete(values: AthleteSettings): void` : écrit ; ne lève jamais d'erreur (stockage indisponible).
- `clearAthlete(): void`.
- Si `hasBike` est faux, `bikeKg` n'est pas enregistré (chaîne vide) : aucune donnée inutile.

### Interface : `components/EnergyCalculator.tsx` (modifier)

Dans le bloc « Paramètres » (états Édition / Replié de SPEC-06), sous les champs actuels :

| Élément                  | Règle                                                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| « VMA (km/h) »           | champ texte `inputMode="decimal"`, optionnel                                                                                       |
| « PMA (W) »              | champ texte `inputMode="numeric"`, optionnel                                                                                       |
| Case « Ajouter un vélo » | affiche « Poids du vélo (kg) » et « Position aéro » (liste `BIKE_POSITIONS`, défaut « Mains en bas ») ; champs masqués si décochée |

- Sous chaque champ VMA / PMA, un `InfoTooltip` « ? » (cf. point 1 de `evolution-app.md`) explique brièvement le terme et que la valeur est une estimation à ajuster. Textes dans `lib/helpTexts.ts` (modifier : ajouts uniquement), formulés en information générale.
- Le bouton « Valider » existant enregistre profil **et** données athlète : il appelle `validateInputs` (profil, inchangé) puis `validateAthlete`. Une erreur de l'un ou de l'autre bloque l'enregistrement, laisse le bloc ouvert et met le focus sur le premier champ en erreur. Le profil est écrit via `saveProfile`, l'athlète via `saveAthlete`.
- Au chargement : `loadAthlete()` lu dans le même `useEffect` que `loadProfile()` ; les champs athlète sont préremplis s'ils existent. L'état replié reste piloté par la validité du **profil** (comportement SPEC-06 inchangé) : un `athlete` absent ne force pas le bloc ouvert.
- Le **poids du cycliste** est le poids du profil (SPEC-06), pas un nouveau champ.
- `EnergyCalculator` expose à son parent les données athlète via une nouvelle prop optionnelle `onAthleteChange?: (athlete: AthleteSettings, weightKg: string) => void`, appelée à chaque modification valide et au chargement. **Sans cette prop, comportement identique à aujourd'hui.** (Le parent `HomeContent` les passera à 07.5.)
- Reset du bloc Activité : ne touche pas aux données athlète (comme le profil).
- Aucun champ ne devient obligatoire pour « Calculer » : le calcul manuel (SPEC-05) fonctionne sans VMA ni PMA.

### Exemples de référence (à couvrir par des tests)

1. `findIntensity("moderate")?.ratio` = 0,7 ; les quatre ratios = 0,6 / 0,7 / 0,8 / 0,85 ; `findIntensity("x")` = `undefined`.
2. `supportsGpx` : vrai pour « Course à pied (modéré) », « Trail (intense) », « Vélo de route - VTT (modéré) » ; faux pour « Randonnée (modéré) » et « Ski de randonnée (intense) ».
3. `saveAthlete` puis `loadAthlete` : mêmes valeurs ; `loadAthlete` sans clé → `null`.
4. `loadAthlete` → `null` pour : JSON invalide, VMA = `"45"`, PMA = `"50"`, `hasBike` = chaîne, `bikePosition` = `"x"`, `bikeKg` = `"3"` avec `hasBike` vrai.
5. `loadAthlete` / `saveAthlete` avec `localStorage` qui lève → pas d'erreur, `null` en lecture.
6. `validateAthlete(EMPTY_ATHLETE)` → aucune erreur ; VMA `"31"` → erreur VMA ; `hasBike` vrai et `bikeKg` vide → erreur poids du vélo ; `hasBike` faux et `bikeKg` vide → aucune erreur.
7. UI : cocher « Ajouter un vélo » affiche « Poids du vélo (kg) » et « Position aéro » ; décocher les masque.
8. UI : « Valider » avec VMA `"45"` → erreur affichée, rien dans `kcalapp:athlete:v1` ni `kcalapp:profile:v1`, bloc ouvert, focus sur le champ VMA.
9. UI : « Valider » avec profil valide, VMA `"16"`, vélo coché à `"8"` → les deux clés sont écrites, bloc replié.
10. UI : au rechargement avec les deux clés valides → bloc replié ; au clic « Modifier mes paramètres », VMA et vélo sont préremplis.
11. UI : profil valide et clé athlète absente → bloc replié (comportement SPEC-06), champs athlète vides.
12. UI : sans la prop `onAthleteChange`, les tests SPEC-05 et SPEC-06 de `EnergyCalculator.test.tsx` restent verts sans modification ; avec elle, un « Valider » valide appelle le callback avec le poids du profil.

### Partie A — Toi (avant)

Rien à installer. Vérifier que `npm run test:run` passe avant de lancer l'agent. Relire les bornes VMA 8–30 km/h et PMA 100–600 W et la liste des positions (CdA) : elles sont des hypothèses.

### Partie B — Agent (TDD strict, un fichier à la fois, dans cet ordre)

1. `lib/intensity.test.ts` (exemple 1) → `lib/intensity.ts`.
2. `lib/sports.test.ts` (ajouter l'exemple 2 ; les tests existants ne changent pas) → `lib/sports.ts`.
3. `lib/athleteStorage.test.ts` (exemples 3 à 6) → `lib/athleteStorage.ts`.
4. `lib/helpTexts.test.ts` (ajouter : textes VMA et PMA non vides) → `lib/helpTexts.ts` (ajouts).
5. `components/EnergyCalculator.test.tsx` (ajouts, exemples 7 à 12 ; `localStorage` vidé avant chaque test) → `components/EnergyCalculator.tsx`.

### Fichiers à créer / modifier

- specs/SPEC-07.2.md (créé)
- lib/intensity.ts + lib/intensity.test.ts (créer)
- lib/athleteStorage.ts + lib/athleteStorage.test.ts (créer)
- lib/sports.ts + lib/sports.test.ts (modifier : champ `family`, `supportsGpx`)
- lib/helpTexts.ts + lib/helpTexts.test.ts (modifier : ajouts uniquement)
- components/EnergyCalculator.tsx + components/EnergyCalculator.test.tsx (modifier)

`lib/profileStorage.ts`, `lib/energy.ts`, `lib/effort.ts`, `lib/nutrition*.ts`, `components/HomeContent.tsx` : inchangés. Si un test existant hors liste casse, s'arrêter et le signaler.

### Contraintes

Voir [SPEC-07](SPEC-07.md) (contraintes communes). En plus :

- Ne pas dupliquer `parseDecimal` ni les bornes de poids : les importer de `lib/energy.ts`.
- Accès au `localStorage` uniquement dans `lib/athleteStorage.ts`.
- `profileStorage.ts` n'est pas modifié : aucune clé ni validation de SPEC-06 ne change.
- Les nouveaux champs ne retirent ni ne renomment aucun label existant ; les libellés « VMA (km/h) », « PMA (W) », « Ajouter un vélo », « Poids du vélo (kg) », « Position aéro » sont imposés et ne doivent pas entrer en collision avec un texte du calculateur ou de la nutrition (`getByLabelText` unique).

### Critères d'acceptation (vérifiables par commande)

- [ ] `npm run test:run`, `npm run typecheck` et `npm run lint` passent
- [ ] `lib/intensity.test.ts` couvre l'exemple 1 ; `lib/sports.test.ts` l'exemple 2 ; `lib/athleteStorage.test.ts` les exemples 3 à 6
- [ ] `components/EnergyCalculator.test.tsx` couvre les exemples 7 à 12
- [ ] `grep -rn "localStorage" components app` ne retourne rien
- [ ] `grep -nE "#[0-9a-fA-F]{3,8}|gray-|bg-black|bg-white|text-black|text-white" components app` ne retourne rien
- [ ] `grep -rn "fetch" app components lib` ne retourne rien
- [ ] `git diff --stat` : seuls les fichiers listés sont modifiés ; `lib/profileStorage.ts` n'apparaît pas

### Partie C — Toi (après)

`npm run dev` : à 320 / 390 / 768 px, renseigner profil + VMA + vélo, « Valider », recharger (tout revient, bloc replié), vérifier la clé `kcalapp:athlete:v1` dans les DevTools. Vérifier le clavier (focus après erreur, case à cocher) et les infobulles. Commit uniquement après `npx tsc --noEmit` et les tests, avec ton accord.

### Hors périmètre

Estimation de la VMA ou de la PMA depuis un test ou une performance, zones d'entraînement, résumé des valeurs athlète dans le bloc replié, bouton « Effacer mes données athlète » (`clearAthlete` est exposé et testé, sans bouton), synchronisation avec une base de données (point 4), plusieurs vélos.
