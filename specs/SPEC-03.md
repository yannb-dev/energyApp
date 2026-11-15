## SPEC-03 — Info-bulles « ? » sur les calculs et valeurs de référence

### Contexte

SPEC-02.2 est livrée. Cette SPEC implémente le point 1 de `specs/evolution-app.md` : aider l'utilisateur à comprendre le type de calcul ou la valeur affichée, via un bouton rond « ? » qui ouvre une info-bulle fermable par « × ».

Blocs concernés :

1. **Plafond à respecter** (`components/NutritionPlanner.tsx`) : valeurs de référence (repères usuels).
2. **Résultats** de `components/EnergyCalculator.tsx` : méthode de calcul du métabolisme de base et de la dépense journalière.
3. **Résultats** de `components/NutritionPlanView.tsx` : explication du facteur limitant.

Toujours : aucune base de données, aucun réseau, calcul et affichage côté client. Aucune modification des formules. TDD : chaque fichier a son test écrit et vu en échec AVANT le code.

### Composant `components/InfoTooltip.tsx` (unique, réutilisable)

Un seul composant, utilisé aux 4 emplacements ci-dessous. Pas de trois implémentations.

Props : `id: string` (unique, sert aux attributs ARIA), `label: string` (nom accessible du bouton, ex. « Aide : métabolisme de base »), `title: string` (titre du panneau), `children: ReactNode` (contenu texte).

- **Bouton** : rond, « ? » centré, `type="button"`, `aria-label={label}`, `aria-expanded`, `aria-controls={id}`. Cible tactile ≥ 44 px (visuel ≈ 24 px), focus visible.
- **Panneau** : `id={id}`, `role="dialog"` non modal, `aria-labelledby` vers son titre. Bouton « × » dans l'angle haut-droit (`aria-label="Fermer l'aide"`, cible ≥ 44 px).
- **Ouverture** : au clic / tap sur « ? » (pas de survol). Le clic sur « ? » d'un panneau ouvert le referme.
- **Fermeture** : « × », touche Échap, clic en dehors du panneau. Au retour, le focus revient sur le bouton « ? ».
- **Un seul panneau ouvert à la fois** : ouvrir une info-bulle ferme celle qui est ouverte.
- **Position** : le panneau s'affiche sous le bouton, dans la largeur de sa carte ; lisible à 320 px, **jamais de défilement horizontal**.
- Animation d'apparition `motion-safe:` uniquement. Couleurs uniquement via les tokens du thème. Texte ≥ 12 px.
- Le bouton « ? » est ajouté sans changer les `data-testid` ni les libellés existants des blocs.

### Textes : `lib/helpTexts.ts`

Les textes sont des constantes dans `lib/helpTexts.ts` (aucun JSX, aucun texte long dans les composants). Ils sont **construits à partir des constantes existantes**, sans recopier les chiffres en dur :

- `CARB_CAP_RECOMMENDED`, `SODIUM_CAP_RECOMMENDED`, `HYDRATION_CAP_RECOMMENDED`, `HYDRATION_CAP_ML_PER_HOUR`, `CARB_CAP_MIN/MAX`, `SODIUM_CAP_MIN/MAX` (`lib/nutrition.ts`) ;
- `ACTIVITY_LEVELS` (`lib/energy.ts`) pour la liste des coefficients.

Contenu attendu (wording prudent : « information générale, pas un conseil médical ») :

| Clé                    | Emplacement                   | Contenu                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CAPS_HELP`            | « Plafond à respecter »       | Le plafond est le maximum par heure que tu te fixes. Repères usuels : glucides 30 à 60 g/h au delà cela demande une adaptation et de l'entrainement , sodium 300 à 1000 mg/h (en fonction de la température on transpire davantage et on évacue plus de sodium, si tu es des sueurs très salés augmentent la valeur), boisson 400 à 800 ml/h (plafond de boisson fixé à 750 ml/h attention à ne pas dépasser 1L/h sous risque d'hyponatrémie). |
| `BMR_HELP`             | tuile « Métabolisme de base » | Calculé avec la formule de Mifflin-St Jeor : `10 × poids (kg) + 6,25 × taille (cm) − 5 × âge`, puis `+ 5` (homme) ou `− 161` (femme). Énergie dépensée au repos sur 24 h. Estimation indicative.                                                                                                                                                                                                                                               |
| `TDEE_HELP`            | tuile « Dépense journalière » | Métabolisme de base × coefficient du niveau d'activité. Inclut l'activité quotidienne habituelle.                                                                                                                                                                                                                                                                                                                                              |
| `LIMITING_FACTOR_HELP` | « Facteur limitant »          | Le nombre d'unités est calculé deux fois : pour respecter le plafond de glucides et celui de sodium. Le facteur limitant est celui qui donne le moins d'unités.                                                                                                                                                                                                                                                                                |

Pas de nouvelle formule : ces textes décrivent `computeBmr`, `computeTdee` et `computeNutritionPlan` tels qu'ils existent.

### Placements

- **Plafond à respecter** : « ? » à droite du titre de la section (`CARD_TITLE`), `id="help-caps"`.
- **EnergyCalculator, Résultats** : « ? » dans l'en-tête des tuiles « Dépense journalière » (`id="help-tdee"`) et « Métabolisme de base » (`id="help-bmr"`). Les tuiles restent lisibles à 320 px (libellé qui passe à la ligne si besoin).
- **NutritionPlanView, Résultats** : « ? » à côté de « Facteur limitant » (`id="help-limiting-factor"`).

Pas de « ? » sur « Coût de l'effort », « Part de l'effort » ni sur le bloc « Plafonds » de `/nutrition` (voir Hors périmètre).

### Exemples de référence (à couvrir par des tests)

1. `InfoTooltip` fermé au départ : panneau absent, `aria-expanded="false"`.
2. Clic sur « ? » : panneau présent, `aria-expanded="true"` ; second clic : fermé.
3. Clic sur « × », touche Échap, clic en dehors : panneau fermé et focus sur le bouton « ? ».
4. Deux `InfoTooltip` : ouvrir le second ferme le premier.
5. `CAPS_HELP` contient `30`, `90`, `300`, `1000`, `400`, `800` issus des constantes ; `TDEE_HELP` contient chaque `label` et `coefficient` de `ACTIVITY_LEVELS`.
6. `NutritionPlanner`, `EnergyCalculator`, `NutritionPlanView` : le bouton d'aide attendu est présent avec son `aria-label` ; son ouverture affiche le titre du panneau.

### Partie A — Toi (avant)

Rien à installer. Vérifier que `npm run test:run` passe avant de lancer l'agent.

### Partie B — Agent (TDD strict, un fichier à la fois, dans cet ordre)

1. `lib/helpTexts.test.ts` → `lib/helpTexts.ts`.
2. `components/InfoTooltip.test.tsx` → `components/InfoTooltip.tsx`.
3. `components/NutritionPlanner.test.tsx` (ajouts) → `components/NutritionPlanner.tsx`.
4. `components/EnergyCalculator.test.tsx` (ajouts) → `components/EnergyCalculator.tsx`.
5. `components/NutritionPlanView.test.tsx` (ajouts) → `components/NutritionPlanView.tsx`.

### Fichiers à créer / modifier

- specs/SPEC-03.md (créé)
- lib/helpTexts.ts + lib/helpTexts.test.ts (créer)
- components/InfoTooltip.tsx + components/InfoTooltip.test.tsx (créer)
- components/NutritionPlanner.tsx + .test.tsx (modifier : ajouts uniquement)
- components/EnergyCalculator.tsx + .test.tsx (modifier : ajouts uniquement)
- components/NutritionPlanView.tsx + .test.tsx (modifier : ajouts uniquement)

`lib/nutrition.ts`, `lib/energy.ts`, `lib/nutritionStorage.ts`, `lib/sports.ts`, `NutritionTimeline.tsx`, `NutritionIcons.tsx`, `app/**` et leurs tests : inchangés.

### Contraintes

- TypeScript strict, pas de `any`
- Test écrit et vu en échec avant chaque code
- Textes et chiffres uniquement dans `lib/helpTexts.ts`, construits depuis les constantes existantes
- Aucune nouvelle dépendance (pas de librairie de tooltip ou de popover)
- Aucun `fetch`, aucune API Route
- Couleurs uniquement via les tokens du thème : aucune valeur hexadécimale, aucune classe `gray-*`, `bg-black`, `bg-white`, `text-black`, `text-white` dans les `.tsx`
- Mobile-first, cibles tactiles ≥ 44 px, focus visible, animations `motion-safe:` uniquement
- Wording : information générale, pas de conseil médical
- Ne modifier aucun autre fichier que ceux listés. Pas de commit ni de push
- Commandes autorisées (liste fermée) : `npm run typecheck` · `npm run lint` · `npm run test:run` · `git status` · `git diff`. Toute autre commande : s'arrêter et demander. Pas de `npm run build`
- Tout écart par rapport à la SPEC : s'arrêter et le signaler, ne pas corriger en silence

### Critères d'acceptation (vérifiables par commande)

- [ ] `npm run test:run`, `npm run typecheck` et `npm run lint` passent sans erreur
- [ ] Tests `InfoTooltip` : ouverture, fermeture (×, Échap, clic extérieur), retour du focus, un seul panneau ouvert
- [ ] Tests `lib/helpTexts.ts` : chiffres issus des constantes, coefficients de `ACTIVITY_LEVELS` présents
- [ ] Les 4 boutons « ? » sont présents aux emplacements prévus, avec `aria-label` et `aria-expanded`
- [ ] Les `data-testid` et tests existants passent sans modification de leurs assertions
- [ ] `grep -nE "#[0-9a-fA-F]{3,8}|gray-|bg-black|bg-white|text-black|text-white" components app` ne retourne rien
- [ ] `grep -rn "fetch" app components lib` ne retourne rien
- [ ] `git diff --stat` : seuls les fichiers listés sont modifiés

### Partie C — Toi (après)

`npm run dev` : vérifier les 4 « ? » sur `/` et `/nutrition`, l'ouverture / fermeture à la souris et au clavier (Tab, Entrée, Échap), la lecture au lecteur d'écran, le rendu à 320 / 390 / 768 px (pas de défilement horizontal) et `prefers-reduced-motion`. Relire les textes pour valider le wording. Commit uniquement après `npx tsc --noEmit` et les tests, avec ton accord.

### Hors périmètre

Info-bulle sur d'autres blocs (Coût de l'effort, Part de l'effort, bloc « Plafonds » de `/nutrition`, Timeline), ouverture au survol, textes éditables ou traduits, persistance de l'état d'ouverture, modification des formules, et points 2 à 8 de `evolution-app.md`.
