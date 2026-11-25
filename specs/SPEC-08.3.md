## SPEC-08.3 — `UserSettingsProvider` + `ActivityProvider`, fin des callbacks et des paramètres d'URL

### Contexte

Troisième brique de [SPEC-08](SPEC-08.md), après [08.1](SPEC-08.1.md) (schémas Zod) et [08.2](SPEC-08.2.md) (`lib/storage.ts`, lecture par `safeParse`).

Aujourd'hui les données circulent ainsi :

| Donnée | Chemin actuel |
| --- | --- |
| Profil, athlète | `loadProfile` / `loadAthlete` dans un `useEffect` de `EnergyCalculator` |
| Plafonds, produits, boisson | `loadNutrition` dans un `useEffect` de `NutritionPlanner` **et** de `NutritionPlanView` (relu, puis revalidé à la main par `readDrink` et un contrôle de `carbCap` / `sodiumCap`) |
| Durée de l'effort | `GpxActivity` → `onMinutesChange` → `EnergyCalculator` → `onMinutesChange` → `HomeContent` → prop `minutes` → `NutritionPlanner` → URL `?min=` → `NutritionPlanView` (`parseDuration` recopié 2 fois) |
| Effort (distance, vitesse, unité) | `EnergyCalculator` → `onEffortChange` → `HomeContent` → prop `effort` → `NutritionPlanner` → URL `?km&v&u` → `NutritionPlanView` → `effortHref` → `/?km&v&u` → `HomeContent` (`effortFromSearch`, `isSpeedUnit` recopié 2 fois) |
| « Modifier mes paramètres » (mode GPX) | événement `window` `GPX_EDIT_SETTINGS_EVENT` |
| Trace GPX, intensité, terrain | état local de `GpxActivity`, perdu dès que le composant est démonté |
| `onAthleteChange` | prop de `EnergyCalculator` que plus aucune page ne passe (seul un test l'utilise) |

On remplace tout cela par **deux contextes React** montés une seule fois dans `app/layout.tsx`. Le layout racine n'est pas démonté lors d'une navigation client (`router.push`, `<Link>`) : l'état en mémoire survit au passage `/` → `/nutrition` → `/`. Il est perdu au rechargement, ce qui est voulu (la trace GPX n'est jamais stockée).

Les formulaires gardent leur état local de saisie (`values`, `athlete`, brouillon produit, drapeaux `submitted` / `*Attempted`) : c'est le travail de 08.4 (React Hook Form).

### Changements visibles (et seulement ceux-là)

1. **Recharger `/nutrition`** (ou l'ouvrir directement) affiche « Données introuvables » : la durée n'est plus dans l'URL.
2. **« Modifier mes données »** pointe toujours vers `/` ; au retour, le sport, l'effort, le mode (manuel / GPX), la trace, l'intensité et le terrain sont **conservés** (avant : seul l'effort l'était, via l'URL).
3. L'URL du plan est `/nutrition`, sans paramètre.

Libellés, messages d'erreur, `data-testid`, focus et calculs : inchangés.

### Comportement

**Modèle de l'activité** — `lib/activity.ts` (créer, pur, sans React)

```ts
type InputMode = "manual" | "gpx";

type ActivityState = {
  sportId: string;          // "" = aucun sport
  inputMode: InputMode;
  effort: EffortFormValues; // saisie manuelle, en texte
  track: Track | null;      // trace GPX, mémoire uniquement
  intensity: IntensityId;   // défaut "moderate"
  terrain: TerrainId;       // défaut "rolling"
  gpxMinutes: number | null;// durée calculée par GpxActivity
};

type ActivityAction =
  | { type: "sportChanged"; sportId: string }
  | { type: "inputModeChanged"; mode: InputMode }
  | { type: "effortChanged"; effort: EffortFormValues }
  | { type: "trackChanged"; track: Track | null }
  | { type: "intensityChanged"; intensity: IntensityId }
  | { type: "terrainChanged"; terrain: TerrainId }
  | { type: "gpxMinutesChanged"; minutes: number | null }
  | { type: "reset" };
```

Exports : `InputMode`, `ActivityState`, `ActivityAction`, `INITIAL_ACTIVITY`, `activityReducer`, `selectMinutes`.

| Action | Règle (reprise telle quelle de `EnergyCalculator` / `GpxActivity`) |
| --- | --- |
| `sportChanged` | Met à jour `sportId`. Sport inconnu → rien d'autre. Sport sans GPX (`supportsGpx`) → `inputMode: "manual"`, `track: null`, `gpxMinutes: null`. Vitesse encore vide (`trim() === ""`) → `speedUnit` = `defaultSpeedUnit` du sport ; sinon l'effort est inchangé. |
| `inputModeChanged` | `"manual"` → `track: null`, `gpxMinutes: null` (même effet qu'aujourd'hui, où `GpxActivity` démonté perdait sa trace). `"gpx"` → seulement le mode. L'effort n'est jamais vidé. |
| `effortChanged` | Remplace `effort` (la conversion d'unité reste faite par le composant avec `convertSpeed`). |
| `trackChanged` / `intensityChanged` / `terrainChanged` / `gpxMinutesChanged` | Remplacent le champ concerné. |
| `reset` | Retour à `INITIAL_ACTIVITY` (sport, effort, mode, trace, intensité, terrain, durée GPX). |

`selectMinutes(state): number | null` — la **seule** source de la durée pour les pages :
- mode `"gpx"` et sport qui supporte le GPX → `gpxMinutes` ;
- sinon → `computeEffortDuration(state.effort)?.minutes ?? null` (déjà bornée par `MINUTES_MIN` / `MAX`).

Les deux `parseDuration` disparaissent : la durée circule en `number | null`, plus jamais en texte.

**`ActivityProvider`** — `components/providers/ActivityProvider.tsx` (créer, `"use client"`)

- `useReducer(activityReducer, { ...INITIAL_ACTIVITY, ...initialState })`.
- Prop optionnelle `initialState?: Partial<ActivityState>` : utilisée par les tests (et rien d'autre en production).
- `useActivity()` renvoie `{ activity, minutes, dispatch }` (`minutes = selectMinutes(activity)`, mémoïsé) ; hors du provider il **lève** une erreur explicite (`"useActivity doit être utilisé dans <ActivityProvider>"`). Modèle : `AuthContext` [M10] du catalogue (contexte `null` par défaut + hook qui vérifie).

**`UserSettingsProvider`** — `components/providers/UserSettingsProvider.tsx` (créer, `"use client"`)

```ts
type UserSettingsContextValue = {
  status: "loading" | "ready";
  profile: ProfileSettings | null;
  athlete: AthleteSettings | null;
  nutrition: NutritionSettings | null;
  updateProfile(profile: ProfileSettings): void;     // state + saveProfile
  updateAthlete(athlete: AthleteSettings): void;     // state + saveAthlete
  updateNutrition(settings: NutritionSettings): void;// state + saveNutrition
  resetNutrition(): void;                            // state null + clearNutrition
};
```

- Un seul `useEffect` au montage : `loadProfile()`, `loadAthlete()`, `loadNutrition()`, puis `status: "ready"`. C'est le **seul** `eslint-disable react-hooks/set-state-in-effect` restant pour l'hydratation (justifié en commentaire : lecture du stockage jamais pendant le rendu).
- Aucun accès direct au `localStorage` : uniquement les fonctions de `lib/*Storage.ts`.
- `useUserSettings()` lève hors du provider (même modèle que `useActivity`).

**`AppProviders`** — `components/providers/AppProviders.tsx` (créer, `"use client"`)

`<UserSettingsProvider><ActivityProvider>{children}</ActivityProvider></UserSettingsProvider>`. `app/layout.tsx` (composant serveur) enveloppe `{children}` du `<body>` avec `<AppProviders>`.

**`HomeContent`** — plus de `useSearchParams`, `effortFromSearch`, `isSpeedUnit`, ni d'état `minutes` / `effort`. Rend `null` tant que `status === "loading"`, puis `<EnergyCalculator />` et `<NutritionPlanner />` **sans props**.

Raison du rendu différé : les composants peuvent initialiser leur état local directement depuis le contexte (`useState(() => …)`), sans `useEffect` d'hydratation.

**`EnergyCalculator`** — aucune prop (`initialEffort`, `onMinutesChange`, `onEffortChange`, `onAthleteChange` supprimées).
- Profil et athlète : état local initialisé depuis `useUserSettings()` (`profileOpen` à `false` si un profil est enregistré, `activityIndex` restauré). Le `useEffect` d'hydratation et son `eslint-disable` sont supprimés.
- « Valider » appelle `updateProfile` / `updateAthlete` (plus d'import de `saveProfile` / `saveAthlete`).
- Sport, effort, mode : lus dans `useActivity()`, modifiés par `dispatch` (`handleSport`, `handleInputMode`, `handleUnitChange`, saisie distance / vitesse, `handleReset` → `dispatch({ type: "reset" })`). La validation de `sportId` utilise `activity.sportId`.
- Durée : `minutes` de `useActivity()` remplace `derivedMinutes`, `gpxMinutes` et `effectiveMinutes` locaux.
- « Modifier mes paramètres » du mode GPX : la logique de `handleOpenSettings` (rouvrir le bloc ou focus sur la VMA) est passée à `GpxActivity` par une prop `onEditSettings`. L'écouteur `window` disparaît. C'est un **événement** d'un parent vers son enfant direct, pas une valeur qui remonte.

**`GpxActivity`** — props : `sport`, `profile`, `athlete` (inchangées : valeurs **en cours de saisie**, comme aujourd'hui) + `onEditSettings: () => void`.
- `track`, `intensity`, `terrain` lus dans `useActivity()` et modifiés par `dispatch`. `fileError` et les refs restent locaux.
- Un `useEffect` publie `dispatch({ type: "gpxMinutesChanged", minutes })` quand `outcome` change (`ready` → minutes, sinon `null`).
- Le nettoyage au démontage (`return () => onMinutesChange("")`) est **supprimé** : sinon la navigation vers `/nutrition` effacerait la durée. Le vidage se fait par les actions `inputModeChanged("manual")`, `sportChanged` (sport sans GPX), `trackChanged(null)` et `reset`.
- `GPX_EDIT_SETTINGS_EVENT` est supprimé.
- Au retour sur `/`, la trace déjà en mémoire est affichée ; le `<input type="file">` est vide (comportement normal du navigateur).

**`NutritionPlanner`** — aucune prop (`minutes`, `effort` supprimées).
- `settings = nutrition ?? emptySettings()` ; `persist(next)` → `updateNutrition(next)` ; `handleReset` → `resetNutrition()`. L'état `settings` local, `shouldPersist` et les deux `useEffect` (lecture / écriture) disparaissent.
- `formOpen` initial : aucun produit enregistré ; `openDrink` initial : boisson non activée (mêmes règles qu'aujourd'hui).
- Durée : `minutes` de `useActivity()`. `parseDuration` supprimé.
- « Calculer » : `router.push("/nutrition")`, sans paramètre.

**`NutritionPlanView`** — plus de `useSearchParams`, `parseDuration`, `isSpeedUnit`, `effortHref`, `readDrink`, ni de `useEffect` / `useState` de lecture.
- `buildPlanState(minutes: number | null, settings: NutritionSettings | null): PlanState` : fonction pure, appelée dans un `useMemo`. Rend `null` tant que `status === "loading"`.
- Contrôle des plafonds et de la boisson (reporté de 08.2) : `capsSchema.safeParse(...)` et `drinkSchema.safeParse(...)` (`lib/schemas/nutrition.ts`) ; un échec → `"missing"`. Les nombres sont ensuite lus avec `parseDecimal`. Aucune borne recopiée, plus d'import des constantes `CARB_CAP_*`, `SODIUM_CAP_*`, `DRINK_*`, `MINUTES_*`.
- « Modifier mes données » : `<Link href="/">`.

**Pages** — `app/page.tsx` et `app/nutrition/page.tsx` : le `<Suspense>` n'est plus nécessaire (il n'existait que pour `useSearchParams`), le retirer.

### Exemples de référence

**Nouveaux tests — `lib/activity.test.ts`** (pur, sans rendu)

1. `INITIAL_ACTIVITY` : sport vide, mode manuel, `EMPTY_EFFORT`, pas de trace, `"moderate"`, `"rolling"`, `gpxMinutes: null`.
2. `sportChanged` vers le vélo avec vitesse vide → unité `kmh` ; avec vitesse `"12"` déjà saisie en `minkm` → effort inchangé.
3. `sportChanged` vers un sport sans GPX alors qu'on est en mode GPX avec trace et `gpxMinutes: 54` → mode manuel, trace `null`, `gpxMinutes: null`.
4. `inputModeChanged("manual")` → trace et `gpxMinutes` vidées, effort conservé ; `inputModeChanged("gpx")` → effort conservé.
5. `reset` → `INITIAL_ACTIVITY`.
6. `selectMinutes` : effort `10 km` à `12 km/h` → `50` ; effort invalide → `null` ; mode GPX + sport GPX + `gpxMinutes: 54` → `54` (l'effort manuel est ignoré) ; mode GPX + `gpxMinutes: null` → `null`.

**Nouveaux tests — `components/providers/ActivityProvider.test.tsx`**

7. `useActivity` hors provider → lève le message attendu.
8. `initialState` partiel fusionné avec `INITIAL_ACTIVITY` ; un `dispatch` met à jour `activity` et `minutes`.

**Nouveaux tests — `components/providers/UserSettingsProvider.test.tsx`**

9. `status` vaut `"ready"` après le montage ; stockage vide → `profile`, `athlete`, `nutrition` à `null`.
10. Stockage rempli → les trois valeurs sont restaurées.
11. `updateNutrition` met à jour le contexte **et** `kcalapp:nutrition:v2` ; `resetNutrition` → `nutrition: null` et clé effacée. Idem `updateProfile` / `updateAthlete` (un aller-retour chacun).
12. `useUserSettings` hors provider → lève.
13. `localStorage` qui lève → `status: "ready"`, valeurs `null`, aucune exception.

**Utilitaire de test** — `test/renderWithProviders.tsx` (créer, non exécuté comme test)

- `renderWithProviders(ui, { activity?: Partial<ActivityState> })` : `render` de Testing Library enveloppé dans `UserSettingsProvider` + `ActivityProvider initialState={activity}`.
- `ActivityProbe` : petit composant qui affiche `minutes ?? ""` dans `<output data-testid="activity-minutes">`, pour remplacer les `vi.fn()` passés à `onMinutesChange`.

**Tests existants à adapter** — seulement le **câblage**, jamais les attentes visibles (libellés, messages, valeurs affichées, focus) :

| Fichier | Adaptation |
| --- | --- |
| `app/page.test.tsx`, `app/nutrition/page.test.tsx` | `render` → `renderWithProviders` (les providers sont dans le layout, pas dans la page) ; mock de `useSearchParams` retiré. |
| `components/HomeContent.test.tsx` | Les 4 tests « paramètres d'URL » (exemple 18) sont **remplacés** par : « l'effort, le sport et le mode sont conservés après démontage / remontage dans le même `ActivityProvider` » (simule l'aller-retour vers `/nutrition`). `push` attendu : `"/nutrition"` (exemple 19, allure encodée, GPX exemple 14). |
| `components/EnergyCalculator.test.tsx` | `onMinutesChange` → `ActivityProbe` ; `initialEffort` → `renderWithProviders(…, { activity: { effort } })` ; test « appelle onAthleteChange » (exemple 12) supprimé (prop supprimée) ; mock de `GpxActivity` : `onEditSettings` au lieu de l'événement. |
| `components/GpxActivity.test.tsx` | `onMinutesChange` → `ActivityProbe` ; `renderWithProviders`. |
| `components/NutritionPlanner.test.tsx` | Props `minutes` / `effort` → `activity` initiale (ex. `10 km` à `12 km/h` pour 50 min, `24 km` à `12 km/h` pour 120 min) ; `push` attendu : `"/nutrition"`. |
| `components/NutritionPlanView.test.tsx` | `navigation.search` → `activity` initiale ; les 3 tests sur `effortHref` (exemple 19 et paramètres invalides) sont remplacés par un seul : « Modifier mes données » pointe vers `/`. Le test « durée invalide » devient « aucune activité → Données introuvables » (exemple 14 ci-dessous). |

14. **Nouveau** (dans `NutritionPlanView.test.tsx`) : nutrition valide en stockage mais `ActivityProvider` vide (cas du rechargement) → « Données introuvables » et lien « Revenir au formulaire » vers `/`.
15. **Nouveau** (dans `NutritionPlanView.test.tsx`) : boisson activée avec un champ vide en stockage (accepté par `storedNutritionSchema`) → « Données introuvables » (contrôle via `drinkSchema`).

Toute autre modification d'un test existant (attente visible, message, libellé) : **s'arrêter et le signaler**.

### Partie A — Toi (avant)

- SPEC-08.2 relue, commitée avec ton accord.
- `npm run test:run` vert sur la branche `SPEC-08.3` (le test HomeContent « une trace GPX… » est connu instable : relancer une fois avant de conclure).
- Relire cette spec ; en particulier valider les **changements visibles 2 et 3** et le passage de `onEditSettings` en prop.

### Partie B — Agent (dans cet ordre, `npm run test:run` après chaque étape)

1. `lib/activity.test.ts` (ex. 1 à 6), vu en échec → `lib/activity.ts`.
2. `test/renderWithProviders.tsx` ; `ActivityProvider.test.tsx` (ex. 7, 8) vu en échec → `ActivityProvider.tsx`.
3. `UserSettingsProvider.test.tsx` (ex. 9 à 13) vu en échec → `UserSettingsProvider.tsx` → `AppProviders.tsx` → `app/layout.tsx`.
4. `GpxActivity` + son test (lecture / écriture via `useActivity`, `onEditSettings`).
5. `EnergyCalculator` + son test.
6. `NutritionPlanner` + son test.
7. `HomeContent`, `app/page.tsx` + leurs tests.
8. `NutritionPlanView`, `app/nutrition/page.tsx` + leurs tests (ex. 14 et 15 écrits et vus en échec d'abord).
9. `npm run typecheck`, `npm run lint`, suite complète.

Aux étapes 4 à 8, un test adapté qui échoue pour une autre raison que le câblage : **s'arrêter et le signaler**.

### Fichiers à créer / modifier

- specs/SPEC-08.md (lien vers cette sous-spec), specs/SPEC-08.3.md (créé)
- lib/activity.ts, lib/activity.test.ts (créer)
- components/providers/ActivityProvider.tsx, components/providers/ActivityProvider.test.tsx (créer)
- components/providers/UserSettingsProvider.tsx, components/providers/UserSettingsProvider.test.tsx (créer)
- components/providers/AppProviders.tsx (créer)
- test/renderWithProviders.tsx (créer)
- app/layout.tsx, app/page.tsx, app/nutrition/page.tsx (modifier)
- components/HomeContent.tsx, components/EnergyCalculator.tsx, components/GpxActivity.tsx, components/NutritionPlanner.tsx, components/NutritionPlanView.tsx (modifier)
- app/page.test.tsx, app/nutrition/page.test.tsx, components/HomeContent.test.tsx, components/EnergyCalculator.test.tsx, components/GpxActivity.test.tsx, components/NutritionPlanner.test.tsx, components/NutritionPlanView.test.tsx (adapter, voir tableau)

Tout autre fichier est inchangé, en particulier : `lib/*Storage.ts`, `lib/storage.ts`, `lib/schemas/*`, `lib/effort.ts`, `lib/nutrition.ts`, `components/ElevationProfile.tsx`, `components/SplitsTable.tsx`, `components/NutritionTimeline.tsx`, et `package.json`.

### Critères d'acceptation

Commandes de la liste fermée uniquement ; les recherches se font avec l'outil de recherche de l'agent (pas de `grep` en shell).

- [ ] `npm run test:run`, `npm run typecheck` et `npm run lint` passent (aucun nouveau warning)
- [ ] Exemples 1 à 15 couverts
- [ ] `git status` : seuls les fichiers listés ci-dessus apparaissent
- [ ] Recherche `useSearchParams|URLSearchParams` dans `components/` et `app/` hors tests : aucun résultat
- [ ] Recherche `onMinutesChange|onEffortChange|onAthleteChange|initialEffort|GPX_EDIT_SETTINGS_EVENT` dans `components/` : aucun résultat
- [ ] Recherche `parseDuration|isSpeedUnit|effortHref|effortFromSearch|readDrink` dans `components/` : aucun résultat
- [ ] Recherche `loadProfile|loadAthlete|loadNutrition|saveProfile|saveAthlete|saveNutrition|clearNutrition` dans `components/` : uniquement `components/providers/UserSettingsProvider.tsx`
- [ ] Recherche `set-state-in-effect` dans `components/` : uniquement `UserSettingsProvider.tsx`
- [ ] Recherche `addEventListener|dispatchEvent` dans `components/EnergyCalculator.tsx` et `components/GpxActivity.tsx` : aucun résultat
- [ ] Recherche `localStorage` dans `components/` et `app/` hors tests : aucun résultat
- [ ] Aucun `any`, aucun cast `as` vers un type de domaine dans les fichiers créés (relecture du diff)
- [ ] `package.json` inchangé

### Partie C — Toi (après)

`npm run dev` :

1. Remplir Paramètres, un sport, distance et vitesse, un produit ; « Calculer » → l'URL est `/nutrition`, le plan s'affiche avec la bonne durée.
2. « Modifier mes données » → sport, distance, vitesse, unité, profil et produits sont toujours là.
3. Même parcours en mode GPX (course) : importer une trace, changer l'intensité, « Calculer », revenir → trace, intensité et durée conservées.
4. Sur `/nutrition`, recharger la page (F5) → « Données introuvables ».
5. Mode GPX sans VMA → « Modifier mes paramètres » rouvre le bloc et place le focus comme avant.
6. Passer en saisie manuelle puis revenir en GPX → la trace a disparu (comme avant).

Commit uniquement après `npx tsc --noEmit` et les tests, avec ton accord.

### Hors périmètre

- React Hook Form, suppression des drapeaux `submitted` / `*Attempted` et des refs de focus (08.4).
- Calcul du pacing GPX (`outcome`) déplacé hors de `GpxActivity`, affichage du profil GPX sur la page 2 (08.5).
- `buildPlanState` déplacé dans `lib/` : reste dans `NutritionPlanView` pour l'instant.
- Toute persistance de l'activité (sport, effort, trace) : elle reste en mémoire.
- `lib/nutrition.ts` (point 10).
