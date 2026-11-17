## SPEC-05 — Durée de l'effort dérivée d'une distance et d'une vitesse / allure

### Contexte

SPEC-04 est livrée (liste de produits, stratégies). Cette SPEC implémente le point 2 de `specs/evolution-app.md` : le champ « Durée (minutes) » du bloc Activité (`EnergyCalculator`) est remplacé par deux saisies, une **distance** et une **vitesse** (km/h) ou une **allure** (min/km). La durée est calculée, plus saisie.

Le reste de l'application continue de raisonner en minutes (`NutritionPlanner`, `NutritionPlanView`, `computeEnergyResults`, timeline) : seule la source de la valeur change. Aucune formule de nutrition ou d'énergie ne change.

Aucune base de données, aucun réseau, calcul côté client. TDD : chaque fichier a son test écrit et vu en échec AVANT le code.

### Règles métier : `lib/effort.ts` (créer)

Une seule fonction de calcul de durée, réutilisable plus tard par le point 5 (GPX / VMA / PMA).

```ts
export const SPEED_UNITS = ["kmh", "minkm"] as const;
export type SpeedUnit = (typeof SPEED_UNITS)[number];

export type EffortFormValues = {
  distanceKm: string;
  speed: string; // « 12,5 » en km/h, « 5:30 » en min/km
  speedUnit: SpeedUnit;
};
```

Bornes (constantes exportées) :

| Constante                      | Valeur     | Remarque                                         |
| ------------------------------ | ---------- | ------------------------------------------------ |
| `DISTANCE_KM_MIN` / `_MAX`     | 0,1 / 1000 | décimales acceptées (virgule ou point)           |
| `SPEED_KMH_MIN` / `_MAX`       | 1 / 100    |                                                  |
| `PACE_SEC_PER_KM_MIN` / `_MAX` | 36 / 3600  | = 0:36 à 60:00 min/km (inverse de 100 et 1 km/h) |

La durée résultante doit rester dans `MINUTES_MIN`–`MINUTES_MAX` (`lib/nutrition.ts`, 1 à 1440 minutes). Au-delà de 24 h : erreur, pas de plafonnement silencieux.

Fonctions pures :

- `parsePace(text: string): number | null` : « m:ss » ou « mm:ss » vers des **secondes par km**. Secondes entre 00 et 59, minutes ≥ 0, sinon `null`. Un entier seul (« 5 ») est refusé : le format `mm:ss` est imposé.
- `formatPace(secPerKm: number): string` : « 5:30 » (secondes arrondies, report à la minute si 60 s).
- `speedToKmh(raw: string, unit: SpeedUnit): number | null` : km/h → `parseDecimal` ; min/km → `3600 / parsePace`. `null` si invalide ou nulle.
- `convertSpeed(raw: string, from: SpeedUnit, to: SpeedUnit): string` : conversion pour la bascule d'unité (km/h arrondi à 0,1 ; allure à la seconde). Si `raw` est invalide ou vide, retourne `""`.
- `computeDurationMinutes(distanceKm: number, speedKmh: number): number` : `Math.round(distanceKm / speedKmh × 60)` (entier : `?min=` reste un entier).
- `formatDuration(minutes: number): string` : « 45 min », « 2 h 05 min », « 2 h » (pas de « 0 min »).
- `computeEffortDuration(values: EffortFormValues): { minutes: number; speedKmh: number } | null` : enchaîne les fonctions ci-dessus. `null` si une valeur est invalide.
- `validateEffort(values: EffortFormValues): Partial<Record<"distanceKm" | "speed", string>>` : messages en français, un par champ.

Messages d'erreur attendus :

| Cas                              | Champ        | Message                                                         |
| -------------------------------- | ------------ | --------------------------------------------------------------- |
| Distance vide                    | `distanceKm` | « La distance est obligatoire. »                                |
| Distance hors bornes             | `distanceKm` | « La distance doit être entre 0,1 et 1000 km. »                 |
| Vitesse vide / allure vide       | `speed`      | « La vitesse est obligatoire. » / « L'allure est obligatoire. » |
| Vitesse nulle ou hors bornes     | `speed`      | « La vitesse doit être entre 1 et 100 km/h. »                   |
| Allure mal formée                | `speed`      | « L'allure doit être au format mm:ss (ex. 5:30). »              |
| Allure hors bornes               | `speed`      | « L'allure doit être entre 0:36 et 60:00 min/km. »              |
| Durée calculée > 24 h ou < 1 min | `distanceKm` | « La durée calculée doit être entre 1 minute et 24 h. »         |

La validation de durée n'est évaluée que si distance et vitesse sont valides chacune de leur côté.

### Unité par défaut selon le sport : `lib/sports.ts` (modifier)

- `Sport` reçoit `defaultSpeedUnit: SpeedUnit`.
- Proposition (à valider) : vélo → `kmh` ; course, trail → `minkm` ; ski de randonnée, randonnée → `kmh`.
- Les `id`, `label` et `met` existants ne changent pas.
- Comportement dans l'UI : le choix du sport définit l'unité **seulement si le champ vitesse est encore vide**. Si l'utilisateur a déjà saisi une vitesse, l'unité choisie manuellement est conservée (pas de saisie perdue).

### Modifier `lib/energy.ts`

- `EnergyFormValues` conserve `minutes: string` : c'est désormais la valeur **dérivée** (`String(minutes)` ou `""`), renseignée par le calculateur. `computeEnergyResults` est inchangée.
- `validateInputs` n'émet plus d'erreur sur `minutes` (règle supprimée) : les erreurs de durée viennent de `validateEffort`, sinon l'erreur serait doublée.
- `MINUTES_MAX` reste exporté (utilisé par d'autres fichiers). Pas de nouvelle duplication : `lib/effort.ts` importe `MINUTES_MIN` et `MINUTES_MAX` de `lib/nutrition.ts`.

### Interface

`components/EnergyCalculator.tsx` (modifier) :

- Ordre des champs : Sexe, Âge, Poids, Taille, **Sport**, puis **Distance**, puis **Vitesse / Allure**. Le sport est choisi avant la durée.
- Champ « Distance (km) » : `type="text"`, `inputMode="decimal"`, `id="distance"`.
- Champ « Vitesse (km/h) » ou « Allure (min/km) » : `id="vitesse"`, `inputMode="decimal"` en km/h, `inputMode="numeric"` + `placeholder="5:30"` en min/km. Le libellé suit l'unité.
- Bascule d'unité : groupe de 2 boutons radio (style `CHIP` existant, cibles ≥ 44 px) « km/h » / « min/km », au-dessus du champ. Basculer **convertit** la valeur saisie (`convertSpeed`).
- Ligne d'information sous les champs, `role="status"`, `aria-live="polite"`, visible seulement si la durée est calculable : « Durée de l'effort : 2 h 05 min · soit 12 km/h » (ou « soit 5:00 min/km » : l'unité inverse de celle saisie). `data-testid="effort-duration"`.
- Erreurs : même mécanique que l'existant (`aria-invalid`, `aria-describedby`, `role="alert"`, ids `erreur-distance` et `erreur-vitesse`), affichées après la soumission ou la première interaction, comme les autres champs.
- Le champ `id="duree"` et l'erreur `erreur-duree` disparaissent.
- `onMinutesChange` est appelée avec la durée dérivée (`String(minutes)`) ou `""` si non calculable, et `""` au Reset. La prop `initialMinutes` est remplacée par `initialEffort?: EffortFormValues`.
- Reset : remet distance, vitesse et unité (celle par défaut du sport vide : `kmh`) à zéro.

`components/HomeContent.tsx` (modifier) :

- Restauration depuis l'URL : paramètres `km`, `v` (texte brut de la vitesse ou allure) et `u` (`kmh` | `minkm`). Les trois sont validés avec `validateEffort` ; si l'un est invalide, **les trois sont ignorés**.
- L'ancien paramètre `min` n'est plus lu sur la page d'accueil.
- `minutes` transmis à `NutritionPlanner` vient de `onMinutesChange`, inchangé.

`components/NutritionPlanner.tsx` (modifier : un seul changement) :

- Le `router.push` vers la page plan transmet aussi l'effort pour que le lien retour le restaure : `/nutrition?min=${duration}&km=…&v=…&u=…`. Pour cela `NutritionPlanner` reçoit une prop `effort: EffortFormValues` en plus de `minutes`. Valeurs passées par `URLSearchParams` (encodage des `:` et des virgules).

`components/NutritionPlanView.tsx` (modifier : un seul changement) :

- `?min=` reste la source de la durée du plan (inchangé).
- Le lien « Retour » construit `/?km=…&v=…&u=…` à partir des paramètres reçus si présents et valides ; sinon `/`. Plus de `/?min=…`.

### Exemples de référence (à couvrir par des tests)

1. 10 km à 5:00 min/km → 50 min (vitesse équivalente 12 km/h).
2. 10 km à 12 km/h → 50 min. Même résultat que l'exemple 1.
3. 100 km à 25 km/h → 240 min, affiché « 4 h ».
4. 21,1 km à 5:30 min/km → 116 min (arrondi de 116,05), affiché « 1 h 56 min ».
5. Virgule décimale : « 21,1 » et « 21.1 » donnent la même durée.
6. Allure « 5:60 », « 5:5x », « 5 », « abc », « 0:00 » → erreur de format ou de bornes, durée `null`.
7. Vitesse 0 km/h, négative, > 100 → erreur.
8. 1000 km à 10 km/h = 6000 min → erreur « durée calculée » (> 24 h).
9. 0,1 km à 100 km/h = 0,06 min → arrondi à 0 → erreur « durée calculée » (< 1 min).
10. `convertSpeed("12", "kmh", "minkm")` = « 5:00 » ; `convertSpeed("5:00", "minkm", "kmh")` = « 12 » ; `convertSpeed("abc", …)` = « ».
11. `formatPace` : 330 → « 5:30 » ; 359.6 → « 6:00 » (pas « 5:60 »).
12. `formatDuration` : 45 → « 45 min » ; 125 → « 2 h 05 min » ; 120 → « 2 h ».
13. Choix d'un sport « course » avec champ vitesse vide : unité `min/km` ; choix « vélo » : `km/h`.
14. Sport choisi, vitesse déjà saisie en km/h, changement de sport : unité et valeur conservées.
15. Bascule km/h → min/km avec « 12 » : le champ affiche « 5:00 » et la ligne de durée est identique.
16. La ligne `effort-duration` apparaît quand les valeurs sont valides, disparaît sinon ; `onMinutesChange` reçoit « 50 » puis « ».
17. Reset : champs vidés, `onMinutesChange("")`.
18. URL `/?km=10&v=5:00&u=minkm` : champs préremplis. URL avec `u=xx` ou `km=abc` : champs vides.
19. Lancer le plan depuis le calculateur : navigation vers `/nutrition?min=50&km=10&v=5%3A00&u=minkm` ; le lien Retour de la page plan restaure les champs.
20. `validateInputs` (energy) ne retourne plus d'erreur sur `minutes`.

### Partie A — Agent (TDD strict, un fichier à la fois, dans cet ordre)

1. `lib/effort.test.ts` → `lib/effort.ts` (exemples 1 à 12)
2. `lib/sports.test.ts` (ajouts) → `lib/sports.ts`
3. `lib/energy.test.ts` (adapter les tests sur `minutes`) → `lib/energy.ts`
4. `components/EnergyCalculator.test.tsx` (adapter + ajouts) → `components/EnergyCalculator.tsx`
5. `components/HomeContent.test.tsx` (adapter) → `components/HomeContent.tsx`
6. `components/NutritionPlanner.test.tsx` (ajout sur le push) → `components/NutritionPlanner.tsx`
7. `components/NutritionPlanView.test.tsx` (ajout sur le lien retour) → `components/NutritionPlanView.tsx`

### Fichiers à créer / modifier

- `lib/effort.ts` + `lib/effort.test.ts` (créer)
- `lib/sports.ts` + `lib/sports.test.ts` (modifier : ajout de `defaultSpeedUnit`)
- `lib/energy.ts` + `lib/energy.test.ts` (modifier : règle `minutes` retirée de `validateInputs`)
- `components/EnergyCalculator.tsx` + test (modifier)
- `components/HomeContent.tsx` + test (modifier)
- `components/NutritionPlanner.tsx` + test (modifier : prop `effort` et URL du push uniquement)
- `components/NutritionPlanView.tsx` + test (modifier : lien retour uniquement)

Les autres fichiers (`lib/nutrition.ts`, `lib/nutritionStorage.ts`, `lib/products.ts`, `lib/strategies.ts`, `lib/helpTexts.ts`, `components/NutritionTimeline.tsx`, `components/InfoTooltip.tsx`, `app/**`) restent inchangés. Si un test existant hors liste casse (`app/page.test.tsx`, `app/nutrition/page.test.tsx`), s'arrêter et le signaler.

### Contraintes

- TypeScript strict, pas de `any`.
- Test écrit et vu en échec avant chaque code.
- Aucune nouvelle dépendance.
- Aucun `fetch`, aucune API Route.
- Avant de créer un utilitaire, consulter `catalogue.md` (`parseDecimal` existe déjà dans `lib/energy.ts` : le réutiliser).
- Couleurs uniquement via les tokens du thème (aucun hex, `gray-*`, `bg-black/white`, `text-black/white` dans les `.tsx`).
- Mobile-first, cibles tactiles ≥ 44 px, focus visible, animations `motion-safe:` uniquement.
- Wording : information générale, pas de conseil médical.
- Ne modifier aucun autre fichier que ceux listés. Pas de commit ni de push.
- Commandes autorisées (liste fermée) : `npm run typecheck` · `npm run lint` · `npm run test:run` · `git status` · `git diff`. Toute autre commande : s'arrêter et demander. Pas de `npm run build`.
- Tout écart par rapport à la SPEC : s'arrêter et le signaler, ne pas corriger en silence.

### Critères d'acceptation (vérifiables par commande)

- [ ] `npm run test:run` passe
- [ ] `npm run typecheck` passe
- [ ] `npm run lint` passe
- [ ] `lib/effort.test.ts` couvre les exemples 1 à 12
- [ ] `components/EnergyCalculator.test.tsx` couvre les exemples 13 à 17
- [ ] `components/HomeContent.test.tsx`, `NutritionPlanner.test.tsx` et `NutritionPlanView.test.tsx` couvrent les exemples 18 et 19
- [ ] `lib/energy.test.ts` couvre l'exemple 20
- [ ] `grep -rn "Durée (minutes)" components app` ne retourne rien
- [ ] `grep -nE "#[0-9a-fA-F]{3,8}|gray-|bg-black|bg-white|text-black|text-white" components app` ne retourne rien
- [ ] `grep -rn "fetch" app components lib` ne retourne rien
- [ ] `git diff --stat` : seuls les fichiers listés sont modifiés

### Partie C — Toi (après)

- `npm run dev`, vérifier à 320 / 390 / 768 px : saisie distance + vitesse, saisie distance + allure, bascule d'unité, ligne de durée, erreurs, Reset.
- Vérifier le parcours complet : calculer, ouvrir le plan, utiliser le lien Retour (les champs doivent revenir).
- Vérifier au clavier et avec `prefers-reduced-motion`.
- Relire les messages d'erreur et le libellé de la ligne de durée.
- Commit uniquement après `npx tsc --noEmit` et les tests, avec ton accord.

### Hors périmètre

- Points 3 à 8 de `evolution-app.md` (le point 5 réutilisera `computeDurationMinutes`, mais le parsing GPX, la VMA/PMA et le profil altimétrique ne sont pas traités ici).
- Saisie directe d'une durée en alternative (retirée volontairement, cf. point 2).
- Prise en compte du dénivelé dans la vitesse ou la dépense énergétique (MET inchangé).
- Mémorisation de la distance et de la vitesse dans le `localStorage`.
- Création d'`AGENTS.md`.
