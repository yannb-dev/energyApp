## SPEC-07 — Définir une activité à partir d'une trace GPX, d'une VMA ou d'une PMA (spec générale)

### Contexte

Implémente le point 5 de `specs/evolution-app.md`. Aujourd'hui, la durée de l'effort vient d'une distance et d'une vitesse saisies à la main (SPEC-05). Cette évolution permet à l'utilisateur d'**importer une trace GPX** et de choisir une **intensité** : l'app en déduit la durée, un profil altimétrique et les temps de passage par kilomètre, à partir de sa **VMA** (course, trail) ou de sa **PMA** (vélo).

Le chantier est trop gros pour une seule SPEC : cette spec générale fixe la vision, les décisions communes et le découpage. **Aucune règle détaillée n'y figure** : elles sont dans les sous-specs ci-dessous. En cas de contradiction, la sous-spec fait foi pour son périmètre.

Le reste de l'app continue de raisonner en minutes (`NutritionPlanner`, `NutritionPlanView`, timeline) : le résultat de cette fonctionnalité est une durée en minutes entières, injectée par le mécanisme existant (`onMinutesChange` → `?min=`, voir SPEC-02.1 et SPEC-05).

Aucune base de données, aucun réseau, calcul côté client. TDD : chaque fichier a son test écrit et vu en échec AVANT le code.

### Découpage

| Sous-spec | Sujet | Dépend de | Livrables principaux |
| --- | --- | --- | --- |
| [SPEC-07.1](SPEC-07.1.md) | Parser GPX et traitement de la trace (distance, altitude lissée, D+/D−, segments, kilomètres) | — | `lib/gpx.ts` |
| [SPEC-07.2](SPEC-07.2.md) | Profil athlète : VMA, PMA, vélo ; niveaux d'intensité ; famille de sport | — | `lib/intensity.ts`, `lib/athleteStorage.ts`, `lib/sports.ts`, bloc Paramètres |
| [SPEC-07.3](SPEC-07.3.md) | Modèle course / trail : VMA × intensité, pente (Minetti), terrain | 07.1, 07.2 | `lib/pacingRun.ts` |
| [SPEC-07.4](SPEC-07.4.md) | Modèle cyclisme : PMA × intensité, masse, CdA, pente | 07.1, 07.2 | `lib/pacingBike.ts` |
| [SPEC-07.5](SPEC-07.5.md) | Interface : import, intensité, terrain, profil altimétrique, temps de passage, liaison nutrition | 07.1 à 07.4 | `components/GpxActivity.tsx` et associés |

Ordre de livraison : **07.1 → 07.2 → 07.3 → 07.4 → 07.5**. 07.1 et 07.2 sont indépendantes ; 07.3 et 07.4 le sont entre elles. Chaque sous-spec est livrable et testable seule, sans changer le comportement visible tant que 07.5 n'est pas faite.

### Parcours cible

1. L'utilisateur renseigne son profil (bloc Paramètres, SPEC-06) et, dans le même bloc, sa **VMA** et/ou sa **PMA**, et le cas échéant un vélo (07.2).
2. Dans le bloc Activité, il choisit le sport. Pour course, trail et vélo, un sélecteur propose « Saisie manuelle » (SPEC-05, inchangée) ou « Trace GPX ».
3. Il importe un fichier `.gpx`, choisit l'intensité (et le terrain pour le trail).
4. L'app affiche distance, D+/D−, durée, profil altimétrique et temps de passage par km (07.5).
5. « Calculer ma nutrition » utilise la durée obtenue, comme avant.

### Décisions communes

**Intensités** (une seule constante `INTENSITY_LEVELS`, définie en 07.2, partagée par 07.3 et 07.4) :

| Niveau | % de la VMA ou de la PMA |
| --- | --- |
| Endurance fondamentale | 60 % |
| Rythme modéré | 70 % |
| Rythme soutenu | 80 % |
| Compétition | 85 % |

**Familles de sport** : `Sport` reçoit un champ `family: "run" | "trail" | "bike" | "other"`. Le mode GPX n'est proposé que pour `run`, `trail` et `bike`. Ski de randonnée et randonnée (`other`) restent en saisie distance × vitesse.

**Une seule fonction de durée** : le résultat GPX est une durée en minutes entières, bornée par `MINUTES_MIN` / `MAX` (`lib/nutrition.ts`) ; `lib/effort.ts` n'est pas dupliqué (`formatDuration`, `formatPace` réutilisés).

**Vie privée** : la trace est lue et traitée localement, **jamais stockée, jamais envoyée** (aucun `fetch`, aucune écriture dans `localStorage`). Une trace révèle des lieux (domicile) : seules les valeurs dérivées (distance, D+/D−, durée) quittent le composant. Toute persistance de traces est reportée au point 6, après le point 4 (compte, RGPD).

**Hypothèses de modèle** (coefficients « à définir » du point 5 de `evolution-app.md`, posés ici comme valeurs par défaut, modifiables en revue, et chacun dans une constante nommée et testée) :

- Pente course/trail : coût énergétique de Minetti, effort constant ; facteur de vitesse plafonné en descente (07.3).
- Terrain (trail) : Roulant 1,00 · Accidenté 0,92 · Très technique 0,82 en multiplicateur de vitesse (07.3).
- Vélo : Crr 0,005, ρ 1,2 kg/m³, rendement transmission 0,975, CdA 0,40 / 0,32 / 0,26 m² selon la position, vitesse de descente plafonnée à 70 km/h (07.4).
- Altitude : lissage par moyenne glissante sur 50 m, D+ avec seuil d'hystérésis de 3 m (07.1).

**Wording** : information générale, estimation indicative, pas de conseil d'entraînement ni médical. Les estimations de durée ne remplacent pas un test de terrain.

### Contraintes communes (toutes les sous-specs)

- TypeScript strict, pas de `any`.
- Test écrit et vu en échec avant chaque code.
- Aucune nouvelle dépendance (parsing GPX par `DOMParser`, graphiques en SVG fait main).
- Aucun `fetch`, aucune API Route.
- Avant de créer un utilitaire, consulter `catalogue.md` ; réutiliser `parseDecimal`, `validateInputs`, `formatDuration`, `formatPace`, `InfoTooltip`, `lib/helpTexts.ts`.
- Formules uniquement dans `lib/`, jamais dans le JSX.
- Accès au `localStorage` uniquement dans `lib/*Storage.ts`, toujours dans un `try/catch`, jamais pendant le rendu.
- Couleurs uniquement via les tokens du thème (aucun hex, `gray-*`, `bg-black/white`, `text-black/white` dans les `.tsx`) ; mobile-first, cibles tactiles ≥ 44 px, focus visible, animations `motion-safe:`.
- Chaque champ garde son `<label>`.
- Ne modifier aucun autre fichier que ceux listés dans la sous-spec en cours. Pas de commit ni de push.
- Commandes autorisées (liste fermée) : `npm run typecheck` · `npm run lint` · `npm run test:run` · `git status` · `git diff`. Toute autre commande : s'arrêter et demander. Pas de `npm run build`.
- Tout écart par rapport à la SPEC : s'arrêter et le signaler, ne pas corriger en silence.

### Critères d'acceptation de l'ensemble (vérifiés une fois 07.5 livrée)

- [ ] Chaque sous-spec 07.1 à 07.5 a ses propres critères tous cochés
- [ ] `npm run test:run`, `npm run typecheck` et `npm run lint` passent sans erreur
- [ ] Parcours de bout en bout (test d'intégration de 07.5) : GPX importé + VMA + intensité → durée affichée → « Calculer ma nutrition » → `push("/nutrition?min=<durée>")`
- [ ] La saisie manuelle distance × vitesse (SPEC-05) se comporte exactement comme avant, tests SPEC-05 inchangés
- [ ] `grep -rn "fetch" app components lib` ne retourne rien
- [ ] `grep -rn "localStorage" components app` ne retourne rien
- [ ] `grep -rn "gpx" lib/*Storage.ts` ne retourne rien (aucune trace persistée)
- [ ] `grep -nE "#[0-9a-fA-F]{3,8}|gray-|bg-black|bg-white|text-black|text-white" components app` ne retourne rien
- [ ] `git diff --stat` : aucune dépendance ajoutée (`package.json` inchangé)

### Hors périmètre

Superposition du plan de nutrition sur le profil et export dossard / top tube / A4 (point 6), stockage des traces ou activités (points 4 et 6), feedback (point 7), estimation automatique de la VMA ou de la PMA à partir de performances passées, import d'autres formats (TCX, FIT), conditions météo (vent, chaleur), ravitaillements sur le parcours, fatigue progressive sur longues durées, analyse des timestamps de la trace, conseil d'entraînement ou médical.
