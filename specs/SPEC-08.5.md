## SPEC-08.5 — Point 7 : page 1 saisie seule, page 2 Résultats

### Contexte

Dernière brique de [SPEC-08](SPEC-08.md), après [08.4](SPEC-08.4.md) (React Hook Form, `components/forms/*`). Les fondations (schémas Zod, stockage générique, Providers, RHF) permettent maintenant de déplacer des blocs sans recâbler de callbacks.

Point 7 de [evolution-app.md](evolution-app.md) : la page 1 ne sert qu'à la saisie, la page 2 regroupe tous les résultats.

État actuel (après 08.4) :

- **Page 1 (`/`)** : Paramètres, Activité (+ bouton « Calculer »), Résultats énergie, Plafond à respecter, Produits, Boisson, boutons « Calculer ma nutrition » / « Réinitialiser la nutrition ». En mode GPX, le bloc Activité affiche aussi le profil altimétrique et le tableau des temps de passage (`SplitsTable`).
- **Page 2 (`/nutrition`)** : lien « Modifier mes données », section Rappel, Résultats nutrition, section Plafonds (jauges), Timeline.

Points techniques :

- Le bouton unique de la page 1 doit valider deux formulaires frères (`EnergyCalculator` et `NutritionPlanner`) : la logique des formulaires remonte dans deux hooks appelés par `HomeContent`, qui orchestre.
- Le calcul d'allure GPX vit aujourd'hui dans un `useMemo` de `GpxActivity` ; la page 2 en a besoin pour le profil et les splits : il est extrait en fonction pure dans `lib/`.
- La trace GPX reste en mémoire (`ActivityProvider`), jamais stockée.
- React Compiler actif : `useWatch`, jamais `watch()`.

### Répartition cible

| Page 1 (`/`) — saisie | Page 2 (`/nutrition`) — résultats |
| --- | --- |
| **Paramètres** : replié si un profil est en `localStorage` (inchangé) | Lien « Modifier mes données » |
| **Activité** : sport, mode, GPX (import, intensité, terrain, durée estimée — **sans** profil altimétrique ni splits) ou saisie manuelle ; **Plafond à respecter** en fin de bloc ; bouton « Reset » seul | Info-bulle « Rappel » (sport, durée, produits, boisson, stratégie) |
| **Alimentation** : Produits, Boisson | Section **Résultats**, quatre sous-blocs `<h3>` : |
| Boutons « Voir mes résultats » et « Réinitialiser la nutrition » | · **Dépense énergétique** : coût de l'effort, dépense journalière, métabolisme de base, part de l'effort |
| | · **Récap produits** : unités par produit, liquide, facteur limitant, totaux, avertissements, jauges glucides / sodium / eau |
| | · **Profil altimétrique** : profil + tableau des temps de passage (mode GPX uniquement) |
| | · **Timeline** |

### Changements visibles (liste fermée)

1. Page 1 : plus de bouton « Calculer » ni de bloc « Résultats ».
2. « Plafond à respecter » passe en fin du bloc « Activité ».
3. Mode GPX, page 1 : profil altimétrique et tableau des temps de passage disparaissent (le résumé « Durée estimée » reste).
4. « Calculer ma nutrition » devient **« Voir mes résultats »**. Il valide, dans cet ordre, en affichant toutes les erreurs :
   1. **Paramètres** : bloc ouvert → même effet que « Valider » (enregistrement, ou erreurs + focus RHF sur le premier champ invalide). Bloc replié avec profil enregistré → valide sans resoumettre.
   2. **Activité** : erreurs Sport / Distance / Vitesse vides affichées (ex-effet de « Calculer »).
   3. **Nutrition** : règles actuelles de « Calculer ma nutrition » (produit, plafonds, boisson).
   
   Navigation vers `/nutrition` seulement si les trois sont valides et `minutes !== null`.
5. Page 2 : h1 « Résultats » ; le Rappel devient une info-bulle ; les résultats énergie, le profil et les splits y apparaissent ; la section « Plafonds » disparaît (ses jauges passent dans « Récap produits »).
6. Page 2 : « Données introuvables » aussi quand aucun profil n'est enregistré.

Inchangés : messages d'erreur (au mot près), libellés des champs, `data-testid` existants (`results`, `effort-kcal`, `tdee`, `bmr`, `effort-share`, `nutrition-*`, `gpx-summary`, `gpx-duration`, `gpx-profile`, `gpx-splits`), `id` des info-bulles d'aide. Ils sont **déplacés**, pas renommés.

### Comportement

**Calcul GPX partagé** — `lib/gpxPacing.ts` (créer)

```ts
export type GpxOutcome =
  | { kind: "idle" }
  | { kind: "error"; message: string; settingsAction: boolean }
  | { kind: "ready"; result: PacingResult; bike: boolean };

export function computeGpxOutcome(input: {
  track: Track | null;
  sport: Sport;
  athlete: AthleteSettings;
  weightKg: string;
  intensity: IntensityId;
  terrain: TerrainId;
}): GpxOutcome;
```

- Corps = le `useMemo` actuel de `GpxActivity` **déplacé tel quel** (mêmes gardes, mêmes bornes). Les constantes `VMA_MESSAGE`, `BIKE_MESSAGE`, `BIKE_WEIGHT_MESSAGE`, `BOUNDS_MESSAGE` et `defaultBikePosition` déménagent avec lui et sont exportées.
- `GpxActivity` l'appelle dans un `useMemo` ; il publie toujours `gpxMinutesChanged` (durée du contexte inchangée).
- La page 2 l'appelle avec le profil et l'athlète **enregistrés** (`useUserSettings()`), cohérents avec la page 1 puisque « Voir mes résultats » exige des Paramètres validés.

**Orchestration page 1**

- `components/forms/useSettingsForm.ts` (créer) : reprend d'`EnergyCalculator` le `useForm` Paramètres (mêmes options), `profileOpen`, le focus différé (`pendingFocusRef`, `modifyButtonRef`), `onValidProfile`, `handleEditProfile`, `handleOpenSettings`. Expose en plus `validateProfile(): Promise<boolean>` :
  - bloc replié et profil enregistré → `true` ;
  - sinon `handleSubmit(onValidProfile)()` → `true` si `onValidProfile` a tourné.
- `components/forms/useNutritionForms.ts` (créer) : reprend de `NutritionPlanner` les trois `useForm` (`productForm`, `capsForm`, `drinkForm`), `submitForm`, `formOpen`, `openDrink`, `editingId`, `handleReset`. Expose `submitAll(): Promise<boolean>` = `handleCalculate` actuel **sans** le test `minutes === null` ni le `router.push`.
- `HomeContent` :
  - appelle `useSettingsForm()` et `useNutritionForms()` (après la garde `status === "loading"`, déplacée dans un composant enfant si nécessaire pour respecter les règles des hooks) ;
  - tient `attempted` (remplace `submitted` d'`EnergyCalculator`) ;
  - `handleShowResults` (`async`) : `const settingsOk = await validateProfile(); setAttempted(true); const nutritionOk = await submitAll();` puis, si `settingsOk && activityOk && nutritionOk && minutes !== null` → `router.push("/nutrition")`. `activityOk` = aucune erreur Sport / effort (mêmes fonctions que `EffortFields` : `validateInputs` / `validateEffort`, ou `minutes !== null` en mode GPX). Les trois validations s'exécutent toujours (toutes les erreurs visibles).
- `EnergyCalculator` (props : `settings`, `showEmptyErrors`, `onReset`, `caps: ReactNode`) : rend Paramètres et Activité ; `caps` est rendu en fin du bloc Activité. Plus de `<form onSubmit>`, plus de bouton « Calculer », plus de bloc Résultats, plus de `computeEnergyResults`. « Reset » : comportement actuel + `onReset()` (remet `attempted` à `false`).
- `caps` construit par `HomeContent` : `<h3>` « Plafond à respecter » + `InfoTooltip` `help-caps` (repris de `NutritionPlanner`) + `<FormProvider {...capsForm}><CapsFields /></FormProvider>`.
- `NutritionPlanner` (props : `forms`, `onShowResults`) : rend Produits et Boisson ; garde ses deux boutons ; « Voir mes résultats » appelle `onShowResults`. Plus de section « Plafond à respecter ».

**Page 2 — `components/results/`** (créer)

| Fichier | Contenu |
| --- | --- |
| `EnergySummary.tsx` | JSX « Résultats » d'`EnergyCalculator` déplacé (tuiles, `InfoTooltip` `help-tdee` / `help-bmr`, `data-testid` conservés). `computeEnergyResults` à partir de `useUserSettings().profile`, `useActivity()` (sport, `minutes`) et `ACTIVITY_LEVELS[profile.activityIndex]` |
| `ProductRecap.tsx` | Tuiles produits / liquide, facteur limitant (`help-limiting-factor`), totaux, énergie ingérée, avertissements ; puis `CapGauge` (déplacé de `NutritionPlanView`) et les trois jauges |
| `CourseProfile.tsx` | `ElevationProfile` + `SplitsTable` à partir de `computeGpxOutcome` ; ne rend rien si `activity.inputMode !== "gpx"`, sans trace ou si l'issue n'est pas `ready`. Mention « Altitude absente de la trace… » déplacée ici |

`NutritionPlanView` :

- garde `buildPlanState` ; ajoute la condition « profil enregistré » (sinon `missing`) ;
- garde le lien « Modifier mes données » ;
- Rappel : `InfoTooltip` `id="help-rappel"`, `label="Rappel de l'activité"`, `title="Rappel"`, contenu = `<dl>` actuel + ligne « Sport » en tête ;
- section « Résultats » (`aria-labelledby="titre-resultats"`) avec quatre sous-blocs titrés `<h3>` : « Dépense énergétique » (`EnergySummary`), « Récap produits » (`ProductRecap`), « Profil altimétrique » (`CourseProfile`, sous-bloc absent si rien à afficher), « Timeline » (`NutritionTimeline`) ;
- plus de section `titre-rappel` ni `titre-plafonds`.

`app/nutrition/page.tsx` : h1 « Résultats », sous-titre « Dépense énergétique, produits, profil et progression des apports pendant l'effort. »

### Exemples de référence

**Nouveaux tests — `lib/gpxPacing.test.ts`**

1. Course à pied, VMA valide, trace valide → `kind: "ready"`, `bike: false`.
2. Course à pied, VMA vide → `{ kind: "error", message: VMA_MESSAGE, settingsAction: true }`.
3. Vélo, vélo coché sans poids → `{ kind: "error", message: BIKE_WEIGHT_MESSAGE, settingsAction: false }`.
4. `track: null` → `{ kind: "idle" }`.

**`components/HomeContent.test.tsx`**

5. Profil vide → « Voir mes résultats » → erreurs Paramètres, focus sur « Homme », pas de navigation.
6. Profil enregistré, sport vide → message d'erreur Sport actuel affiché, pas de navigation.
7. Profil, activité et nutrition valides → `push("/nutrition")`.
8. Page 1 : aucun `data-testid="results"`, aucun bouton « Calculer » ; « Plafond à respecter » est dans la région « Activité ».
9. Mode GPX avec trace valide : `gpx-summary` présent, `gpx-profile` et `gpx-splits` absents.

**`components/results/EnergySummary.test.tsx`**

10. Valeurs de référence actuelles déplacées d'`EnergyCalculator.test.tsx` (`tdee` 2267, `effort-kcal` 484, variations du niveau d'activité et de la durée).

**`components/results/CourseProfile.test.tsx`**

11. Exemples 10 et 11 de `GpxActivity.test.tsx` déplacés (trace sans altitude : mention, pas de profil, tableau présent ; profil accessible et dernière ligne partielle).
12. Mode manuel → ne rend rien.

**`components/NutritionPlanView.test.tsx`**

13. La région « Résultats » contient les `<h3>` « Dépense énergétique », « Récap produits », « Timeline » ; « Profil altimétrique » seulement avec une trace GPX.
14. Bouton « Rappel de l'activité » → panneau avec sport, durée et produits.
15. Profil non enregistré → « Données introuvables ».

**Tests existants modifiés (autorisés, et seulement ceux-ci)**

- `EnergyCalculator.test.tsx` : tests du bouton « Calculer » et des Résultats (déplacés vers ex. 6 et ex. 10).
- `HomeContent.test.tsx`, `NutritionPlanner.test.tsx` : libellé « Calculer ma nutrition » → « Voir mes résultats ».
- `GpxActivity.test.tsx` : exemples 10 et 11 (déplacés vers ex. 11).
- `NutritionPlanView.test.tsx` : test de la région « Rappel » et des jauges (nouvel emplacement).
- `app/nutrition/page.test.tsx` : h1.

Tout autre test existant qui échoue : **s'arrêter et le signaler**.

### Partie A — Toi (avant)

- SPEC-08.4 relue et commitée avec ton accord ; créer la branche `SPEC-08.5`.
- `npm run test:run` vert.
- Relire cette spec, en particulier la liste fermée des changements visibles et l'orchestration par `HomeContent`.

### Partie B — Agent (dans cet ordre, `npm run test:run` après chaque étape)

1. Ex. 1 à 4 vus en échec → `lib/gpxPacing.ts` ; `GpxActivity` l'utilise (aucun test existant modifié).
2. Ex. 10 vu en échec → `components/results/EnergySummary.tsx`.
3. Ex. 11-12 vus en échec → `components/results/CourseProfile.tsx`.
4. Ex. 13 à 15 vus en échec → `ProductRecap.tsx`, `NutritionPlanView` restructurée, `app/nutrition/page.tsx`.
5. Ex. 5 à 8 vus en échec → `useSettingsForm`, `useNutritionForms`, `HomeContent` orchestrateur, `EnergyCalculator` et `NutritionPlanner` allégés, Plafonds déplacés.
6. Ex. 9 vu en échec → profil et splits retirés de `GpxActivity`.
7. `npm run typecheck`, `npm run lint` (aucun nouveau warning), suite complète.

### Fichiers à créer / modifier

- specs/SPEC-08.md (lien vers cette sous-spec), specs/SPEC-08.5.md (créé)
- lib/gpxPacing.ts, lib/gpxPacing.test.ts (créer)
- components/forms/useSettingsForm.ts, components/forms/useNutritionForms.ts (créer)
- components/results/EnergySummary.tsx, components/results/EnergySummary.test.tsx, components/results/ProductRecap.tsx, components/results/CourseProfile.tsx, components/results/CourseProfile.test.tsx (créer)
- components/HomeContent.tsx, components/EnergyCalculator.tsx, components/NutritionPlanner.tsx, components/GpxActivity.tsx, components/NutritionPlanView.tsx, app/nutrition/page.tsx (modifier)
- components/HomeContent.test.tsx, components/EnergyCalculator.test.tsx, components/NutritionPlanner.test.tsx, components/GpxActivity.test.tsx, components/NutritionPlanView.test.tsx, app/nutrition/page.test.tsx (modifier, dans les limites ci-dessus)

Tout autre fichier est inchangé, en particulier : `package.json`, `components/providers/*`, `lib/*Storage.ts`, `lib/storage.ts`, `lib/schemas/*`, `components/forms/*Fields.tsx`, `components/forms/styles.ts`, `ElevationProfile.tsx`, `SplitsTable.tsx`, `NutritionTimeline.tsx`, `InfoTooltip.tsx`, `lib/pacingRun.ts`, `lib/pacingBike.ts`.

### Critères d'acceptation

Commandes de la liste fermée uniquement ; les recherches se font avec l'outil de recherche de l'agent.

- [ ] `npm run test:run`, `npm run typecheck` et `npm run lint` passent (aucun nouveau warning)
- [ ] Exemples 1 à 15 couverts ; seuls les tests existants listés ci-dessus sont modifiés
- [ ] `git status` : seuls les fichiers listés ci-dessus apparaissent
- [ ] Recherche `name: "Calculer"` et `Calculer ma nutrition` dans `components/` et `app/` : aucun résultat
- [ ] Recherche `ElevationProfile|SplitsTable` dans `components/GpxActivity.tsx` : aucun résultat
- [ ] Recherche `computeBikePacing|computeRunPacing` dans `components/` : aucun résultat
- [ ] Recherche `computeEnergyResults` dans `components/EnergyCalculator.tsx` : aucun résultat
- [ ] Recherche `titre-plafonds|titre-rappel` dans `components/NutritionPlanView.tsx` : aucun résultat
- [ ] Recherche `watch\(` dans `components/` : aucun résultat (seulement `useWatch`)
- [ ] Chaque fichier de `components/` fait moins de 500 lignes
- [ ] Aucun `any`, aucun cast `as` vers un type de domaine dans les fichiers créés (relecture du diff)
- [ ] `package.json` inchangé
- [ ] Critères d'acceptation de l'ensemble de [SPEC-08](SPEC-08.md) cochés

### Partie C — Toi (après)

`npm run dev` :

1. Profil vide → « Voir mes résultats » : erreurs Paramètres, focus sur « Homme », pas de navigation.
2. Profil valide, sport vide → erreur Sport ; plafond `5` → erreur plafond ; rien ne navigue.
3. Saisie manuelle valide → page 2 : Dépense énergétique, Récap produits (avec jauges), Timeline ; pas de Profil altimétrique ; « Rappel » s'ouvre et se ferme par « × ».
4. Trace GPX → page 1 : durée estimée, sans profil ni tableau ; page 2 : profil + tableau ; « Modifier mes données » → trace, sport et effort conservés.
5. Recharger `/nutrition` → « Données introuvables ».
6. Mobile : cibles ≥ 44 px, focus visible, animations `motion-safe:`, aucun débordement horizontal.

Commit uniquement après `npx tsc --noEmit` et les tests, avec ton accord.

### Hors périmètre

- Renommage de la route `/nutrition`.
- Export du plan sur le profil altimétrique (point 6).
- `lib/nutrition.ts` et code mort (point 10).
- Refonte visuelle des tuiles et des jauges (déplacement uniquement).
