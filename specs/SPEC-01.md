## SPEC-01 — Calculateur de dépense énergétique (Next.js, client only)

### Contexte

Petite application web : à partir du profil de l'utilisateur, elle calcule sa dépense énergétique journalière (TDEE) et les kcal brûlées par un effort d'endurance. Stack : Next.js (App Router) + React + TypeScript strict, déployée sur Vercel. Aucune base de données, aucun backend, aucune API Route : tout le calcul se fait côté client (`"use client"`).

Développement en TDD : pour chaque fichier, le test est écrit et vu en échec AVANT le code (Vitest + Testing Library).

### Entrées et règles de calcul

| Entrée | Type | Bornes |
|---|---|---|
| Sexe | Homme / Femme | obligatoire |
| Âge | entier, ans | 10 à 100 |
| Poids | nombre, kg | 30 à 300 |
| Taille | nombre, cm | 100 à 250 |
| Niveau d'activité | slider, 5 paliers | défaut : Léger |
| Sport | liste de 10 | obligatoire |
| Durée de l'effort | nombre, minutes | > 0 et ≤ 1440 |

Niveaux d'activité (coefficient) : Sédentaire 1,2 · Léger 1,375 · Modéré 1,55 · Actif 1,725 · Très actif 1,9.

Sports (MET, Compendium of Physical Activities) : Marche rapide 4,3 · Course 8 km/h 8,3 · Course 10 km/h 9,8 · Vélo modéré 8,0 · Vélo route soutenu 10,0 · Natation crawl modérée 5,8 · Natation crawl rapide 9,8 · Aviron modéré 7,0 · Randonnée 6,0 · Ski de fond 9,0.

Formules (fonctions pures, non arrondies ; l'arrondi à l'entier se fait uniquement à l'affichage) :

- BMR (Mifflin-St Jeor) : `10 × kg + 6,25 × cm − 5 × âge + 5` (homme) ou `− 161` (femme)
- TDEE = BMR × coefficient du niveau d'activité
- kcal de l'effort = `MET × kg × (minutes / 60)`
- Part de l'effort dans la dépense journalière = kcal effort / TDEE × 100

Résultats affichés : métabolisme de base, dépense journalière, kcal de l'effort, pourcentage. Mention visible « Estimation indicative, non médicale ».

Bouton **Reset** : vide tous les champs, remet le slider sur Léger, efface les résultats et les erreurs, replace le focus sur le premier champ.

### Partie A — Toi (avant)

1. `npx create-next-app@latest` dans ce dossier (TypeScript, App Router, ESLint).
2. Installer : `npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`.
3. Créer le projet sur Vercel (sans variable d'environnement).

### Partie B — Agent (ordre TDD strict, un fichier à la fois)

1. Config des tests : `vitest.config.mts` (environnement jsdom, alias `@`, setup), `vitest.setup.ts` (jest-dom), scripts `package.json` : `test`, `test:run`, `typecheck`.
2. `lib/sports.test.ts` → `lib/sports.ts` : 10 sports `{ id, label, met }`, ids uniques, MET > 0.
3. `lib/energy.test.ts` → `lib/energy.ts` : `computeBmr`, `computeTdee`, `computeEffortKcal`, `validateInputs` (retourne les erreurs par champ).
4. `components/EnergyCalculator.test.tsx` → `components/EnergyCalculator.tsx` : formulaire, slider, résultats, reset.
5. `app/page.test.tsx` → `app/page.tsx` : affiche le calculateur.
6. `app/layout.tsx` : `lang="fr"`, titre de la page. Styles minimaux (CSS existant de Next, pas de lib).

### Fichiers à créer / modifier

- specs/SPEC-01.md (créé)
- vitest.config.mts, vitest.setup.ts (créer)
- package.json (modifier : scripts uniquement)
- lib/sports.ts + lib/sports.test.ts (créer)
- lib/energy.ts + lib/energy.test.ts (créer)
- components/EnergyCalculator.tsx + components/EnergyCalculator.test.tsx (créer)
- app/page.tsx + app/page.test.tsx (créer / modifier)
- app/layout.tsx (modifier)

### Contraintes

- TypeScript strict, pas de `any`
- Test écrit et vu en échec avant chaque code
- Calcul uniquement côté client : aucun `fetch`, aucune API Route, aucun stockage (pas de localStorage)
- Formules dans `lib/`, jamais dans le JSX
- Champs accessibles : chaque champ a un `<label>` (requêtes `getByLabelText` dans les tests)
- Pas de nouvelle dépendance hors liste de la partie A
- Ne modifier aucun autre fichier que ceux listés
- Commandes autorisées (liste fermée) : `npm run typecheck` · `npm run lint` · `npm run test:run` · `git status` · `git diff`. Toute autre commande : s'arrêter et demander
- Pas de commit ni de push
- Tout écart par rapport à la SPEC : s'arrêter et le signaler, ne pas corriger en silence

### Critères d'acceptation (vérifiables par commande)

- [ ] `npm run test:run` passe
- [ ] `npm run typecheck` et `npm run lint` passent sans erreur
- [ ] Test : homme, 30 ans, 70 kg, 175 cm → BMR = 1648,75
- [ ] Test : femme, 30 ans, 60 kg, 165 cm → BMR = 1320,25
- [ ] Test : course 8 km/h (MET 8,3), 70 kg, 30 min → 290,5 kcal
- [ ] Test : le TDEE change quand on déplace le slider (5 paliers disponibles)
- [ ] Test : âge / poids / taille / durée vides, ≤ 0 ou hors bornes → message d'erreur et aucun résultat
- [ ] Test : changer de sport ou de durée met à jour les kcal sans rechargement
- [ ] Test : Reset vide les champs, efface les résultats et replace le focus sur le premier champ
- [ ] `grep -rn "fetch" app components lib` ne retourne rien

### Partie C — Toi (après)

`npm run dev` pour vérifier à la main, déploiement Vercel, puis commit uniquement après `npx tsc --noEmit` et les tests, avec ton accord.

### Hors périmètre

Base de données, comptes, historique des calculs, unités impériales, sports hors endurance, PWA, internationalisation, estimation de l'EPOC, avertissement médical détaillé.
