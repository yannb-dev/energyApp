## SPEC-01-style — Thème sombre premium, mobile-first (TailwindCSS)

### Contexte

La logique de SPEC-01 est livrée (`lib/energy.ts`, `lib/sports.ts`, tests verts). L'interface actuelle n'a aucun style travaillé. Cette SPEC ne change QUE l'apparence des fichiers `.tsx` : thème sombre, 3 blocs (Paramètres, Activité, Résultats), animations légères, mobile-first, rendu premium.

Stack de style : Tailwind CSS v4 (déjà installé, `@import "tailwindcss"` dans `app/globals.css`). Configuration CSS-first : les couleurs sont déclarées dans `@theme`, il n'y a pas de `tailwind.config.js`. Aucune dépendance à ajouter (pas de lib d'animation, pas de lib d'icônes : SVG inline si besoin).

### Palette validée — « Nuit & ambre »

Tokens à déclarer dans `app/globals.css` via `@theme` (puis utilisés en classes Tailwind : `bg-surface`, `text-muted`, `border-line`, etc.) :

| Token | Valeur | Usage |
|---|---|---|
| `--color-canvas` | `#0B0D12` | fond de page |
| `--color-surface` | `#141821` | cartes (blocs) |
| `--color-surface-2` | `#1B2030` | champs, select, pistes |
| `--color-line` | `#262C3D` | bordures |
| `--color-ink` | `#F3F4F8` | texte principal |
| `--color-muted` | `#9AA3B8` | texte secondaire, libellés d'aide |
| `--color-accent` | `#F5A524` | bouton principal, slider, focus |
| `--color-accent-strong` | `#FFC15A` | hover, anneau de focus |
| `--color-effort` | `#34D399` | kcal de l'effort |
| `--color-danger` | `#F87171` | erreurs |

Fond de page : `canvas` avec une lueur ambre discrète en haut (`radial-gradient` ambre à ~8 % d'opacité, fixe, derrière le contenu). Texte sur fond `accent` : `canvas` (contraste suffisant).

### Fichiers à créer / modifier

- app/globals.css (modifier : `@theme` des tokens, fond de page, `color-scheme: dark`, keyframes d'entrée, règle `prefers-reduced-motion`)
- app/layout.tsx (modifier : `<body>` avec classes de fond/texte ; police via `next/font/google`, `Inter`, variable CSS `--font-sans`)
- app/page.tsx (modifier : en-tête et conteneur)
- components/EnergyCalculator.tsx (modifier : classes et structure en 3 blocs, SANS toucher à la logique)

Aucun autre fichier. Les fichiers `*.test.tsx` ne sont pas modifiés.

### Structure visuelle

Une seule colonne centrée (`max-w-xl`, `px-4`, `py-8`, écart `gap-4`) sur tous les écrans ; sur mobile les cartes occupent toute la largeur.

**En-tête (page.tsx)** : le `<h1>` reste « Dépense énergétique journalière » (même texte), grand, `text-ink`, avec un sous-titre court en `text-muted`.

**Bloc 1 — « Paramètres »** (carte `<section>` avec titre `<h2>`) : sexe, âge, poids, taille, niveau d'activité (slider).
- Sexe : deux « chips » radio côte à côte (le `<input type="radio">` reste présent, masqué visuellement avec `sr-only`/`peer`, le `<label>` devient la chip ; état coché = fond `accent`, texte `canvas`).
- Âge / poids / taille : champs sur une grille `grid-cols-1`, `sm:grid-cols-3` ; fond `surface-2`, bordure `line`, rayon `xl`, hauteur tactile ≥ 44 px, texte ≥ 16 px (évite le zoom iOS).
- Slider d'activité : piste `surface-2`, curseur `accent` stylé (`accent-accent` ou pseudo-éléments), libellé du niveau retenu mis en avant, échelle des 5 niveaux en `text-xs text-muted` dessous.

**Bloc 2 — « Activité »** (carte) : sport (`<select>` stylé, `appearance-none` + chevron SVG inline) et durée (minutes). Boutons **Calculer** (principal, plein `accent`) et **Reset** (secondaire, contour `line`) en bas, pleine largeur sur mobile, côte à côte dès `sm`.

**Bloc 3 — « Résultats »** (carte) : titre `<h2>` « Résultats ».
- Le bloc `data-testid="results"` n'est rendu que si les résultats existent (comportement actuel inchangé).
- Hiérarchie : les kcal de l'effort en grand, en `text-effort` ; dépense journalière, métabolisme de base et part de l'effort en tuiles `surface-2` (grille 3 colonnes dès `sm`, empilées avant).
- Quand il n'y a pas de résultat : un état vide discret (texte `text-muted`, SANS `data-testid="results"`, texte différent de tous ceux testés) invite à remplir le formulaire.
- La mention « Estimation indicative, non médicale. » reste visible sous les blocs, en `text-muted text-xs`.

**Erreurs** : texte `text-danger text-sm` ; champ en erreur (`aria-invalid`) avec bordure `danger` (`aria-[invalid=true]:border-danger`). Les `role="alert"`, `id` d'erreur et `aria-describedby` restent identiques.

### Animations (légères, Tailwind/CSS uniquement)

- **Entrée des blocs** : fade + léger slide vers le haut (`translateY` ≈ 8 px, 300–400 ms, `ease-out`), les 3 cartes en cascade (délai 0 / 80 / 160 ms via une classe utilitaire + `animation-delay`). Définie dans `globals.css` (`@keyframes` + `--animate-*` dans `@theme`).
- **Transitions** : `transition-colors` / `transition-transform` (150–200 ms) sur boutons, chips, champs ; `hover:` éclaircit vers `accent-strong` ; `active:scale-[0.98]` sur les boutons ; au focus, anneau `ring-2 ring-accent-strong` + `focus-visible` uniquement (pas d'anneau au clic souris).
- Aucune autre animation (pas de compteur animé, pas de barre de progression).
- Toutes les animations sont désactivées sous `prefers-reduced-motion: reduce` (utiliser `motion-safe:` / `motion-reduce:` ou la règle globale dans `globals.css`).

### Contraintes

- Mobile-first : classes de base = mobile, `sm:` / `md:` pour agrandir ; aucune largeur fixe en px qui dépasse 320 px ; aucun défilement horizontal à 320 px.
- Dark uniquement (pas de bascule clair/sombre) : `color-scheme: dark` sur `html`.
- Accessibilité : contraste texte/fond ≥ 4,5:1 ; cibles tactiles ≥ 44 px ; focus visible partout ; ne jamais retirer un `<label>`.
- **Ne pas modifier la logique ni les contrats testés** : textes des labels (`Âge (ans)`, `Poids (kg)`, `Taille (cm)`, `Niveau d'activité`, `Sport`, `Durée (minutes)`, `Homme`, `Femme`), noms des boutons (`Calculer`, `Reset`), `data-testid` (`results`, `bmr`, `tdee`, `effort-kcal`, `effort-share`, `activity-label`, `activity-level`), `role="alert"`, messages d'erreur, `<h1>` (niveau 1, « dépense énergétique »), mention « Estimation indicative, non médicale », focus du Reset sur le premier champ (`ref` sur le radio « Homme »).
- Les couleurs passent par les tokens du thème : pas de valeur hexadécimale ni de classe `gray-*`/`black`/`white` dans les `.tsx`.
- TypeScript strict, pas de `any`. Pas de `<style>` ni de `style={{}}` inline sauf impossibilité Tailwind (à signaler).
- Pas de nouvelle dépendance. Ne modifier aucun autre fichier que ceux listés. Pas de commit ni de push.
- Commandes autorisées (liste fermée) : `npm run typecheck` · `npm run lint` · `npm run test:run` · `git status` · `git diff`. Toute autre commande : s'arrêter et demander. Pas de `npm run build`.
- Tout écart par rapport à la SPEC : s'arrêter et le signaler, ne pas corriger en silence.

### Critères d'acceptation (vérifiables par commande)

- [ ] `npm run test:run` passe SANS modification des fichiers `*.test.tsx` (`git diff --stat` ne montre aucun test)
- [ ] `npm run typecheck` et `npm run lint` passent sans erreur
- [ ] `grep -nE "#[0-9a-fA-F]{3,8}|gray-|bg-black|bg-white|text-black|text-white" components app/page.tsx app/layout.tsx` ne retourne rien
- [ ] `grep -n "@theme" app/globals.css` montre les 10 tokens de la palette
- [ ] `grep -n "prefers-reduced-motion\|motion-reduce\|motion-safe" app/globals.css components/EnergyCalculator.tsx` retourne au moins un résultat
- [ ] `components/EnergyCalculator.tsx` contient 3 `<section>` titrées (Paramètres, Activité, Résultats) avec un `<h2>` chacune
- [ ] Contrôle visuel (toi, partie C) : rendu correct à 320 px, 390 px et 768 px, sans défilement horizontal, thème sombre cohérent

### Partie C — Toi (après)

`npm run dev`, vérifier à 320 / 390 / 768 px (DevTools), tester le clavier (Tab, focus visible) et `prefers-reduced-motion` (DevTools › Rendering). Commit uniquement après `npx tsc --noEmit` et les tests, avec ton accord.

### Hors périmètre

Thème clair et bascule de thème, compteur animé, barre de progression, graphiques, icônes tierces, nouvelle police auto-hébergée, i18n, modification de la logique de calcul ou des tests.
