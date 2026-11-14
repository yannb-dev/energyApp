## SPEC-02.1 — Nutrition en 2 pages : blocs repliables, plan et timeline

### Contexte

SPEC-02 est livrée (`lib/nutrition.ts`, `lib/nutritionStorage.ts`, `components/NutritionPlanner.tsx`). Cette SPEC la fait évoluer pour la lisibilité :

- les blocs **Produit** et **Boisson** se replient en résumé après validation ;
- **plus aucun calcul automatique** : le plan n'est calculé qu'au clic sur « Calculer ma nutrition » ;
- le plan s'affiche sur une **seconde page** `/nutrition` (navigation empilée, retour possible vers les données), avec le rappel des plafonds et une **timeline graphique** en doublon des données texte ;
- la **durée** n'est plus saisie dans la nutrition : elle est lue dans le bloc **Activité** du calculateur ; les plafonds vivent dans un bloc « Plafond à respecter ».

Toujours : aucune base de données, aucun réseau, calcul côté client, persistance `localStorage` (inchangée : `lib/nutritionStorage.ts` n'est pas modifié). TDD : chaque fichier a son test écrit et vu en échec AVANT le code.

### Page 1 (`/`) — ordre des blocs

1. Cartes du calculateur (Paramètres, Activité, Résultats — SPEC-01, inchangées).
2. **Plafond à respecter** (carte toujours visible, non repliable) : « Glucides max (g/h) » et « Sodium max (mg/h) », défauts 60 / 600, bornes SPEC-02 (20–120 et 100–1500). Rappel sous chaque champ : « Repère usuel : 30 à 90 g/h » et « Repère usuel : 300 à 1000 mg/h ».
3. **Produit** (repliable).
4. **Boisson** (repliable).
5. Boutons **« Calculer ma nutrition »** (principal) et **« Réinitialiser la nutrition »** (secondaire), EN DEHORS des cartes, pleine largeur sur mobile, côte à côte dès `sm`.

Disparaissent de la page 1 : la carte de résultats nutrition et le champ « Durée de l'effort (min) ». Aucune valeur nutritionnelle calculée n'est affichée sur cette page.

### Blocs Produit et Boisson repliables

État d'affichage `open` en mémoire (non persisté). Ouverts par défaut.

- **Valider** : boutons **« Valider le produit »** / **« Valider la boisson »**. Ils valident uniquement les champs de leur bloc (règles de `validateNutritionInputs`). Erreurs → le bloc reste ouvert et affiche les messages ; sinon il se replie.
- **Replié** : un résumé sur DEUX lignes + un bouton **« Modifier le produit »** / **« Modifier la boisson »** qui rouvre le bloc.
  - Produit : ligne 1 = icône « barre céréale » + nom du produit + type (pastille) ; ligne 2 = `Glucides 25 g · Sel 0,25 g`.
  - Boisson : ligne 1 = icône bouteille + nom de la boisson ; ligne 2 = `Glucides 75 g/100 g · Sel 3 g/100 g · 40 g/L` (la boisson n'a pas de type : on affiche la concentration à la place).
  - Nombres au format français (virgule), sans zéros inutiles.
- **Boisson** : la case « Ajouter une boisson énergétique » reste dans la carte. Décochée : seule la case est visible, ni champs ni résumé. Cochée : champs ou résumé selon `open`.
- **Chargement** : au montage, les valeurs sont lues dans le stockage (dans un `useEffect`, comme SPEC-02) ; un bloc dont les valeurs stockées sont valides démarre replié, un bloc invalide ou vide démarre ouvert.
- **Icônes** : `components/NutritionIcons.tsx`, SVG inline, `aria-hidden="true"`, couleur `text-accent`, aucune librairie.

### Bouton « Calculer ma nutrition »

Au clic, valide : plafonds, produit, boisson (si cochée) et durée venant du bloc Activité.

- Erreur de champ → rouvre le ou les blocs concernés, affiche les messages, **aucune navigation**.
- Durée vide ou invalide (entier 1 à 1440) → message `role="alert"` « Renseigne la durée dans le bloc Activité. », aucune navigation.
- Tout est valide → `router.push("/nutrition?min=<durée>")` (`useRouter` de `next/navigation`).
- Aucun calcul ni affichage de plan avant ce clic ; modifier un champ ne déclenche rien.

**« Réinitialiser la nutrition »** : remet plafonds, produit et boisson aux valeurs par défaut, rouvre les blocs, vide la clé `kcalapp:nutrition:v1`. Ne touche pas au calculateur.

### Liaison de la durée (Activité → nutrition)

- `components/EnergyCalculator.tsx` reçoit deux props **optionnelles** (modification minimale et additive) :
  - `initialMinutes?: string` : valeur initiale du champ « Durée (minutes) » ;
  - `onMinutesChange?: (minutes: string) => void` : appelée à chaque saisie de la durée et au Reset (avec `""`).
- Sans ces props, le comportement est identique à aujourd'hui.
- `app/page.tsx` reste un composant serveur (le `<h1>` et un `<Suspense>`) et rend `components/HomeContent.tsx` (client). Ce composant lit `min` avec `useSearchParams` (entier 1–1440, sinon ignoré), garde la durée en état et rend `<EnergyCalculator initialMinutes onMinutesChange />` puis `<NutritionPlanner minutes={…} />`.
- Retour depuis la page 2 : le lien « Modifier mes données » ouvre `/?min=<durée>` ; seule la durée est restaurée, le reste du calculateur repart vide (volontaire).

### Page 2 (`/nutrition`) — plan de nutrition

`app/nutrition/page.tsx` (serveur) : `<Suspense>` + `components/NutritionPlanView.tsx` (client). Le composant lit `min` dans l'URL et les valeurs dans le stockage, puis calcule avec `computeNutritionPlan({ ...valeursStockées, minutes })`.

- `min` invalide, stockage vide ou valeurs invalides → carte « Données introuvables » + lien « Revenir au formulaire » (`/`). Pas de crash.
- `<h1>` « Plan de nutrition ». Mêmes cartes, mêmes tokens et mêmes animations légères que SPEC-01-style. Sections, dans l'ordre :
  1. Lien **« Modifier mes données »** (`/?min=<durée>`), en haut.
  2. **Rappel** : durée, produit (nom, type), boisson (nom, g/L) si présente.
  3. **Résultats** (mêmes `data-testid` que SPEC-02) : unités à prendre en grand (`text-effort`), fréquence de prise, boisson (prises, volume, poudre), totaux, facteur limitant, alertes (`nutrition-warning`, `text-danger`).
  4. **Plafonds** : lignes `Glucides : 55,5 / 60 g/h` et `Sodium : 438 / 600 mg/h` (`nutrition-cap-carbs`, `nutrition-cap-sodium`), chacune avec une jauge `role="progressbar"` (`aria-valuenow`, `aria-valuemin`, `aria-valuemax`, libellé accessible). Barre `bg-effort` ; `bg-danger` et texte `text-danger` si dépassement.
  5. **Timeline** (voir ci-dessous).
  6. Disclaimer « Repères généraux, à adapter avec un professionnel de santé. ».

### Timeline (graphique)

`components/NutritionTimeline.tsx`, SVG inline écrit à la main (aucune dépendance), `data-testid="nutrition-timeline"`. Doublon visuel : toutes les données restent aussi en texte.

- Deux graphes empilés : **glucides cumulés (g)** et **sodium cumulé (mg)**.
- Axe X de 0 à la durée, graduations lisibles selon la durée (15, 30 ou 60 min). Axe Y de 0 à `max(plafond cumulé final, total)` avec marge.
- Courbe cumulée **en escalier** (`stroke-effort` pour les glucides, `stroke-accent` pour le sodium).
- Droite **pointillée du plafond** : `plafond × temps / 60` (`stroke-danger`, légende « Plafond »).
- **Marqueurs** de prises : boisson (petits points, toutes les 15 min) et solide (points plus grands), légende explicite.
- Accessibilité : `role="img"` + `aria-label` qui résume (ex. « 3 prises solides et 8 gorgées sur 120 min, 111 g de glucides pour un plafond de 120 g ») ; texte des axes en `fill-muted`, taille ≥ 12 px à l'écran.
- Responsive : `viewBox` fixe + `w-full h-auto`, lisible à 320 px, jamais de défilement horizontal.
- Animation : apparition en fondu `motion-safe:` uniquement.
- Couleurs uniquement via classes Tailwind sur les tokens du thème (`stroke-*`, `fill-*`, `text-*`).

### Logique à ajouter dans `lib/nutrition.ts` (ajouts uniquement, testés d'abord)

- Constantes `CARB_CAP_RECOMMENDED = { min: 30, max: 90 }` et `SODIUM_CAP_RECOMMENDED = { min: 300, max: 1000 }`.
- `computeCapUsage(value: number, cap: number)` → `{ ratio: number; exceeded: boolean }` (`ratio = value / cap`, `exceeded = value > cap`).
- `buildNutritionTimeline(values: NutritionFormValues, plan: NutritionPlan)` → `{ minutes, events, series, capLines }` :
  - prises boisson à `15 × k` minutes, `k = 1…plan.drink.servings`, glucides et sodium de chaque prise = total boisson / nombre de prises ;
  - prises solides à `minutes × (i + 0.5) / units` pour `i = 0…units − 1` (espacement égal à `plan.intervalMinutes`) ;
  - événements triés par minute ; chacun porte `{ minute, kind: "drink" | "solid", carbsG, sodiumMg }` ;
  - `series` : cumul glucides et sodium après chaque événement, point de départ (0, 0) et point final à la durée ;
  - `capLines` : plafond glucides et sodium à 0 et à la durée (`plafond × heures`) ;
  - le dernier cumul est égal à `plan.totals`.

### Exemples de référence (tests de `lib/nutrition.test.ts`)

Plafonds 60 g/h et 600 mg/h.

1. 120 min, sans boisson, barre 25 g de glucides / 0,25 g de sel → **4** prises solides à **15, 45, 75, 105** min ; cumul final **100 g** / 400 mg.
2. 120 min, boisson de SPEC-02 (40 g/L, 75 g de glucides et 3 g de sel pour 100 g de poudre) + même barre → **8** prises boisson à 15, 30 … 120 min (**4,5 g** et **72 mg** chacune) + **3** prises solides à **20, 60, 100** min ; cumul final **111 g** / **876 mg**, égal à `plan.totals`.
3. 10 min avec boisson → **0** prise boisson, événements limités aux prises solides éventuelles.
4. `computeCapUsage(55.5, 60)` → ratio **0,925**, non dépassé ; `computeCapUsage(81, 60)` → ratio **1,35**, dépassé.

### Partie A — Toi (avant)

Rien à installer. Vérifier que `npm run test:run` passe avant de lancer l'agent.

### Partie B — Agent (TDD strict, un fichier à la fois, dans cet ordre)

1. `lib/nutrition.test.ts` (ajouts) → `lib/nutrition.ts` (ajouts) : constantes, `computeCapUsage`, `buildNutritionTimeline`.
2. `components/EnergyCalculator.test.tsx` (UN test ajouté : `onMinutesChange` et `initialMinutes`) → `components/EnergyCalculator.tsx` (props optionnelles).
3. `components/NutritionIcons.tsx`, puis `components/NutritionPlanner.test.tsx` **réécrit** → `components/NutritionPlanner.tsx` **réécrit** (prop `minutes: string`).
4. `components/HomeContent.test.tsx` → `components/HomeContent.tsx` ; puis `app/page.tsx` ; dans `app/page.test.tsx` ajouter le mock de `next/navigation` (`useRouter`, `useSearchParams`) sans modifier les assertions existantes.
5. `components/NutritionTimeline.test.tsx` → `NutritionTimeline.tsx` ; `components/NutritionPlanView.test.tsx` → `NutritionPlanView.tsx` ; `app/nutrition/page.test.tsx` → `app/nutrition/page.tsx`.

`NutritionPlanner.test.tsx` est réécrit car le comportement « résultats en direct » de SPEC-02 est volontairement supprimé. Les autres tests existants ne sont pas modifiés (hors ajouts listés).

### Fichiers à créer / modifier

- specs/SPEC-02.1.md (créé)
- lib/nutrition.ts + lib/nutrition.test.ts (modifier : ajouts uniquement)
- components/EnergyCalculator.tsx (modifier : props optionnelles) + components/EnergyCalculator.test.tsx (modifier : un test ajouté)
- components/NutritionPlanner.tsx + components/NutritionPlanner.test.tsx (réécrire)
- components/NutritionIcons.tsx (créer)
- components/HomeContent.tsx + components/HomeContent.test.tsx (créer)
- components/NutritionPlanView.tsx + components/NutritionPlanView.test.tsx (créer)
- components/NutritionTimeline.tsx + components/NutritionTimeline.test.tsx (créer)
- app/page.tsx (modifier) + app/page.test.tsx (modifier : mock ajouté)
- app/nutrition/page.tsx + app/nutrition/page.test.tsx (créer)

`lib/nutritionStorage.ts`, `lib/energy.ts`, `lib/sports.ts` : inchangés.

### Contraintes

- TypeScript strict, pas de `any`
- Test écrit et vu en échec avant chaque code
- Formules uniquement dans `lib/`, jamais dans le JSX
- Aucune nouvelle dépendance (graphique et icônes en SVG fait main)
- Aucun `fetch`, aucune API Route ; `localStorage` uniquement via `lib/nutritionStorage.ts`
- Couleurs uniquement via les tokens du thème : aucune valeur hexadécimale, aucune classe `gray-*`, `bg-black`, `bg-white`, `text-black`, `text-white` dans les `.tsx`
- Mobile-first, cibles tactiles ≥ 44 px, texte des champs ≥ 16 px, focus visible, animations `motion-safe:` uniquement
- Chaque champ garde son `<label>` ; ne jamais retirer un label
- Les textes et noms du calculateur ne sont pas réutilisés par la nutrition (`Reset`, `Calculer`, `Sport`, `Durée (minutes)`, `Âge (ans)`, « Estimation indicative, non médicale ») ; la page 1 garde un seul `<h1>`
- Tests : mocker `next/navigation` avec `vi.mock` ; réinitialiser `localStorage` et les mocks dans `beforeEach`
- Pas de nouvelle dépendance. Ne modifier aucun autre fichier que ceux listés. Pas de commit ni de push
- Commandes autorisées (liste fermée) : `npm run typecheck` · `npm run lint` · `npm run test:run` · `git status` · `git diff`. Toute autre commande : s'arrêter et demander. Pas de `npm run build`
- Tout écart par rapport à la SPEC : s'arrêter et le signaler, ne pas corriger en silence

### Critères d'acceptation (vérifiables par commande)

- [ ] `npm run test:run`, `npm run typecheck` et `npm run lint` passent sans erreur
- [ ] Tests de `lib/nutrition.ts` : exemples 1 à 4 (valeurs exactes ci-dessus)
- [ ] Test : la page 1 n'affiche aucun résultat nutrition ; rien n'est calculé ni navigué avant le clic sur « Calculer ma nutrition »
- [ ] Test : clic valide → `push("/nutrition?min=120")` pour une durée de 120 min
- [ ] Test : durée absente → message « Renseigne la durée dans le bloc Activité. » et aucun `push` ; champ invalide → blocs rouverts, erreurs affichées, aucun `push`
- [ ] Test : « Valider le produit » replie le bloc avec un résumé sur 2 lignes (nom, type, glucides, sel) ; « Modifier le produit » le rouvre ; idem pour la boisson
- [ ] Test : un stockage valide au montage donne des blocs repliés ; un stockage corrompu donne des blocs ouverts
- [ ] Test : « Réinitialiser la nutrition » remet les valeurs par défaut, rouvre les blocs et vide `kcalapp:nutrition:v1`
- [ ] Test : les repères usuels (30 à 90 g/h, 300 à 1000 mg/h) sont visibles sous les champs plafonds
- [ ] Test : la page 2 affiche « Glucides : … / 60 g/h » et « Sodium : … / 600 mg/h » avec des jauges `progressbar` ; dépassement → classe `danger`
- [ ] Test : la timeline est présente (`nutrition-timeline`, `role="img"`, `aria-label`) avec autant de marqueurs que d'événements
- [ ] Test : `/nutrition` avec `min` invalide ou sans stockage → « Données introuvables » et lien de retour
- [ ] `grep -nE "#[0-9a-fA-F]{3,8}|gray-|bg-black|bg-white|text-black|text-white" components app` ne retourne rien
- [ ] `grep -rn "fetch" app components lib` ne retourne rien
- [ ] `git diff --stat` : `lib/nutritionStorage.ts`, `lib/energy.ts`, `lib/sports.ts` et les tests SPEC-01 existants ne sont pas modifiés (hors ajouts listés)

### Partie C — Toi (après)

`npm run dev` : saisir un produit → « Valider » (résumé replié) → « Modifier » → boisson → « Calculer ma nutrition » → page 2 (plan, jauges, timeline) → « Modifier mes données » (la durée revient, le reste du calculateur est vide). Vérifier le rendu à 320 / 390 / 768 px, le clavier (Tab, focus visible), le bouton retour du navigateur et `prefers-reduced-motion`. Commit uniquement après `npx tsc --noEmit` et les tests, avec ton accord.

### Hors périmètre

Plusieurs produits solides, vérification en fenêtre glissante d'une heure (le plafond est contrôlé en moyenne sur la durée : la timeline peut montrer un cumul précoce au-dessus de la droite du plafond), persistance du reste du calculateur, partage ou export du plan, thème clair, librairie de graphiques, modification de la logique de calcul de SPEC-02.
