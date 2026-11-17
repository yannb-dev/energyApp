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

/** Icône « barre énergétique » (aussi lisible comme gel) : timeline et bloc Solide. */
export function EnergyBarIcon({ className = ICON }: NutritionIconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="5" y="8" width="14" height="8" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5 9 2.5 10v4L5 15"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 9 21.5 10v4L19 15"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 11h4.5M9 13.5h2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Icône « gel » : sachet souple avec embout. */
export function GelIcon({ className = ICON }: NutritionIconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M9 8.5h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 8.5V6.2l1.5-2 1.5 2v2.3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9 13h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Icône « pâte de fruit » : petit bloc confit. */
export function FruitPasteIcon({ className = ICON }: NutritionIconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="7" width="16" height="10" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M9 12h6M12 9v6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Icône gourde de sport : timeline et bloc Liquide. */
export function FlaskIcon({ className = ICON }: NutritionIconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M11 1.8h2v1.6h-2z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="9.4"
        y="3.2"
        width="5.2"
        height="2.6"
        rx="0.8"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M9 5.8 7.5 8.4v11a1.6 1.6 0 0 0 1.6 1.6h5.8a1.6 1.6 0 0 0 1.6-1.6v-11L15 5.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9.6 12.6h2.4M9.6 16h2.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
