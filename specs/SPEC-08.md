## SPEC-08 — Simplification : schémas Zod, stockage générique, Providers, React Hook Form

### Contexte

Les points 1 à 5 de [evolution-app.md](evolution-app.md) sont livrés et fonctionnent. Avant la réorganisation UI du point 7 (page 1 = saisie, page 2 = résultats), on simplifie les fondations : le point 7 devient alors un déplacement de blocs (SPEC-08.5).

Doublons constatés :

- **Validation écrite plusieurs fois** : `validateInputs` (`lib/energy.ts`), `validateEffort` (`lib/effort.ts`), `validateAthlete` (`lib/athleteStorage.ts`), `validateProduct` (`lib/products.ts`) ; plafonds et boisson validés dans des `useMemo` de `components/NutritionPlanner.tsx`, revalidés par `readDrink` (`components/NutritionPlanView.tsx`) et par les fonctions `read*` des stockages.
- **Stockage recopié 3 fois** : `getStorage` / `parseRecord` / `readString` / `load` / `save` / `clear` dans `lib/profileStorage.ts`, `lib/athleteStorage.ts`, `lib/nutritionStorage.ts`.
- **Helpers en double** : `parseDuration` (NutritionPlanner + NutritionPlanView), `isSpeedUnit` (HomeContent + NutritionPlanView), `effortFromSearch` ≈ `effortHref`.
- **Valeurs qui remontent de composant en composant** : `onMinutesChange`, `onEffortChange`, `onAthleteChange`, événement `window` `GPX_EDIT_SETTINGS_EVENT`, paramètres d'URL `?min&km&v&u` entre les pages ; la trace GPX ne peut pas atteindre la page 2.
- **Formulaires gérés à la main** : drapeaux `submitted` / `*Attempted`, une ref par champ pour le focus ; `EnergyCalculator.tsx` et `NutritionPlanner.tsx` font environ 1100 lignes chacun.

### Répartition cible

| Donnée | Où elle vit |
| --- | --- |
| Profil, athlète, plafonds, produits, boisson | `localStorage`, via `lib/*Storage.ts` |
| Activité en cours (sport, effort, durée, trace GPX) | `ActivityProvider`, en mémoire uniquement |
| Règles et messages de validation | Schémas Zod, `lib/schemas/` |
| État des formulaires, erreurs, focus | React Hook Form + `zodResolver` |

### Découpage

| Sous-spec | Contenu | Changement visible |
| --- | --- | --- |
| [08.1](SPEC-08.1.md) | Schémas Zod centralisés, les `validate*` délèguent | Aucun |
| [08.2](SPEC-08.2.md) | `lib/storage.ts` générique, lecture par `safeParse` | Aucun |
| [08.3](SPEC-08.3.md) | `UserSettingsProvider` + `ActivityProvider`, fin des callbacks et des paramètres d'URL | Recharger `/nutrition` affiche « Données introuvables » ; le retour depuis `/nutrition` conserve sport, effort et trace GPX |
| 08.4 | React Hook Form, découpage en `components/forms/*` | Aucun (mêmes libellés, mêmes messages) |
| 08.5 | Point 7 : page 1 saisie seule, page 2 Résultats (énergie, récap, profil GPX, timeline) | Oui |

Chaque sous-spec est écrite juste avant son implémentation et relue avant de passer à la suivante.

### Dépendances (accord explicite requis avant l'installation, au début de 08.1)

- `zod@^4`
- `react-hook-form@^7` (utilisé à partir de 08.4)
- `@hookform/resolvers` (utilisé à partir de 08.4)

Versions de référence : `../../consigne/catalogue.md`.

### Contraintes communes (toutes les sous-specs)

- TypeScript strict, pas de `any`. TDD : test écrit et vu en échec avant chaque code.
- **Messages d'erreur identiques au mot près** aux messages actuels : les tests existants restent la référence.
- Libellés `<label>` et `data-testid` inchangés (sauf mention explicite en 08.5).
- Les bornes restent dans des constantes nommées (`AGE_MIN`, `CARB_CAP_MIN`, `PRODUCT_KCAL_MAX`…) ; les schémas les importent, ils ne recopient aucun chiffre. Depuis 08.1, les bornes utilisées par les schémas vivent dans `lib/schemas/limits.ts` (évite un import circulaire) et sont réexportées par leurs modules d'origine.
- `parseDecimal` (virgule décimale) et `parsePace` sont réutilisés dans les schémas.
- Aucun `fetch`, aucune API Route. Accès au `localStorage` uniquement dans `lib/`, toujours dans un `try/catch`, jamais pendant le rendu. La trace GPX n'est jamais stockée.
- Couleurs via les tokens du thème, mobile-first, cibles ≥ 44 px, focus visible, animations `motion-safe:`.
- `lib/nutrition.ts` contient un ancien modèle mono-produit (`validateNutritionInputs`, `computeNutritionPlan`, constantes produit en double) : hors périmètre, traité au point 10 (code mort). Ne pas le migrer.
- Ne modifier que les fichiers listés dans la sous-spec en cours. Pas de commit ni de push.
- Commandes autorisées (liste fermée) : `npm run typecheck` · `npm run lint` · `npm run test:run` · `git status` · `git diff` (sans pathspec). Les vérifications « grep » des critères se font avec l'outil de recherche de l'agent. Toute autre commande : s'arrêter et demander.
- Tout écart par rapport à la SPEC : s'arrêter et le signaler.

### Critères d'acceptation de l'ensemble (vérifiés une fois 08.5 livrée)

- [ ] Chaque sous-spec a ses propres critères tous cochés
- [ ] `npm run test:run`, `npm run typecheck` et `npm run lint` passent
- [ ] `grep -rn "localStorage" components app` ne retourne rien
- [ ] `grep -rn "gpx" lib/*Storage.ts lib/storage.ts` ne retourne rien
- [ ] `grep -rn "onMinutesChange\|GPX_EDIT_SETTINGS_EVENT" components` ne retourne rien
- [ ] `grep -rn "Attempted" components` ne retourne rien
- [ ] `grep -nE "#[0-9a-fA-F]{3,8}|gray-|bg-black|bg-white|text-black|text-white" components app` ne retourne rien
- [ ] `package.json` : seules les 3 dépendances ci-dessus sont ajoutées
