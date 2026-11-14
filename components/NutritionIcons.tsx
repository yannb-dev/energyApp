/** Icônes du bloc nutrition : SVG inline, colorées par le token `accent`. */

type NutritionIconProps = {
  className?: string;
};

const ICON = "h-5 w-5 shrink-0 text-accent";

/** Icône « barre céréale » : résumé replié du produit. */
export function CerealBarIcon({ className = ICON }: NutritionIconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <rect
        x="2.5"
        y="8.5"
        width="19"
        height="7"
        rx="3.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8 11.5v1.5M12 11.5v1.5M16 11.5v1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Icône bouteille : résumé replié de la boisson. */
export function BottleIcon({ className = ICON }: NutritionIconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M10 3h4v3.2l2.1 3.2A4 4 0 0 1 16.8 11v8a2 2 0 0 1-2 2H9.2a2 2 0 0 1-2-2v-8a4 4 0 0 1 .7-2.3L10 6.2V3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M7.4 13.5h9.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
