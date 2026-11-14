## SPEC-02 — Plan de nutrition pendant l'effort (Next.js, client only)

### Contexte

Suite du calculateur de dépense énergétique (SPEC-01, SPEC-01-style). L'utilisateur renseigne un produit solide (barre, gel…) et, en option, une boisson énergétique. À partir de la durée de l'effort, l'app calcule combien d'unités solides prendre, en respectant des plafonds d'assimilation de glucides et de sodium par heure, avec une prise de boisson de 150 ml toutes les 15 min.

Composant indépendant : il a sa propre durée et ne modifie pas `EnergyCalculator`. Aucune base de données, aucun appel réseau : calcul côté client, persistance dans `localStorage`.

Développement en TDD : pour chaque fichier, le test est écrit et vu en échec AVANT le code.

### Entrées

| Entrée | Type | Bornes / règles |
|---|---|---|
| Glucides max (g/h) | nombre | 20 à 120, défaut 60 |
| Sodium max (mg/h) | nombre | 100 à 1500, défaut 600 |
| Durée de l'effort (min) | nombre | 1 à 1440 |

**Produit solide** (valeurs par unité) :

| Champ | Type | Bornes / règles |
|---|---|---|
| Marque | texte | requis, ≤ 50 caractères |
| Produit | texte | requis, ≤ 50 caractères |
| Type | liste | Barre, Gel, Compote, Pâte de fruits, Autre |
| Énergie (kcal) | nombre | 0 à 1000 |
| Glucides (g) | nombre | > 0 et ≤ poids |
| Sel (g) | nombre | 0 à 5 |
| Poids (g) | nombre | 1 à 500 |

**Boisson énergétique** (case à cocher « Ajouter une boisson énergétique » ; champs masqués si décochée) :

| Champ | Type | Bornes / règles |
|---|---|---|
| Marque, Produit | texte | requis, ≤ 50 caractères |
| Concentration (g de poudre / L) | nombre | 1 à 150 |
| Énergie pour 100 g de poudre (kcal) | nombre | 0 à 500 |
| Glucides pour 100 g de poudre (g) | nombre | > 0 et ≤ 100 |
| Sel pour 100 g de poudre (g) | nombre | 0 à 100 |

Les nombres acceptent la virgule (`70,5`), comme dans `lib/energy.ts`.

### Formules (fonctions pures dans `lib/nutrition.ts`, non arrondies sauf mention)

- sodium (mg) = sel (g) × 400
- heures = minutes / 60
- **Boisson** (150 ml toutes les 15 min, soit 0,6 L/h) :
  - prises = `floor(minutes / 15)` (première prise à 15 min)
  - volume (L) = prises × 0,15
  - poudre (g) = volume × concentration
  - glucides (g), kcal, sodium (mg) de la boisson = poudre × valeur pour 100 g / 100 (sodium via le sel × 400)
- **Budgets** : glucides (g) = plafond glucides × heures − glucides boisson ; sodium (mg) = plafond sodium × heures − sodium boisson ; chacun borné à 0 minimum.
- **Unités solides recommandées** = `min(unitésParGlucides, unitésParSodium)`, avec `unitésParGlucides = floor(budgetGlucides / glucidesUnité)` et `unitésParSodium = floor(budgetSodium / sodiumUnité)` (illimité si le sodium de l'unité vaut 0). `floor` : on ne dépasse jamais un plafond.
- **Facteur limitant** : « glucides » ou « sodium » (celui qui donne le plus petit nombre ; glucides en cas d'égalité).
- **Totaux** : glucides, sodium et kcal ingérés (boisson + unités) ; débit en g/h et mg/h = total / heures ; fréquence de prise solide = minutes / unités (affichée arrondie à la minute, absente si 0 unité).
- **Alertes** :
  - la boisson seule dépasse un plafond (par heure) → « Réduis la concentration de la boisson. »
  - 0 unité recommandée alors que le budget glucides est > 0 → « Une unité dépasserait le plafond. »

Affichage : arrondi à l'entier (kcal, mg, ml, minutes) ou à 1 décimale (g, g/h) uniquement dans le composant.

### Exemples de référence (à couvrir par des tests)

Plafonds 60 g/h et 600 mg/h dans tous les cas.

1. Sans boisson, 120 min, barre 25 g de glucides / 0,25 g de sel (100 mg de sodium) → **4 unités**, facteur limitant glucides, débit **50 g/h**.
2. Boisson 40 g/L, 75 g de glucides et 3 g de sel pour 100 g de poudre, 120 min → **8 prises**, 1200 ml, **48 g** de poudre, **36 g** de glucides, **576 mg** de sodium. Même barre qu'en 1 → **3 unités**, total **111 g** (55,5 g/h) et **876 mg** (438 mg/h), prise solide toutes les **40 min**.
3. Sans boisson, 120 min, barre avec 1 g de sel (400 mg de sodium) et 25 g de glucides → **3 unités**, facteur limitant **sodium**.
4. Boisson à 150 g/L, 90 g de glucides pour 100 g de poudre, 60 min → 4 prises, 0,6 L, 90 g de poudre, **81 g** de glucides (> 60 g/h) : alerte « Réduis la concentration… », 0 unité.

### Persistance (`lib/nutritionStorage.ts`)

- Clé `kcalapp:nutrition:v1` ; contenu : plafonds, produit solide, boisson (et état de la case). La durée n'est PAS enregistrée.
- Lecture et écriture dans un `try/catch` : si `localStorage` est indisponible ou lève une erreur, l'app fonctionne sans persistance, sans message d'erreur.
- Le JSON lu est re-validé champ par champ (type et bornes) : un contenu corrompu ou invalide est ignoré (valeurs par défaut), jamais utilisé tel quel.
- Le composant lit le stockage dans un `useEffect` (jamais pendant le rendu, pas de mismatch d'hydratation) et écrit à chaque changement.
- Mention visible « Enregistré dans ce navigateur ». Le bouton de réinitialisation vide aussi la clé.

### Partie A — Toi (avant)

Rien à installer : aucune dépendance. Vérifier que `npm run test:run` passe avant de lancer l'agent.

### Partie B — Agent (ordre TDD strict, un fichier à la fois)

1. `lib/nutrition.test.ts` → `lib/nutrition.ts` : constantes (plafonds par défaut, bornes, types de produit, 400, 150 ml, 15 min), validation par champ, calcul complet (`computeNutritionPlan`), exemples 1 à 4.
2. `lib/nutritionStorage.test.ts` → `lib/nutritionStorage.ts` : `loadNutrition`, `saveNutrition`, `clearNutrition` ; tests : aller-retour, JSON corrompu, valeurs hors bornes, `localStorage` qui lève.
3. `components/NutritionPlanner.test.tsx` → `components/NutritionPlanner.tsx` : formulaire, résultats, alertes, persistance, réinitialisation.
4. `app/page.tsx` : rendre `<NutritionPlanner />` sous `<EnergyCalculator />` ; ajouter UNE assertion à `app/page.test.tsx` (le planificateur est présent), sans modifier les assertions existantes.

### Interface (style SPEC-01-style)

Même thème sombre « Nuit & ambre » : tokens du `@theme` de `app/globals.css` (`bg-surface`, `bg-surface-2`, `border-line`, `text-ink`, `text-muted`, `accent`, `effort`, `danger`), mobile-first (une colonne, `sm:` pour agrandir), cibles tactiles ≥ 44 px, texte des champs ≥ 16 px, focus visible, animations `motion-safe:` légères (entrée en fondu, transitions hover/focus), rien qui s'anime sous `prefers-reduced-motion`.

Trois cartes titrées (`<h2>`), sous les cartes du calculateur :
- **Produit** : plafonds, durée, champs du produit solide.
- **Boisson** : case « Ajouter une boisson énergétique » et champs (masqués si décochée).
- **Plan de nutrition** : unités à prendre en grand (`text-effort`), fréquence de prise, boisson (prises, volume, poudre), totaux et débits en tuiles, alertes en `text-danger`. État vide discret avant calcul.

Boutons : **« Calculer ma nutrition »** (principal) et **« Réinitialiser la nutrition »** (secondaire). Erreurs : mêmes règles que SPEC-01 (`role="alert"`, `aria-invalid`, `aria-describedby`, erreur d'un champ vide visible seulement après une tentative de calcul). Les résultats s'affichent dès que le formulaire est valide. Disclaimer : « Repères généraux, à adapter avec un professionnel de santé. »

`data-testid` : préfixe `nutrition-` (`nutrition-results`, `nutrition-units`, `nutrition-interval`, `nutrition-total-carbs`, `nutrition-total-sodium`, `nutrition-rate-carbs`, `nutrition-rate-sodium`, `nutrition-drink-volume`, `nutrition-warning`).

### Fichiers à créer / modifier

- specs/SPEC-02.md (créé)
- lib/nutrition.ts + lib/nutrition.test.ts (créer)
- lib/nutritionStorage.ts + lib/nutritionStorage.test.ts (créer)
- components/NutritionPlanner.tsx + components/NutritionPlanner.test.tsx (créer)
- app/page.tsx (modifier : ajout du composant)
- app/page.test.tsx (modifier : AJOUT d'une assertion uniquement)
- lib/energy.ts (modifier SEULEMENT si `parseDecimal` est réutilisé : le passer en `export`, sans changer sa logique ; sinon le dupliquer dans `lib/nutrition.ts` n'est pas autorisé : s'arrêter et demander)

### Contraintes

- TypeScript strict, pas de `any`
- Test écrit et vu en échec avant chaque code
- Formules uniquement dans `lib/`, jamais dans le JSX
- Aucun `fetch`, aucune API Route ; seul `localStorage` est utilisé, uniquement via `lib/nutritionStorage.ts`
- Ne pas casser les tests existants : `app/page.test.tsx` rend la page entière, donc le composant ne réutilise AUCUN label, nom de bouton ou texte du calculateur (`Durée (minutes)`, `Sport`, `Âge (ans)`, `Poids (kg)`, `Taille (cm)`, `Reset`, `Calculer`, « Estimation indicative, non médicale ») et la page garde un seul `<h1>`. Libellés imposés : « Durée de l'effort (min) », « Glucides max (g/h) », « Sodium max (mg/h) »
- Chaque champ a un `<label>` (requêtes `getByLabelText` dans les tests) ; ne jamais retirer un label
- Les couleurs passent par les tokens du thème : aucune valeur hexadécimale, aucune classe `gray-*` / `bg-black` / `bg-white` dans les `.tsx`
- Pas de nouvelle dépendance. Ne modifier aucun autre fichier que ceux listés. Pas de commit ni de push
- Commandes autorisées (liste fermée) : `npm run typecheck` · `npm run lint` · `npm run test:run` · `git status` · `git diff`. Toute autre commande : s'arrêter et demander. Pas de `npm run build`
- Tout écart par rapport à la SPEC : s'arrêter et le signaler, ne pas corriger en silence

### Critères d'acceptation (vérifiables par commande)

- [ ] `npm run test:run` passe
- [ ] `npm run typecheck` et `npm run lint` passent sans erreur
- [ ] Tests des exemples 1 à 4 sur `computeNutritionPlan` (valeurs exactes ci-dessus)
- [ ] Test : chaque champ invalide ou vide (produit, boisson, plafonds, durée) → message d'erreur et aucun résultat
- [ ] Test : la case boisson affiche/masque ses champs ; sans boisson, aucune ligne boisson dans les résultats
- [ ] Test : un produit saisi puis le composant remonté (rechargement) → champs restaurés ; la durée n'est pas restaurée
- [ ] Test : JSON corrompu ou hors bornes dans `localStorage` → valeurs par défaut, pas d'erreur
- [ ] Test : `localStorage` qui lève → le composant s'affiche et calcule normalement
- [ ] Test : « Réinitialiser la nutrition » vide les champs, les résultats et la clé `kcalapp:nutrition:v1`
- [ ] `grep -nE "#[0-9a-fA-F]{3,8}|gray-|bg-black|bg-white" components/NutritionPlanner.tsx` ne retourne rien
- [ ] `grep -rn "fetch" app components lib` ne retourne rien
- [ ] `git diff --stat` ne montre aucune modification de `components/EnergyCalculator.tsx` ni des tests SPEC-01 (hors ajout dans `app/page.test.tsx`)

### Partie C — Toi (après)

`npm run dev` : saisir un produit, recharger la page (les valeurs reviennent, pas la durée), tester le Reset, vérifier le rendu à 320 / 390 / 768 px, le clavier (Tab, focus visible) et `prefers-reduced-motion`. Commit uniquement après `npx tsc --noEmit` et les tests, avec ton accord.

### Hors périmètre

Plusieurs produits solides, répartition automatique entre produits, plafonds selon l'intensité ou la chaleur, catalogue ou recherche de produits, base de données, comptes, export, conseil médical, comparaison des kcal ingérées et dépensées, partage de la durée avec le calculateur.
