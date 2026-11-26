import { ACTIVITY_LEVELS } from "@/lib/energy";
import {
  CARB_CAP_RECOMMENDED,
  HYDRATION_CAP_ML_PER_HOUR,
  HYDRATION_CAP_RECOMMENDED,
  SODIUM_CAP_RECOMMENDED,
} from "@/lib/nutrition";

/** Rappel de prudence commun aux textes d'aide. */
const DISCLAIMER = "Information générale, pas un conseil médical.";

/** Coefficients du niveau d'activité, repris de `ACTIVITY_LEVELS`. */
const ACTIVITY_COEFFICIENTS = ACTIVITY_LEVELS.map(
  (level) => `${level.label} ${level.coefficient}`,
).join(" · ");

/** Aide du bloc « Plafond à respecter » : repères usuels issus des constantes. */
export const CAPS_HELP =
  "Le plafond est le maximum par heure que tu te fixes. Repères usuels : " +
  `glucides ${CARB_CAP_RECOMMENDED.min} à ${CARB_CAP_RECOMMENDED.max} g/h — au-delà, ` +
  "cela demande une adaptation et de l'entraînement ; " +
  `sodium ${SODIUM_CAP_RECOMMENDED.min} à ${SODIUM_CAP_RECOMMENDED.max} mg/h ` +
  "(selon la température, on transpire davantage et on évacue plus de sodium ; " +
  "des sueurs très salées augmentent cette valeur) ; " +
  `boisson ${HYDRATION_CAP_RECOMMENDED.min} à ${HYDRATION_CAP_RECOMMENDED.max} ml/h ` +
  `(plafond de boisson fixé à ${HYDRATION_CAP_ML_PER_HOUR} ml/h, attention à ne pas ` +
  `dépasser 1 L/h sous risque d'hyponatrémie). ${DISCLAIMER}`;

/** Aide de la tuile « Métabolisme de base » : décrit `computeBmr`. */
export const BMR_HELP =
  "Calculé avec la formule de Mifflin-St Jeor : " +
  "10 × poids (kg) + 6,25 × taille (cm) − 5 × âge, puis + 5 (homme) ou − 161 (femme). " +
  `Énergie dépensée au repos sur 24 h. Estimation indicative. ${DISCLAIMER}`;

/** Aide de la tuile « Dépense journalière » : décrit `computeTdee`. */
export const TDEE_HELP =
  "Métabolisme de base × coefficient du niveau d'activité. " +
  `Inclut l'activité quotidienne habituelle. Coefficients : ${ACTIVITY_COEFFICIENTS}. ` +
  DISCLAIMER;

/** Aide du « Facteur limitant » : décrit le double calcul de `computeMultiProductPlan`. */
export const LIMITING_FACTOR_HELP =
  "La priorité est toujours donnée à la boisson énergétique quand elle est sélectionné. Le nombre d'unités est calculé deux fois pour chaque produit : pour respecter le plafond de " +
  "glucides et celui de sodium. Le budget est d'abord diminué de la boisson, puis partagé " +
  "entre les produits selon la stratégie choisie. Le facteur limitant est celui du produit " +
  "qui donne le moins d'unités par rapport à sa part. " +
  DISCLAIMER;

/** Aide du dropdown « Stratégie d'alimentation ». */
export const STRATEGY_HELP =
  "La stratégie fixe la part de chaque produit et l'ordre de consommation : en séquence, " +
  "les unités d'un produit sont prises avant celles du suivant ; en alternance, un produit " +
  "différent revient à chaque prise. Le calcul répartit le budget de glucides et de sodium " +
  "entre les produits sélectionnés. " +
  DISCLAIMER;

/** Aide du champ « VMA (km/h) » : terme expliqué, valeur à ajuster. */
export const VMA_HELP =
  "La VMA (vitesse maximale aérobie) est la vitesse de course à laquelle la consommation " +
  "d'oxygène atteint son maximum. C'est une estimation à ajuster selon tes sensations et " +
  `tes tests de terrain. ${DISCLAIMER}`;

/** Aide du champ « PMA (W) » : terme expliqué, valeur à ajuster. */
export const PMA_HELP =
  "La PMA (puissance maximale aérobie) est la puissance que tu peux maintenir quelques " +
  "minutes à vélo. C'est une estimation à ajuster selon tes sensations et tes tests de " +
  `terrain. ${DISCLAIMER}`;

/** Aide du bloc « Intensité » du mode GPX. */
export const INTENSITY_HELP =
  "L'intensité fixe le pourcentage de la VMA (course, trail) ou de la PMA (vélo) tenu sur " +
  "toute la trace. Un pourcentage plus haut raccourcit la durée estimée, un pourcentage " +
  `plus bas l'allonge. ${DISCLAIMER}`;

/** Aide du résumé du mode GPX : méthode de calcul de la durée et des passages. */
export const PACING_METHOD_HELP =
  "Méthode : course et trail appliquent le coût de la pente de Minetti à effort constant, " +
  "vélo résout l'équilibre de puissance (PMA, masse, aérodynamisme, pente). Les temps de " +
  `passage sont cumulés kilomètre par kilomètre. ${DISCLAIMER}`;

/** Aide du bloc « Intensité » en ski de randonnée : méthode Munter. */
export const SKIMO_INTENSITY_HELP =
  "En ski de randonnée, l'intensité fixe la vitesse de montée en unités Munter par heure : " +
  "1 km à plat ou 100 m de dénivelé valent une unité. Une intensité plus haute raccourcit " +
  `la durée estimée de la montée. Estimation indicative. ${DISCLAIMER}`;

/** Aide du résumé du mode GPX en ski de randonnée : phases et transitions. */
export const SKIMO_METHOD_HELP =
  "Méthode : montée et plat avec la méthode Munter (unités d'effort selon l'intensité), " +
  "descente bornée par une vitesse verticale et une vitesse horizontale maximales selon le " +
  "niveau de ski, et un temps fixe de transition à chaque changement de phase. Les temps " +
  `de passage sont cumulés kilomètre par kilomètre. Estimation indicative. ${DISCLAIMER}`;
