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
  "Le nombre d'unités est calculé deux fois pour chaque produit : pour respecter le plafond de " +
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
