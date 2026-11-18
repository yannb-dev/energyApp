## SPEC-06 — Correctif : titre supprimé, profil « Paramètres » enregistré et repliable

### Contexte

SPEC-05 est livrée (distance × vitesse). Cette SPEC est un correctif sur l'ensemble du projet, deux points :

1. Le titre « Gestion alimentaire sportive » (`<h1>` de `app/page.tsx`) est supprimé.
2. Le bloc « Paramètres » (`EnergyCalculator` : sexe, âge, poids, taille, niveau d'activité physique) ne mémorise rien. Il reçoit un bouton **« Valider »** qui enregistre les valeurs dans le `localStorage` et replie le bloc ; une fois replié, il n'affiche plus qu'un bouton **« Modifier mes paramètres »**.

Aucune formule de calcul ne change. Aucune base de données, aucun réseau, calcul côté client. TDD : chaque fichier a son test écrit et vu en échec AVANT le code.

### Point 1 — Suppression du titre : `app/page.tsx` (modifier)

- Supprimer le `<h1>` « Gestion alimentaire sportive ».
- Le paragraphe de présentation (« Métabolisme de base, dépense du jour… ») est **conservé**
- Accessibilité : la page se retrouve sans `<h1>`. Pour ne pas casser la hiérarchie, le titre est remplacé par un `<h1 className="sr-only">` sans texte il sera remplacer ultérieurement par une logo SVG.
- `app/page.test.tsx` passe au rouge : l'assertion sur le heading `/Gestion alimentaire sportive/i` est à corriger (voir exemples 1 et 2). C'est la seule modification de ce test.

### Point 2 — Profil enregistré

#### Stockage : `lib/profileStorage.ts` (créer)

Séparé de `lib/nutritionStorage.ts` (clé et responsabilité différentes). Même style : accès toujours dans un `try/catch`, lecture validée champ par champ, `null` si invalide.

```ts
export const PROFILE_STORAGE_KEY = "kcalapp:profile:v1";

export type ProfileSettings = {
  sex: "male" | "female";
  age: string;
  weightKg: string;
  heightCm: string;
  activityIndex: number; // index dans ACTIVITY_LEVELS
};
```

- `loadProfile(): ProfileSettings | null` : `null` si clé absente, JSON invalide, champ manquant ou hors bornes (réutilise `validateInputs` / bornes de `lib/energy.ts`, `activityIndex` entier entre 0 et `ACTIVITY_LEVELS.length - 1`). Pas de valeur partielle : tout ou rien.
- `saveProfile(profile: ProfileSettings): void` : écrit dans `PROFILE_STORAGE_KEY`. Si le stockage est indisponible (navigation privée, quota), ne lève pas d'erreur.
- `clearProfile(): void` : supprime la clé.
- `sportId`, la distance et la vitesse **ne sont pas** enregistrés (bloc « Activité », hors périmètre).

#### Interface : `components/EnergyCalculator.tsx` (modifier)

Le bloc « Paramètres » a deux états :

| État        | Contenu                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------ |
| **Édition** | Champs actuels (sexe, âge, poids, taille, niveau d'activité) + bouton « Valider ».         |
| **Replié**  | Titre « Paramètres » + bouton « Modifier mes paramètres ». Plus aucun champ n'est affiché. |

- Au chargement : `loadProfile()` est lu dans un `useEffect` (pas pendant le rendu, pour éviter un écart d'hydratation SSR). Si un profil valide existe, les champs sont préremplis et le bloc démarre **replié** ; sinon il démarre en **édition**, champs vides (comportement actuel).
- Bouton « Valider » : `type="button"` (il ne déclenche pas le « Calculer » du bloc Activité), cible ≥ 44 px, style `BUTTON_BASE`.
  - Valide uniquement les 4 champs du profil (sexe, âge, poids, taille) avec `validateInputs`. Les erreurs `sportId` et `minutes` ne bloquent pas la validation.
  - Si une erreur existe : les erreurs des champs concernés s'affichent (même mécanique que l'existant : `aria-invalid`, `role="alert"`), rien n'est enregistré, le bloc reste ouvert, le focus va sur le premier champ en erreur.
  - Si tout est valide : `saveProfile(...)`, le bloc se replie, le focus va sur le bouton « Modifier mes paramètres ».
- Bouton « Modifier mes paramètres » : réouvre le bloc avec les valeurs courantes, le focus va sur le premier champ (`firstFieldRef`). Les valeurs ne sont enregistrées de nouveau qu'au prochain « Valider ».
- Les valeurs du profil restent utilisées par le calcul même bloc replié (l'état React est conservé, le bloc n'est pas démonté de la logique, seuls les champs sont masqués).
- Si le profil n'a pas été validé (bloc en édition), le calcul fonctionne comme aujourd'hui avec les valeurs saisies ; « Valider » n'est **pas** requis pour calculer.
- Reset (bouton du bloc Activité) : remet à zéro le sport, la distance et la vitesse, comme aujourd'hui. Il **ne touche pas** au profil enregistré ni à l'état replié du bloc Paramètres (à valider : sinon l'utilisateur perd son profil à chaque Reset). Le focus après Reset va sur le champ « Sport » (`id="sport"`) et non plus sur `firstFieldRef`, puisque celui-ci peut ne pas être affiché.
- Accessibilité : bloc replié avec `aria-expanded` sur le bouton « Modifier mes paramètres » (`false`) ; le résumé n'est pas obligatoire (hors périmètre, voir plus bas).
- Animation : transition éventuelle uniquement en `motion-safe:`.

`components/HomeContent.tsx` : le commentaire « le profil repart vide » devient faux ; le mettre à jour. Aucun autre changement.

### Exemples de référence (à couvrir par des tests)

1. Page d'accueil : aucun heading « Gestion alimentaire sportive ».
2. Page d'accueil : un `<h1>` existe et porte le texte neutre (accessible, `sr-only`) ; le paragraphe de présentation reste affiché.
3. `saveProfile` puis `loadProfile` : retourne les mêmes valeurs.
4. `loadProfile` sans clé → `null`. JSON invalide, âge hors bornes, sexe inconnu, `activityIndex` = 9 ou 1,5 → `null`.
5. `loadProfile` / `saveProfile` avec `localStorage` qui lève une exception → pas d'erreur levée, `null` en lecture.
6. `clearProfile` supprime la clé.
7. Premier chargement sans profil enregistré : bloc Paramètres en édition, bouton « Valider » visible, bouton « Modifier mes paramètres » absent.
8. Champs vides, clic sur « Valider » : erreurs affichées, rien dans le `localStorage`, bloc ouvert.
9. Champs valides, clic sur « Valider » : `localStorage` contient le profil, les champs disparaissent, seul « Modifier mes paramètres » reste.
10. Un profil enregistré existe au chargement : bloc replié, calcul des résultats possible dès que sport + distance + vitesse sont remplis.
11. Clic sur « Modifier mes paramètres » : champs réaffichés avec les valeurs enregistrées, focus sur « Homme » (premier champ).
12. Modification d'un champ puis « Valider » : le `localStorage` est mis à jour, bloc replié.
13. Erreur sur le sport (non choisi) ou sur la durée : n'empêche pas « Valider ».
14. Profil valide + clic sur « Calculer » sans avoir validé : résultats calculés (Valider n'est pas requis).
15. Reset : sport, distance et vitesse vidés ; profil et état replié conservés ; `localStorage` inchangé.
16. « Valider » n'envoie pas le formulaire (aucune erreur de sport/effort n'apparaît à cause de Valider).
17. Les tests existants de `EnergyCalculator.test.tsx` restent verts après adaptation (le `localStorage` est vidé avant chaque test pour qu'aucun profil ne soit pré-chargé).

### Partie A — Agent (TDD strict, un fichier à la fois, dans cet ordre)

1. `app/page.test.tsx` (corriger l'assertion rouge, ajouter l'exemple 2) → `app/page.tsx`
2. `lib/profileStorage.test.ts` → `lib/profileStorage.ts` (exemples 3 à 6)
3. `components/EnergyCalculator.test.tsx` (adapter + ajouts, exemples 7 à 17) → `components/EnergyCalculator.tsx`
4. `components/HomeContent.tsx` (commentaire uniquement)

### Fichiers à créer / modifier

- `app/page.tsx` + `app/page.test.tsx` (modifier)
- `lib/profileStorage.ts` + `lib/profileStorage.test.ts` (créer)
- `components/EnergyCalculator.tsx` + `components/EnergyCalculator.test.tsx` (modifier)
- `components/HomeContent.tsx` (modifier : commentaire uniquement)

Les autres fichiers (`lib/energy.ts`, `lib/effort.ts`, `lib/nutrition.ts`, `lib/nutritionStorage.ts`, `lib/sports.ts`, `components/NutritionPlanner.tsx`, `components/NutritionPlanView.tsx`, `app/nutrition/**`) restent inchangés. Si un test existant hors liste casse (`HomeContent.test.tsx`, `NutritionPlanner.test.tsx`, `app/nutrition/page.test.tsx`), s'arrêter et le signaler.

### Contraintes

- TypeScript strict, pas de `any`.
- Test écrit et vu en échec avant chaque code.
- Aucune nouvelle dépendance.
- Aucun `fetch`, aucune API Route.
- Avant de créer un utilitaire, consulter `catalogue.md` (`parseDecimal`, `validateInputs` existent dans `lib/energy.ts` : les réutiliser, ne pas dupliquer les bornes).
- Accès au `localStorage` uniquement dans `lib/profileStorage.ts`, toujours dans un `try/catch` ; jamais pendant le rendu.
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
- [ ] `grep -rn "Gestion alimentaire sportive" app components lib` ne retourne rien
- [ ] `app/page.test.tsx` couvre les exemples 1 et 2
- [ ] `lib/profileStorage.test.ts` couvre les exemples 3 à 6
- [ ] `components/EnergyCalculator.test.tsx` couvre les exemples 7 à 17
- [ ] `grep -rn "localStorage" components app` ne retourne rien (accès centralisé dans `lib/`)
- [ ] `grep -nE "#[0-9a-fA-F]{3,8}|gray-|bg-black|bg-white|text-black|text-white" components app` ne retourne rien
- [ ] `grep -rn "fetch" app components lib` ne retourne rien
- [ ] `git diff --stat` : seuls les fichiers listés sont modifiés

### Partie C — Toi (après)

- `npm run dev`, vérifier à 320 / 390 / 768 px : page sans titre visible, saisie du profil, « Valider », bloc replié, « Modifier mes paramètres ».
- Recharger la page : le profil doit revenir et le bloc rester replié. Vérifier la clé `kcalapp:profile:v1` dans les DevTools (Application › Local Storage).
- Vérifier le parcours complet : profil validé, effort saisi, Calculer, plan nutrition, lien Retour.
- Vérifier au clavier (focus après « Valider » et après « Modifier mes paramètres ») et avec `prefers-reduced-motion`.
- Relire le texte du `<h1>` masqué et le libellé des boutons.
- Commit uniquement après `npx tsc --noEmit` et les tests, avec ton accord.

### Hors périmètre

- Point 4 et suivants de `evolution-app.md` (Neon, GPX/VMA/PMA, profil altimétrique/export, feedback) et point 8 (After-Activity) : SPEC dédiées.
- Enregistrement du sport, de la distance et de la vitesse.
- Création du logo de l'app
- Résumé du profil affiché dans le bloc replié (« Homme · 35 ans · 72 kg… »).
- Bouton « Effacer mon profil » (`clearProfile` est exposé et testé mais sans bouton).
- Synchronisation du profil avec une base de données ou entre appareils.
- Création d'`AGENTS.md`.
