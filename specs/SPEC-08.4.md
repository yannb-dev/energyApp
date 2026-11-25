## SPEC-08.4 — React Hook Form, découpage en `components/forms/*`

### Contexte

Quatrième brique de [SPEC-08](SPEC-08.md), après [08.3](SPEC-08.3.md) (`UserSettingsProvider` + `ActivityProvider`).

Après 08.3, `EnergyCalculator.tsx` (~1040 l.) et `NutritionPlanner.tsx` (~1000 l.) gèrent encore leurs formulaires à la main : un `useState` par bloc, des drapeaux `submitted` / `profileAttempted` / `capsAttempted` / `productAttempted` / `drinkAttempted` / `durationAttempted`, une ref par champ pour le focus, des erreurs recalculées par `useMemo` + `toFieldErrors`.

On passe ces formulaires à React Hook Form + `zodResolver` (schémas de `lib/schemas/`), et on découpe les blocs en composants dans `components/forms/`.

Points techniques :

- `react-hook-form@7.92.0` et `@hookform/resolvers@7.0.9` sont déjà installés (zod 4 pris en charge, option `{ raw: true }` disponible).
- Le React Compiler est actif (`next.config.ts`) : utiliser `useWatch`, **jamais `watch()`** (sinon warning `react-hooks/incompatible-library`).
- Zod 4 : `.extend` lève sur un schéma raffiné, il faut `safeExtend`.
- `shouldFocusError` de RHF focalise le premier champ en erreur **dans l'ordre d'enregistrement** : sexe → âge → poids → taille → VMA → PMA → poids du vélo. C'est l'ordre actuel de `handleValidateProfile` : les refs de focus par champ disparaissent.

### Répartition

| Bloc | Gestion après 08.4 |
| --- | --- |
| Paramètres (profil + athlète + niveau d'activité) | `useForm` dans `EnergyCalculator`, `mode: "onChange"`, `shouldFocusError: true` |
| Activité (sport, mode, distance, unité, vitesse) | **Inchangé** : `ActivityProvider` + erreurs dérivées de `validateEffort` / `validateInputs` |
| Produit (brouillon) | `useForm` dans `NutritionPlanner`, `mode: "onSubmit"`, `reValidateMode: "onChange"`, `shouldFocusError: false` |
| Plafonds | idem Produit ; enregistrement à chaque frappe via `register(name, { onChange })` → `updateNutrition` |
| Boisson | idem Plafonds |
| Liste de produits, stratégie | Inchangé (pas un formulaire) |

### Changement visible (et seulement celui-là)

1. **Paramètres** : vider un champ déjà saisi (âge, poids, taille, poids du vélo) affiche immédiatement son message « … obligatoire » (avant : seulement après « Valider » ou « Calculer »).

Libellés, messages (au mot près), `data-testid`, `id` / `aria-describedby`, focus, calculs et enregistrement : inchangés. En particulier Produit / Plafonds / Boisson gardent leurs erreurs **après** tentative (mode `onSubmit`), et aucun focus automatique n'y est ajouté.

### Comportement

**Schéma du formulaire Paramètres** — `lib/schemas/settings.ts` (créer)

```ts
export const settingsFormSchema = z.object({
  profile: profileSchema,
  activityIndex: z.number().int(),
  athlete: athleteSettingsSchema,
});
export type SettingsFormValues = z.input<typeof settingsFormSchema>;
```

- `athleteSettingsSchema = athleteSchema.safeExtend({ bikePosition: z.enum(…ids de BIKE_POSITIONS) })` est **déplacé** de `lib/athleteStorage.ts` (où il s'appelle `storedAthleteSchema`) vers `lib/schemas/athlete.ts` et exporté ; `athleteStorage.ts` l'importe (aucun doublon).
- Réexport dans `lib/schemas/index.ts`.
- Objets imbriqués : les noms de champ RHF deviennent `profile.age`, `athlete.vmaKmh`… Les `id` HTML ne changent pas.

**Résolveur** — `zodResolver(schema, undefined, { raw: true })` pour Paramètres (garde `bikePosition`, valeurs en texte telles que saisies). Produit / Plafonds / Boisson : `zodResolver(schema)`.

**`EnergyCalculator`**

- `useForm<SettingsFormValues>({ defaultValues, resolver, mode: "onChange", shouldFocusError: true })`, `defaultValues` construits depuis `useUserSettings()` (comme l'état initial actuel).
- Valeurs courantes : `useWatch({ control })` → alimente `results` (même garde `validateInputs` qu'aujourd'hui), `GpxActivity` (`profile.weightKg`, `athlete`) et le libellé du niveau d'activité.
- « Valider » (`type="button"`) : `handleSubmit(onValid)()`. `onValid` → `updateProfile({ ...profile, sex, activityIndex })` (garde `sex` `"male" | "female"` conservée), `updateAthlete({ ...athlete, bikeKg: hasBike ? bikeKg : "" })`, puis repli du bloc. Focus du premier champ invalide : RHF.
- « Calculer » (submit du `<form>`) : `trigger(["profile.sex", "profile.age", "profile.weightKg", "profile.heightCm"])` (pas de focus, pas d'erreur athlète, comme aujourd'hui) + état `submitted` pour les erreurs Sport / Distance / Vitesse vides (bloc Activité inchangé).
- Supprimés : `values`, `athlete`, `activityIndex` en `useState`, `profileAttempted`, `errorFor` / `athleteErrorFor`, `focusProfileField`, refs `firstField` / `age` / `weight` / `height` / `vma` / `pma` / `bikeWeight`, `handleBikeToggle`, `handleBikePosition`.
- Conservés : `pendingFocusRef` (le champ n'existe pas encore au moment du clic) mais la cible « premier champ » passe par `setFocus("profile.sex")` ; `modifyButtonRef`, `sportRef`.
- `handleOpenSettings` (prop `onEditSettings` de `GpxActivity`) : bloc ouvert → `setFocus("athlete.vmaKmh")`, sinon rouvre puis focus « Homme ».
- Décocher « Ajouter un vélo » : `register("athlete.hasBike", { onChange })` remet `athlete.bikeKg` à `""` via `setValue`.
- Bloc replié : les champs sont démontés mais leurs valeurs restent (option par défaut `shouldUnregister: false`).

**`NutritionPlanner`**

- Trois `useForm` : `productForm` (`productDraftSchema`), `capsForm` (`capsSchema`), `drinkForm` (`drinkSchema`). `defaultValues` de Plafonds / Boisson depuis `settings` (= `nutrition ?? emptySettings()`).
- Plafonds / Boisson : chaque `register` passe `onChange: (e) => patchSettings({ champ: valeur })` → l'enregistrement à chaque frappe est conservé (`drinkEnabled` lit `e.target.checked`).
- `formState.isSubmitted` de chaque formulaire remplace `productAttempted` / `capsAttempted` / `drinkAttempted`. `durationAttempted` est remplacé par `capsForm.formState.isSubmitted` (seul « Calculer » soumet les plafonds, commentaire obligatoire).
- Petit helper local `submitForm(form): Promise<boolean>` (`let ok = false; await form.handleSubmit(() => { ok = true; })(); return ok;`) pour enchaîner les soumissions.
- « Valider le produit » : `productForm.handleSubmit(onValidProduct)`. `onValidProduct` convertit `type` avec `toProductType`, puis la logique actuelle `saveDraftProduct` → `persist` → `productForm.reset(EMPTY_PRODUCT_DRAFT)` → repli.
- « Modifier » un produit : `productForm.reset(productToDraft(product))` ; « Ajouter » / « Annuler » / suppression du produit en cours : `reset(EMPTY_PRODUCT_DRAFT)`.
- « Valider la boisson » : `drinkForm.handleSubmit(() => setOpenDrink(false))`. « Modifier la boisson » : `drinkForm.reset(drinkForm.getValues())` (efface l'état soumis, garde les valeurs).
- « Calculer ma nutrition » (`async`) : soumet plafonds, boisson et, si `mustValidateDraft`, produit (toutes les erreurs s'affichent comme aujourd'hui) ; puis mêmes règles qu'avant : produit invalide → formulaire rouvert, stop ; plafonds ou boisson invalides → boisson rouverte si besoin, stop ; `minutes === null` → stop ; sinon `router.push("/nutrition")`.
- « Réinitialiser la nutrition » : `reset` des trois formulaires sur leurs valeurs vides / par défaut + `resetNutrition()`.
- Supprimés : `draft` / `setDraft`, `patchDraft`, les quatre `*Attempted`, `capsErrors` / `drinkErrors` / `productErrors` (`useMemo` + `toFieldErrors`), `errorFor`.

**`components/forms/`** (créer)

| Fichier | Contenu |
| --- | --- |
| `styles.ts` | Constantes de classes partagées (`CARD`, `CARD_TITLE`, `FIELD_LABEL`, `FIELD`, `CHIP`, `BUTTON_BASE`, `BUTTON_PRIMARY`, `BUTTON_SECONDARY`, `BLOCK_ACTION`, `ERROR_TEXT`) aujourd'hui recopiées dans les deux composants |
| `FieldError.tsx` | `<p id role="alert" className={ERROR_TEXT}>` ; ne rend rien sans message |
| `fields.tsx` | `TextField` et `NumberField` (repris de `NutritionPlanner`) qui reçoivent `registration: UseFormRegisterReturn` + `error?: string` au lieu de `value` / `onChange` |
| `ProfileFields.tsx` | Sexe, âge, poids, taille, niveau d'activité — `useFormContext<SettingsFormValues>()` |
| `AthleteFields.tsx` | VMA, PMA, vélo, poids du vélo, position aéro — `useFormContext<SettingsFormValues>()` |
| `EffortFields.tsx` | Sport, mode de saisie, `GpxActivity` ou saisie manuelle (distance, unité, vitesse, ligne de durée) — lit `useActivity()`, props : `showEmptyErrors`, `sportRef`, `onEditSettings`, `profile`, `athlete` |
| `CapsFields.tsx` | Glucides max, sodium max, repères |
| `ProductFields.tsx` | Champs du brouillon produit (dont le `<select>` Type) |
| `DrinkFields.tsx` | Les six champs de la boisson |

Les blocs RHF lisent leur formulaire par `useFormContext` ; le parent les enveloppe dans `<FormProvider {...form}>` (un par formulaire). Boutons (« Valider », « Calculer », « Valider le produit »…), repli / dépli et liste de produits restent dans les parents.

### Exemples de référence

**Nouveaux tests — `lib/schemas/settings.test.ts`**

1. Paramètres valides (profil + athlète sans vélo) → `success`.
2. Âge `"9"` → issue de chemin `["profile", "age"]`, message `"L'âge doit être entre 10 et 100 ans."`.
3. Vélo coché, poids vide → `["athlete", "bikeKg"]`, `"Le poids du vélo est obligatoire."`.
4. `bikePosition` inconnue → échec ; `athleteStorage` refuse toujours une position inconnue (test existant inchangé).

**Nouveaux tests — `components/forms/fields.test.tsx`**

5. `TextField` / `NumberField` avec erreur : `aria-invalid="true"`, `aria-describedby="{id}-erreur"`, `role="alert"` ; sans erreur : aucun des trois.

**Nouveau test — `components/EnergyCalculator.test.tsx`**

6. Changement visible : saisir `30` dans « Âge (ans) » puis l'effacer → « L'âge est obligatoire. » affiché sans cliquer sur « Valider ».

**Tests existants** : aucune modification attendue (ils passent par les libellés). Tout test existant qui échoue : **s'arrêter et le signaler**.

### Partie A — Toi (avant)

- SPEC-08.3 relue et commitée avec ton accord ; créer la branche `SPEC-08.4`.
- `npm run test:run` vert.
- Relire cette spec, en particulier le changement visible n° 1 et le choix de laisser le bloc Activité hors RHF.

### Partie B — Agent (dans cet ordre, `npm run test:run` après chaque étape)

1. `lib/schemas/settings.test.ts` (ex. 1 à 4) vu en échec → `athleteSettingsSchema` déplacé dans `lib/schemas/athlete.ts`, `lib/athleteStorage.ts` l'importe, `lib/schemas/settings.ts`, réexport dans `index.ts`.
2. `components/forms/fields.test.tsx` (ex. 5) vu en échec → `styles.ts`, `FieldError.tsx`, `fields.tsx`.
3. Ex. 6 vu en échec → `EnergyCalculator` en RHF + `ProfileFields`, `AthleteFields`.
4. `EffortFields` extrait de `EnergyCalculator` (déplacement pur, aucun test modifié).
5. `NutritionPlanner` en RHF + `CapsFields`, `ProductFields`, `DrinkFields`.
6. `npm run typecheck`, `npm run lint` (aucun nouveau warning, notamment `incompatible-library`), suite complète.

### Fichiers à créer / modifier

- specs/SPEC-08.md (lien vers cette sous-spec), specs/SPEC-08.4.md (créé)
- lib/schemas/settings.ts, lib/schemas/settings.test.ts (créer)
- lib/schemas/athlete.ts, lib/schemas/index.ts, lib/athleteStorage.ts (modifier)
- components/forms/styles.ts, components/forms/FieldError.tsx, components/forms/fields.tsx, components/forms/fields.test.tsx, components/forms/ProfileFields.tsx, components/forms/AthleteFields.tsx, components/forms/EffortFields.tsx, components/forms/CapsFields.tsx, components/forms/ProductFields.tsx, components/forms/DrinkFields.tsx (créer)
- components/EnergyCalculator.tsx, components/NutritionPlanner.tsx (modifier)
- components/EnergyCalculator.test.tsx (ajout de l'exemple 6 uniquement)

Tout autre fichier est inchangé, en particulier : `package.json`, `components/providers/*`, `lib/activity.ts`, `components/GpxActivity.tsx`, `components/NutritionPlanView.tsx`, `lib/*Storage.ts` (sauf `athleteStorage.ts`), les autres schémas.

### Critères d'acceptation

Commandes de la liste fermée uniquement ; les recherches se font avec l'outil de recherche de l'agent.

- [ ] `npm run test:run`, `npm run typecheck` et `npm run lint` passent (aucun nouveau warning)
- [ ] Exemples 1 à 6 couverts ; aucun test existant modifié
- [ ] `git status` : seuls les fichiers listés ci-dessus apparaissent
- [ ] Recherche `Attempted` dans `components/` : aucun résultat
- [ ] Recherche `toFieldErrors|validateProduct|validateAthlete` dans `components/` : aucun résultat
- [ ] Recherche `watch\(` dans `components/` : aucun résultat (seulement `useWatch`)
- [ ] Recherche `useRef<HTMLInputElement>` dans `components/EnergyCalculator.tsx` : aucun résultat
- [ ] `EnergyCalculator.tsx` et `NutritionPlanner.tsx` font moins de 500 lignes chacun
- [ ] Recherche `storedAthleteSchema` : aucun résultat ; `athleteSettingsSchema` défini une seule fois
- [ ] Aucun `any`, aucun cast `as` vers un type de domaine dans les fichiers créés (relecture du diff)
- [ ] `package.json` inchangé

### Partie C — Toi (après)

`npm run dev` :

1. Paramètres vides → « Valider » : 4 erreurs, focus sur « Homme ». VMA `45` seule fausse → focus sur la VMA.
2. Saisir puis effacer l'âge → « L'âge est obligatoire. » immédiat (changement voulu).
3. Valider → bloc replié ; « Modifier mes paramètres » → valeurs reprises, focus sur « Homme ».
4. Décocher le vélo puis le recocher → poids du vélo vide.
5. Nutrition : « Calculer ma nutrition » à vide → erreurs produit ; plafond `5` → erreur seulement après « Calculer » ; boisson : valider / modifier.
6. Recharger `/` → plafonds, boisson, produits toujours là (enregistrement à chaque frappe conservé).

Commit uniquement après `npx tsc --noEmit` et les tests, avec ton accord.

### Hors périmètre

- Bloc Activité en RHF (reste dans `ActivityProvider`).
- `GpxActivity`, `NutritionPlanView`, liste de produits / stratégie : non découpés.
- Réorganisation page 1 / page 2 (08.5).
- `lib/nutrition.ts` (point 10).
