/**
 * Classes Tailwind partagées par les formulaires : recopiées avant 08.4 dans
 * `EnergyCalculator` et `NutritionPlanner`, désormais définies une seule fois.
 */

export const CARD =
  "rounded-2xl border border-line bg-surface p-4 shadow-lg shadow-canvas/60 sm:p-5";
export const CARD_TITLE =
  "mb-3 text-sm font-semibold uppercase tracking-wide text-muted";
export const FIELD_LABEL = "mb-1 block text-sm font-medium text-ink";
export const FIELD =
  "h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-accent-strong aria-invalid:border-danger";
export const CHIP =
  "flex h-11 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface-2 text-sm font-medium text-muted transition-colors duration-200 hover:text-ink peer-checked:border-accent peer-checked:bg-accent peer-checked:font-semibold peer-checked:text-canvas peer-focus-visible:ring-2 peer-focus-visible:ring-accent-strong";
export const BUTTON_BASE =
  "flex h-11 p-3 sm:p-2 flex-1 items-center justify-center rounded-md px-4 text-sm font-semibold transition duration-200 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 focus-visible:ring-offset-surface";
export const BUTTON_PRIMARY = `${BUTTON_BASE} bg-accent text-canvas hover:bg-accent-strong`;
export const BUTTON_SECONDARY = `${BUTTON_BASE} border border-line text-ink hover:border-accent hover:text-accent-strong`;
export const BLOCK_ACTION =
  "flex h-11 w-full items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold text-ink transition duration-200 hover:border-accent hover:text-accent-strong focus-visible:ring-2 focus-visible:ring-accent-strong";
export const ERROR_TEXT = "mt-1 text-sm text-danger";
