## SPEC-08.2 — Stockage générique, lecture par `safeParse`

### Contexte

Deuxième brique de [SPEC-08](SPEC-08.md), après [08.1](SPEC-08.1.md) (schémas Zod livrés dans `lib/schemas/`, bornes partagées dans `lib/schemas/limits.ts`).

`lib/profileStorage.ts`, `lib/athleteStorage.ts` et `lib/nutritionStorage.ts` recopient chacun `getStorage`, `parseRecord`, `readString`, le `try/catch` de `getItem` / `setItem` / `removeItem`, puis relisent les données champ par champ à la main (`readProfile`, `readAthlete`, `readSettings`, `readProduct`, `readText`, `readOptionalNumber`…).

On crée **un seul** module d'accès au `localStorage` (`lib/storage.ts`) et chaque stockage décrit le **format enregistré** par un schéma Zod, relu avec `safeParse`.

**Aucun changement visible** : mêmes clés, même format JSON, mêmes fonctions exportées, même règle « tout ou rien » (le moindre champ douteux → `null`). Les tests existants des trois stockages ne sont pas modifiés.

### Comportement

**Accès générique** — `lib/storage.ts` (créer)

Seul fichier du projet qui touche `localStorage` et `JSON.parse` / `JSON.stringify` pour la persistance. Aucun import de domaine (seulement `zod`, en type).

| Fonction | Comportement |
| --- | --- |
| `loadItem<S extends z.ZodType>(key, schema): z.output<S> \| null` | `null` si stockage indisponible, `getItem` qui lève, clé absente, JSON invalide ou `safeParse` en échec ; sinon `result.data` (clés inconnues retirées, transformations appliquées). |
| `hasItem(key): boolean` | `true` si la clé existe ; `false` si absente, stockage indisponible ou `getItem` qui lève. |
| `saveItem(key, value: unknown): void` | `JSON.stringify` + `setItem` ; silencieux si indisponible ou si ça lève. |
| `removeItems(...keys: string[]): void` | `removeItem` pour chaque clé ; silencieux si indisponible ou si ça lève. |

Un `getStorage()` privé (accès à `globalThis.localStorage` dans un `try/catch`) remplace les trois copies.

**Schémas du format enregistré** — dans chaque `lib/*Storage.ts` (pas dans `lib/schemas/`)

Raison : les schémas de `lib/schemas/` sont importés par `lib/energy.ts`, `lib/products.ts`… Les placer dans les modules de stockage, que rien dans `lib/schemas/` n'importe, évite tout nouvel import circulaire (problème rencontré en 08.1). Ces schémas sont privés (non exportés) et **composés** à partir de `lib/schemas/` : aucune borne ni règle recopiée.

| Module | Schéma privé | Règles (identiques à aujourd'hui) |
| --- | --- | --- |
| `lib/profileStorage.ts` | `storedProfileSchema` | `profileSchema.extend({ sex: z.enum(["male", "female"]), activityIndex })` ; `activityIndex` entier entre 0 et `ACTIVITY_LEVELS.length - 1`. Plus de `PROFILE_SPORT_PLACEHOLDER` ni d'appel à `validateInputs`. |
| `lib/athleteStorage.ts` | `storedAthleteSchema` | `athleteSchema` + `bikePosition` parmi les `id` de `BIKE_POSITIONS`. `athleteSchema` a un `superRefine` : utiliser `.safeExtend()` (Zod 4.6, installé) qui conserve le raffinement, et non `.extend()` qui lève. |
| `lib/nutritionStorage.ts` | `storedNutritionSchema` (v2) | voir ci-dessous |
| `lib/nutritionStorage.ts` | `legacyNutritionSchema` (v1) | voir ci-dessous |

Le type de sortie de chaque schéma doit être assignable au type public (`ProfileSettings`, `AthleteSettings`, `NutritionSettings`) : c'est `npm run typecheck` qui le vérifie, aucun cast `as`.

**Format v2 de la nutrition** — `storedNutritionSchema`

- `carbCap`, `sodiumCap`, `drinkConcentration`, `drinkKcalPer100`, `drinkSaltPer100` : chaîne **vide acceptée** (pas encore saisie), sinon lisible par `parseDecimal` et dans les bornes. Helper privé `storedDecimal(min, max)` construit sur `optionalDecimalField` (le message n'est jamais affiché).
- `drinkCarbsPer100` : vide accepté, sinon entre 0 et `DRINK_CARBS_MAX` (bornes larges comme aujourd'hui : le « > 0 » est contrôlé à l'écran, pas au stockage).
- `drinkBrand`, `drinkName` : chaîne, vide acceptée, `trim().length` ≤ `TEXT_MAX_LENGTH`.
- `drinkEnabled` : booléen.
- `products` : tableau ; **un seul** produit invalide → tout l'état est `null`. Produit : `id` chaîne non vide après `trim` ; `brand` / `name` comme ci-dessus ; `type` en `z.enum(PRODUCT_TYPES)` (`lib/products.ts`), pour que la sortie soit typée `ProductType` sans cast ; `kcal`, `salt`, `weight` nombres finis dans les bornes `PRODUCT_*` (`lib/schemas/limits.ts`) ; `carbs` nombre > 0 et ≤ `weight`.
- `selectedIds` (raffinement au niveau de l'objet) : tableau d'au plus `MAX_SELECTED_PRODUCTS` chaînes, sans doublon, chacune présente dans `products`.
- `strategyKey` : absente ou `null` → `null` ; chaîne acceptée ; tout autre type → échec.

**Migration v1 → v2** — `loadNutrition` garde son déroulé :

1. `hasItem(NUTRITION_STORAGE_KEY)` → `loadItem(NUTRITION_STORAGE_KEY, storedNutritionSchema)` (une v2 invalide donne `null`, **sans** tenter la v1).
2. Sinon `loadItem(NUTRITION_STORAGE_KEY_V1, legacyNutritionSchema)` ; `null` → `null` (clé v1 conservée).
3. `legacyNutritionSchema` = mêmes plafonds et boisson que la v2 + les champs produit v1 (`productBrand`, `productName`, `productType`, `productKcal`, `productCarbs`, `productSalt`, `productWeight`) en `z.unknown()` : un produit v1 inexploitable ne bloque pas la migration des plafonds et de la boisson.
4. Le produit v1 est converti par `migrateProductType` (conservé), puis par **`draftToProduct(draft, "produit-migre")`** de `lib/products.ts` (qui applique `productDraftSchema`) ; `migrateProduct` écrit à la main disparaît. Champ produit non textuel → pas de produit.
5. `saveItem(NUTRITION_STORAGE_KEY, migrated)` puis `removeItems(NUTRITION_STORAGE_KEY_V1)`.

**Fonctions publiques** (signatures et noms inchangés)

- `loadProfile` / `saveProfile` / `clearProfile`, `PROFILE_STORAGE_KEY`, `ProfileSettings`.
- `loadAthlete` / `saveAthlete` (vide toujours `bikeKg` sans vélo) / `clearAthlete`, `validateAthlete`, `ATHLETE_STORAGE_KEY`, `EMPTY_ATHLETE`, `AthleteSettings`, `AthleteField`, réexports des bornes.
- `loadNutrition` / `saveNutrition` / `clearNutrition` (efface v2 **et** v1), les deux clés, `NutritionSettings`, `EMPTY_NUTRITION_SETTINGS`.

Les helpers dupliqués (`getStorage`, `parseRecord`, `readString`, `readText`, `readOptionalNumber`, `readNumber`, `readProduct`, `readProducts`, `readSelectedIds`, `readStrategyKey`, `readSettings`, `readProfile`, `readAthlete`, `isBikePosition`, `migrateProduct`) sont **supprimés** (sinon le lint échoue sur du code mort, cf. 08.1).

### Exemples de référence

**Nouveaux tests — `lib/storage.test.ts`** (schéma de test local, ex. `z.object({ a: z.string() })`)

1. Clé absente → `loadItem` renvoie `null` ; `hasItem` renvoie `false`.
2. `"{pas du json"` → `null`.
3. `{"a": 1}` → `null` (échec du schéma) ; `{"a": "x", "b": 2}` → `{ a: "x" }` (clé inconnue retirée).
4. Schéma avec `.transform` → la valeur transformée est renvoyée.
5. `getItem` qui lève → `loadItem` `null`, `hasItem` `false`, sans exception. Accès à `globalThis.localStorage` qui lève → idem.
6. `saveItem` puis `loadItem` → aller-retour ; `setItem` qui lève → pas d'exception.
7. `removeItems("k1", "k2")` efface les deux clés ; `removeItem` qui lève → pas d'exception.

**Non-régression — tests existants, inchangés** : `lib/profileStorage.test.ts`, `lib/athleteStorage.test.ts`, `lib/nutritionStorage.test.ts` (aller-retour, JSON corrompu, hors bornes, champ manquant, sélection orpheline, stratégie absente, `localStorage` qui lève, migration v1 complète), ainsi que les tests des composants qui chargent et enregistrent (`EnergyCalculator`, `NutritionPlanner`, `NutritionPlanView`, `GpxActivity`).

La refonte des trois stockages est un **refactoring à tests verts** : ces tests existants sont la référence, il n'y a pas de test en échec à écrire avant. Lancer `npm run test:run` après **chaque** module migré.

### Partie A — Toi (avant)

- SPEC-08.1 relue, commitée avec ton accord.
- `npm run test:run` vert sur la branche (le test HomeContent « une trace GPX… » est connu instable : relancer une fois avant de conclure).

### Partie B — Agent (dans cet ordre, un fichier à la fois)

1. `lib/storage.test.ts` (ex. 1 à 7), vu en échec → `lib/storage.ts`.
2. `lib/profileStorage.ts` → `storedProfileSchema` + `loadItem` / `saveItem` / `removeItems`. `npm run test:run`.
3. `lib/athleteStorage.ts` → `storedAthleteSchema`, idem. `npm run test:run`.
4. `lib/nutritionStorage.ts` → `storedNutritionSchema`, `legacyNutritionSchema`, migration via `draftToProduct`. `npm run test:run`.
5. `npm run typecheck`, `npm run lint`, suite complète.

Si un test existant ne passe plus et que le corriger demanderait de modifier ce test ou un fichier hors liste : **s'arrêter et le signaler**, ne pas adapter le test.

### Fichiers à créer / modifier

- specs/SPEC-08.md (lien vers cette sous-spec), specs/SPEC-08.2.md (créé)
- lib/storage.ts, lib/storage.test.ts (créer)
- lib/profileStorage.ts, lib/athleteStorage.ts, lib/nutritionStorage.ts (modifier)

Tout autre fichier est inchangé, en particulier : `lib/schemas/*`, `lib/products.ts` (`draftToProduct` est seulement importé), `lib/nutrition.ts`, les composants, et **tous** les tests existants.

### Critères d'acceptation

Commandes de la liste fermée uniquement ; les recherches se font avec l'outil de recherche de l'agent (pas de `grep` en shell).

- [ ] `npm run test:run`, `npm run typecheck` et `npm run lint` passent (aucun nouveau warning)
- [ ] Exemples 1 à 7 couverts par `lib/storage.test.ts`
- [ ] `git status` : seuls les fichiers listés ci-dessus apparaissent ; aucun `*.test.ts(x)` existant modifié
- [ ] Recherche `localStorage` dans `lib/` hors tests : uniquement `lib/storage.ts`
- [ ] Recherche `JSON.parse` dans `lib/*Storage.ts` : aucun résultat
- [ ] Recherche `getStorage|parseRecord|readString|readText|readOptionalNumber|migrateProduct\b` dans `lib/*Storage.ts` : aucun résultat
- [ ] Recherche `validateInputs|PROFILE_SPORT_PLACEHOLDER` dans `lib/profileStorage.ts` : aucun résultat
- [ ] Aucun cast `as Xxx` vers un type de domaine dans `lib/storage.ts` et `lib/*Storage.ts` (relecture du diff)
- [ ] `package.json` inchangé

### Partie C — Toi (après)

`npm run dev` :

1. Remplir Paramètres, Athlète, plafonds, un produit et une boisson ; recharger → tout est restauré.
2. DevTools > Application > Local Storage : modifier à la main une valeur hors bornes (ex. `age: "5"`) puis recharger → le bloc concerné repart vide, sans erreur en console.
3. Supprimer `kcalapp:nutrition:v2`, créer une ancienne clé `kcalapp:nutrition:v1` (format v1 avec un produit) puis recharger → produit migré et sélectionné, clé v1 supprimée.

Commit uniquement après `npx tsc --noEmit` et les tests, avec ton accord.

### Hors périmètre

- Revalidation des plafonds et de la boisson dans `NutritionPlanView` (`readDrink`, contrôle de `carbCap` / `sodiumCap`) : traitée en 08.3, quand la page lira les données depuis `UserSettingsProvider`.
- Providers (08.3), React Hook Form (08.4), UI (08.5), `lib/nutrition.ts` (point 10).
- Aucun changement de clé ni de format enregistré : pas de migration v2 → v3.
