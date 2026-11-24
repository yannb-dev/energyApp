/**
 * Bornes de validation partagées.
 *
 * Ces constantes vivaient dans lib/energy.ts, lib/products.ts, lib/effort.ts et
 * lib/athleteStorage.ts. Comme ces modules délèguent leur validation aux schémas
 * et que les schémas ont besoin des bornes au chargement, les garder là-bas
 * créait un import circulaire : les schémas étaient construits avec des bornes
 * `undefined`. Elles vivent donc ici, sans dépendance, et chaque module les
 * réexporte pour ne rien changer à ses appelants.
 */

export const AGE_MIN = 10;
export const AGE_MAX = 100;
export const WEIGHT_KG_MIN = 30;
export const WEIGHT_KG_MAX = 300;
export const HEIGHT_CM_MIN = 100;
export const HEIGHT_CM_MAX = 250;

export const TEXT_MAX_LENGTH = 50;

export const PRODUCT_KCAL_MIN = 0;
export const PRODUCT_KCAL_MAX = 1000;
export const PRODUCT_SALT_MIN = 0;
export const PRODUCT_SALT_MAX = 5;
export const PRODUCT_WEIGHT_MIN = 1;
export const PRODUCT_WEIGHT_MAX = 500;

export const DISTANCE_KM_MIN = 0.1;
export const DISTANCE_KM_MAX = 1000;

export const SPEED_KMH_MIN = 1;
export const SPEED_KMH_MAX = 100;

/** Bornes de l'allure, en secondes par km : 0:36 à 60:00 (inverse de 100 et 1 km/h). */
export const PACE_SEC_PER_KM_MIN = 36;
export const PACE_SEC_PER_KM_MAX = 3600;

export const VMA_KMH_MIN = 8;
export const VMA_KMH_MAX = 30;
export const PMA_WATTS_MIN = 100;
export const PMA_WATTS_MAX = 600;
export const BIKE_KG_MIN = 5;
export const BIKE_KG_MAX = 25;
