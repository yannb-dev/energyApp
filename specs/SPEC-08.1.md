## SPEC-08.1 — Schémas Zod centralisés

### Contexte

Première brique de [SPEC-08](SPEC-08.md). Toutes les règles de validation (champ obligatoire, entier, bornes, règles entre champs) et leurs messages passent dans des schémas Zod rangés dans `lib/schemas/`. Les fonctions `validate*` existantes gardent leur signature et leurs résultats, mais délèguent aux schémas. Les validations recopiées dans `NutritionPlanner.tsx` (plafonds, boisson) sont remplacées par les schémas.

**Aucun changement visible** : mêmes erreurs, même texte, même moment d'affichage. Les tests existants ne sont pas modifiés.

### Comportement

**Helpers de champ** — `lib/schemas/fields.ts` (créer)

- `decimalField({ required, requiredMessage, min, max, rangeMessage, integer?, integerMessage? })` : `z.string()` qui accepte la virgule (`parseDecimal`). Un seul message par champ, dans cet ordre : vide → `requiredMessage` ; non numérique ou hors bornes → `rangeMessage` ; non entier (si `integer`) → `integerMessage`, testé **avant** les bornes (comme l'âge et la PMA aujourd'hui).
- `optionalDecimalField(...)` : une chaîne vide est valide (VMA, PMA).
- `textField(label)` : obligatoire, `TEXT_MAX_LENGTH` (`lib/products.ts`) ; messages « {label} est obligatoire. » et « {label} ne doit pas dépasser 50 caractères. »
- `rangeMessage(label, min, max, unit)` : déplacé depuis `lib/products.ts` (format « {label} : la valeur doit être entre {min} et {max} {unit}. »).
- Les schémas valident des **chaînes** (valeurs du formulaire) : la conversion en nombres reste faite par les fonctions de calcul existantes. 08.4 décidera s'il faut un `.transform`.

**Conversion des erreurs** — `lib/schemas/errors.ts` (créer)

- `toFieldErrors<T>(schema, values): Partial<Record<keyof T, string>>` : `safeParse`, puis **le premier message** par champ (`issue.path[0]`). Objet vide si valide.

**Schémas par domaine** (créer)

| Fichier | Schéma | Remplace la logique de | Champs |
| --- | --- | --- | --- |
| `lib/schemas/profile.ts` | `profileSchema`, `energyFormSchema` (= profil + `sportId`, `minutes` libre) | `validateInputs` | `sex`, `age` (entier), `weightKg`, `heightCm`, `sportId` |
| `lib/schemas/athlete.ts` | `athleteSchema` | `validateAthlete` | `vmaKmh` (optionnel), `pmaWatts` (optionnel, entier), `bikeKg` (obligatoire seulement si `hasBike`) |
| `lib/schemas/effort.ts` | `effortSchema` | `validateEffort` | `distanceKm`, `speed` (km/h ou `mm:ss` via `parsePace` selon `speedUnit`) |
| `lib/schemas/product.ts` | `productDraftSchema` | `validateProduct` | `brand`, `name`, `type`, `kcal`, `weight`, `carbs`, `salt` |
| `lib/schemas/nutrition.ts` | `capsSchema`, `drinkSchema` | `useMemo` `capsErrors` / `drinkErrors` de `NutritionPlanner.tsx` | plafonds ; boisson (règles appliquées seulement si `drinkEnabled`) |
| `lib/schemas/index.ts` | réexporte tout | — | — |

Chaque fichier exporte aussi son type (`z.input<typeof schema>`).

**Règles entre champs** (`superRefine` au niveau de l'objet) — elles doivent se déclencher **même si un autre champ, sans lien, est en erreur** (vérifier ce point avec Zod 4 : option `when` ou raffinement qui ne dépend pas du succès des autres champs) :

1. Effort : distance et vitesse valides, mais durée hors `MINUTES_MIN`–`MINUTES_MAX` → erreur sur `distanceKm` : « La durée calculée doit être entre 1 minute et 24 h. »
2. Produit : `carbs` ≤ 0 ou `carbs` > `weight` (quand le poids est lisible) → « Les glucides de l'unité doivent être supérieurs à 0 et ne pas dépasser le poids de l'unité. »
3. Athlète : `hasBike` vrai et `bikeKg` vide → « Le poids du vélo est obligatoire. » ; `hasBike` faux → `bikeKg` ignoré.
4. Boisson : `drinkEnabled` faux → aucune erreur, quelles que soient les valeurs.
5. Effort : message vide selon l'unité (« La vitesse est obligatoire. » / « L'allure est obligatoire. ») ; bornes d'allure affichées avec `formatPace` (« 0:36 » et « 60:00 »).

**Délégation** (modifier, signatures inchangées)

- `lib/energy.ts` : `validateInputs(values)` → `toFieldErrors(energyFormSchema, values)`.
- `lib/effort.ts` : `validateEffort(values)` → `toFieldErrors(effortSchema, values)`.
- `lib/athleteStorage.ts` : `validateAthlete(values)` → `toFieldErrors(athleteSchema, values)`.
- `lib/products.ts` : `validateProduct(draft)` → `toFieldErrors(productDraftSchema, draft)` ; `rangeMessage` et `textError` déplacés dans `lib/schemas/fields.ts`.
- `components/NutritionPlanner.tsx` : `capsErrors` = `toFieldErrors(capsSchema, …)`, `drinkErrors` = `toFieldErrors(drinkSchema, …)` ; les deux blocs de règles écrites à la main sont supprimés. Aucun autre changement dans ce composant.

**Dépendances circulaires** : `lib/schemas/*` importe les constantes de `lib/energy.ts`, `lib/effort.ts`, `lib/products.ts`, `lib/nutrition.ts`, `lib/athleteStorage.ts`, et ces modules importent les schémas. Si l'import circulaire pose problème (constantes `undefined` au chargement), **s'arrêter et le signaler** : la solution proposée sera de déplacer les constantes de bornes dans `lib/schemas/limits.ts`, ce qui touche des fichiers hors liste.

### Exemples de référence (à couvrir par des tests)

1. `decimalField` : `"70,5"` valide ; `""` → message obligatoire ; `"abc"` → message de bornes ; `"25.5"` avec `integer` → message entier.
2. `toFieldErrors` : 2 champs invalides → 2 clés ; un champ avec 2 problèmes → seulement le premier message.
3. Profil : âge `"9"` → « L'âge doit être entre 10 et 100 ans. » ; `"25,5"` → « L'âge doit être un nombre entier. » ; sexe `""` → « Choisis un sexe. »
4. Effort : `{ distanceKm: "10", speed: "5:30", speedUnit: "minkm" }` → `{}` ; `speed: "5:75"` → « L'allure doit être au format mm:ss (ex. 5:30). » ; `distanceKm: "1000", speed: "1"` (km/h) → erreur de durée sur `distanceKm`.
5. Athlète : `{ vmaKmh: "", pmaWatts: "", hasBike: false, bikeKg: "" }` → `{}` ; `pmaWatts: "250,5"` → « La PMA doit être un nombre entier. » ; `hasBike: true, bikeKg: ""` → « Le poids du vélo est obligatoire. »
6. Produit : `carbs: "30", weight: "25"` → message glucides ; `brand: ""` et `carbs: "30", weight: "25"` → **deux** erreurs (règle entre champs maintenue malgré l'autre erreur).
7. Plafonds : `carbCap: "130"` → « Les glucides max : la valeur doit être entre 20 et 120 g/h. »
8. Boisson : `drinkEnabled: false` + champs vides → `{}` ; `drinkEnabled: true` + `drinkCarbsPer100: "0"` → « Les glucides pour 100 g de poudre doivent être supérieurs à 0 et au plus 100 g. »
9. Non-régression : `lib/energy.test.ts`, `lib/effort.test.ts`, `lib/athleteStorage.test.ts`, `lib/products.test.ts`, `components/NutritionPlanner.test.tsx` passent **sans modification**.

### Partie A — Toi (avant)

- `npm run test:run` vert sur la branche.
- Installer les dépendances (ou m'autoriser à lancer cette commande, hors liste fermée) : `npm install zod@^4 react-hook-form@^7 @hookform/resolvers`.

### Partie B — Agent (TDD strict, un fichier à la fois, dans cet ordre)

1. `lib/schemas/fields.test.ts` (ex. 1) → `lib/schemas/fields.ts`.
2. `lib/schemas/errors.test.ts` (ex. 2) → `lib/schemas/errors.ts`.
3. `lib/schemas/profile.test.ts` (ex. 3) → `lib/schemas/profile.ts`, puis délégation dans `lib/energy.ts`.
4. `lib/schemas/effort.test.ts` (ex. 4) → `lib/schemas/effort.ts`, puis délégation dans `lib/effort.ts`.
5. `lib/schemas/athlete.test.ts` (ex. 5) → `lib/schemas/athlete.ts`, puis délégation dans `lib/athleteStorage.ts`.
6. `lib/schemas/product.test.ts` (ex. 6) → `lib/schemas/product.ts`, puis délégation dans `lib/products.ts`.
7. `lib/schemas/nutrition.test.ts` (ex. 7, 8) → `lib/schemas/nutrition.ts`, puis `components/NutritionPlanner.tsx`.
8. `lib/schemas/index.ts`.
9. Suite complète (ex. 9).

### Fichiers à créer / modifier

- specs/SPEC-08.md, specs/SPEC-08.1.md (créés)
- package.json, package-lock.json (dépendances, Partie A)
- lib/schemas/fields.ts, errors.ts, profile.ts, athlete.ts, effort.ts, product.ts, nutrition.ts, index.ts + leurs tests (créer, sauf index)
- lib/energy.ts, lib/effort.ts, lib/athleteStorage.ts, lib/products.ts (modifier : délégation uniquement)
- components/NutritionPlanner.tsx (modifier : `capsErrors` et `drinkErrors` uniquement)

Tout autre fichier, dont `lib/nutrition.ts`, `lib/*Storage.ts` (hors `validateAthlete`) et les tests existants : inchangé.

### Critères d'acceptation (vérifiables par commande)

- [ ] `npm run test:run`, `npm run typecheck` et `npm run lint` passent
- [ ] Tests des exemples 1 à 8 ; exemple 9 : `git diff --stat -- '*.test.ts' '*.test.tsx'` ne liste que des fichiers `lib/schemas/*.test.ts` nouveaux
- [ ] `grep -n "parseDecimal" lib/energy.ts lib/effort.ts lib/athleteStorage.ts lib/products.ts` : plus aucun appel dans les fonctions `validate*`
- [ ] `grep -n "CARB_CAP_MIN\|DRINK_SALT_MAX" components/NutritionPlanner.tsx` : plus utilisé pour la validation (seulement pour les attributs `min`/`max` des champs, si c'est déjà le cas)
- [ ] `package.json` : seulement `zod`, `react-hook-form`, `@hookform/resolvers` ajoutés

### Partie C — Toi (après)

`npm run dev` : saisir des valeurs invalides dans chaque bloc (Paramètres, Activité, produit, plafonds, boisson) et vérifier que les messages et leur moment d'affichage sont identiques à avant. Commit uniquement après `npx tsc --noEmit` et les tests, avec ton accord.

### Hors périmètre

Stockage (08.2), Providers (08.3), React Hook Form (08.4), toute modification d'UI, `lib/nutrition.ts` (point 10).
