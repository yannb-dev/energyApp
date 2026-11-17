## SPEC-04 — Liste de produits, cumul solides + boisson, stratégie de répartition

### Contexte

SPEC-03 est livrée (infobulles "?"). Cette SPEC implémente le point 3 de `specs/evolution-app.md` : l'utilisateur gère une liste évolutive de produits, en sélectionne jusqu'à 3 solides (+ la boisson optionnelle) et choisit une stratégie de répartition.

Aujourd'hui `NutritionFormValues` (`lib/nutrition.ts`) ne gère qu'un seul produit et une boisson. Il faut passer à une liste de produits, avec migration des données déjà stockées.

Aucune base de données, aucun réseau, calcul côté client. Les formules de calcul d'un produit (glucides, sodium, boisson) ne changent pas : on les répartit entre plusieurs produits. TDD : chaque fichier a son test écrit et vu en échec AVANT le code.

### Modèle : `lib/products.ts` (créer)

- `PRODUCT_TYPES = ["Gel", "Barre", "Pâte de fruit"] as const` (« Compote » et « Autre » sont retirés).
- `Product = { id: string; brand: string; name: string; type: ProductType; kcal: number; carbs: number; salt: number; weight: number }`. Mêmes bornes que l'existant (`PRODUCT_KCAL`, `PRODUCT_SALT`, `PRODUCT_WEIGHT`, `TEXT_MAX_LENGTH`), carbs > 0 et ≤ weight.
- Fonctions pures : `addProduct`, `updateProduct`, `removeProduct`, `toggleSelected`, `moveSelected(ids, id, "up" | "down")`, `validateProduct`.
- `selectedIds: string[]` est ordonné : l'index donne le label « Produit A », « Produit B », « Produit C ».
- Maximum 3 produits sélectionnés. Un 4e est refusé (case désactivée + message).
- Supprimer un produit sélectionné le retire aussi de `selectedIds`.
- La boisson reste séparée et inchangée (case « Boisson », mêmes champs). Elle n'a pas de label « Produit ».
- Si aucun solide n'est sélectionné calculer uniquement avec la boisson.

### Stratégies : `lib/strategies.ts` (créer)

Type : `Strategy = { key: string; label: string; shares: number[]; order: "sequence" | "alternate" }`. `shares` suit l'ordre A, B, C (somme = 100). Le texte affiché est généré à partir des noms de produits.

| Nb solides | key        | label    | shares       | order     | Texte                                    |
| ---------- | ---------- | -------- | ------------ | --------- | ---------------------------------------- |
| 1          | —          | —        | [100]        | sequence  | aucun dropdown                           |
| 2          | `mixte50`  | mixte50% | [50, 50]     | sequence  | Répartition équitable, A puis B          |
| 2          | `mixte75`  | mixte75% | [75, 25]     | sequence  | 75 % de A et 25 % de B                   |
| 2          | `variable` | variable | [50, 50]     | alternate | Un produit différent une fois sur deux   |
| 3          | `mixte33`  | mixte33% | [33, 33, 34] | sequence  | Répartition équitable, A, puis B, puis C |
| 3          | `mixte50`  | mixte75% | [50, 25, 25] | sequence  | 50 % de A, 25 % de B et 25 % de C        |
| 3          | `variable` | variable | [33, 33, 34] | alternate | Un produit différent une fois sur trois  |

- `getStrategies(count: 1 | 2 | 3): Strategy[]`.
- Le dropdown n'apparaît que si au moins 2 solides sont sélectionnés. Stratégie par défaut : la première de la table.
- Recalcul à chaque ajout, modification, sélection/désélection, changement d'ordre ou de stratégie. Si le nombre de solides change, la stratégie revient à la première de la table.
- Le libellé « mixte50% » de la table à 3 produits est conservé tel quel (répartition 50/25/25). Les `key` restent uniques par table.

### Logique à ajouter dans `lib/nutrition.ts` (ajouts uniquement, testés d'abord)

- `computeMultiProductPlan(input)` : calcule les budgets glucides et sodium (moins la boisson, formule existante), puis pour chaque produit `i` : `budget_i = budget × share_i / 100`. `units_i = min(floor(carbsBudget_i / carbs_i), floor(sodiumBudget_i / (salt_i × 400)))` (Infinity si sel = 0).
- Retour : `{ items: { productId; units; limitingFactor }[]; limitingFactor; drink; totals; rates; warnings }`. Le `limitingFactor` global est celui du produit qui a le moins d'unités par rapport à sa part. `WARNING_NO_UNIT_FITS` s'applique si le total est 0.
- `buildNutritionTimeline` : `TimelineEvent` reçoit un champ optionnel `productId`. Séquence `sequence` : les produits sont consommés dans l'ordre A, B, C (A pour sa part d'unités, puis B…). Séquence `alternate` : A, B, (C), A, B, (C)… jusqu'à épuisement des unités.
- Les fonctions existantes à un seul produit restent exportées et inchangées tant qu'un composant les utilise ; leurs tests ne sont pas modifiés.

### Persistance : `lib/nutritionStorage.ts` (modifier : ajouts + nouvelle clé)

- Nouvelle clé `kcalapp:nutrition:v2` : `{ carbCap, sodiumCap, products: Product[], selectedIds, strategyKey, drink… }`.
- Migration v1 → v2 au premier chargement : le produit v1 devient le 1er élément de `products` et de `selectedIds` ; « Compote » et « Autre » deviennent « Pâte de fruit » ; plafonds et boisson sont conservés. La clé v1 est ensuite supprimée.
- Lecture validée champ par champ, `null` si invalide (comme aujourd'hui). Accès toujours dans un try/catch.
- Si `strategyKey` est absent ou ne correspond pas au nombre de solides, on prend la stratégie par défaut.

### Interface

`components/NutritionPlanner.tsx` (modifier) :

- Bloc « Produits » : liste des produits avec « Ajouter un produit », « Modifier », « Supprimer ». Le formulaire est celui de l'existant, le type est un `<select>` à 3 valeurs.
- Chaque produit a une case de sélection. Les produits sélectionnés affichent leur label (« Produit A »…) et deux chevrons haut/bas (cibles ≥ 44 px, `aria-label` explicites, désactivés aux extrémités).
- Dropdown « Stratégie d'alimentation » visible si ≥ 2 solides sélectionnés, avec une `InfoTooltip` (texte dans `lib/helpTexts.ts`).
- Sans solide sélectionné le calcul s'execute avec uniquement la boisson.

`components/NutritionPlanView.tsx` (modifier) : bloc rappel avec tous les produits sélectionnés (label, nom, type) ; une tuile de résultat par produit (unités) ; tuile boisson inchangée.

`components/NutritionTimeline.tsx` (modifier) : libellé par produit via `productId` (« gel », « barre », « pâte de fruit »), recap par produit.

`components/NutritionIcons.tsx` (modifier : ajouts uniquement) : icônes gel et pâte de fruit si absentes.

`lib/helpTexts.ts` (modifier) : réécrire `LIMITING_FACTOR_HELP` pour le cas multi-produits ; ajouter `STRATEGY_HELP`.

### Exemples de référence (à couvrir par des tests)

1. Un seul solide sélectionné : résultat identique à l'ancien calcul à un produit (non-régression).
2. Deux solides, `mixte50` : budgets divisés par deux, A consommé puis B.
3. Deux solides, `mixte75` : A reçoit 75 % du budget, B 25 %.
4. Deux solides, `variable` : timeline A, B, A, B…
5. Trois solides, `mixte33`, `mixte75` (50/25/25) et `variable`.
6. Deux solides + boisson : la boisson est déduite du budget avant la répartition.
7. Produit sans sel : `unitsBySodium` = Infinity, limité par les glucides.
8. Aucune unité ne rentre pour un produit : warning, total à jour.
9. Déplacement A↔B avec les chevrons : labels et ordre de la timeline inversés.
10. Suppression d'un produit sélectionné : retiré de `selectedIds`, stratégie recalculée.
11. Passage de 2 à 3 solides : la stratégie revient à la première de la table à 3.
12. 4e produit sélectionné : refusé.
13. Migration v1 (type « Compote ») : produit « Pâte de fruit » sélectionné, boisson conservée, clé v1 supprimée.
14. Données v2 invalides : `null`, valeurs par défaut.
15. Aucun solide sélectionné, calcul uniquement avec la boisson.

### Partie A — Agent (TDD strict, un fichier à la fois, dans cet ordre)

1. `lib/products.test.ts` → `lib/products.ts`
2. `lib/strategies.test.ts` → `lib/strategies.ts`
3. `lib/nutrition.test.ts` (ajouts) → `lib/nutrition.ts` (ajouts)
4. `lib/nutritionStorage.test.ts` (ajouts) → `lib/nutritionStorage.ts`
5. `lib/helpTexts.test.ts` (ajouts) → `lib/helpTexts.ts`
6. `components/NutritionTimeline.test.tsx` → `components/NutritionTimeline.tsx`
7. `components/NutritionPlanView.test.tsx` → `components/NutritionPlanView.tsx`
8. `components/NutritionPlanner.test.tsx` → `components/NutritionPlanner.tsx`
9. `components/NutritionIcons.tsx` (ajouts)

### Fichiers à créer / modifier

- `lib/products.ts` + `lib/products.test.ts` (créer)
- `lib/strategies.ts` + `lib/strategies.test.ts` (créer)
- `lib/nutrition.ts` + `lib/nutrition.test.ts` (modifier : ajouts uniquement)
- `lib/nutritionStorage.ts` + `lib/nutritionStorage.test.ts` (modifier)
- `lib/helpTexts.ts` + `lib/helpTexts.test.ts` (modifier)
- `components/NutritionPlanner.tsx` + test (modifier)
- `components/NutritionPlanView.tsx` + test (modifier)
- `components/NutritionTimeline.tsx` + test (modifier)
- `components/NutritionIcons.tsx` (modifier : ajouts uniquement)

Les autres fichiers (`lib/energy.ts`, `lib/sports.ts`, `components/EnergyCalculator.tsx`, `components/HomeContent.tsx`, `app/**`) restent inchangés. Si un test existant hors liste casse (`HomeContent.test.tsx`, `app/nutrition/page.test.tsx`), s'arrêter et le signaler.

### Contraintes

- TypeScript strict, pas de `any`.
- Test écrit et vu en échec avant chaque code.
- Aucune nouvelle dépendance.
- Aucun `fetch`, aucune API Route.
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
- [ ] `lib/products.test.ts` couvre les exemples 9, 10, 12
- [ ] `lib/strategies.test.ts` couvre les tables à 2 et 3 produits (exemples 2 à 5, 11)
- [ ] `lib/nutrition.test.ts` couvre les exemples 1 à 8
- [ ] `lib/nutritionStorage.test.ts` couvre les exemples 13 et 14
- [ ] `grep -nE "#[0-9a-fA-F]{3,8}|gray-|bg-black|bg-white|text-black|text-white" components app` ne retourne rien
- [ ] `grep -rn "fetch" app components lib` ne retourne rien
- [ ] `git diff --stat` : seuls les fichiers listés sont modifiés

### Partie C — Toi (après)

- `npm run dev`, vérifier à 320 / 390 / 768 px : ajout, modification, suppression, sélection, chevrons, dropdown de stratégie, page `/nutrition`.
- Vérifier au clavier et avec `prefers-reduced-motion`.
- Vérifier la migration : charger une ancienne clé v1 dans le localStorage, recharger la page.
- Relire les textes (stratégies, infobulles).
- Commit uniquement après `npx tsc --noEmit` et les tests, avec ton accord.

### Hors périmètre

- Point 2 de `evolution-app.md` (distance × allure) et points 4 à 8 (Neon, GPX/VMA/PMA, profil altimétrique/export, feedback, After-Activity).
- Stockage en base de données des produits.
- Plus de 3 solides ; stratégies personnalisées.
- Création de `AGENTS.md`.
