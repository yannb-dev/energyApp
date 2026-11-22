/** Icônes du bloc nutrition : PNG inline */

type NutritionIconProps = {
  className?: string;
  type?: string;
};

const ICON = "h-5 w-5 shrink-0 text-accent";

export function SolidIcon({ className, type }: NutritionIconProps) {
  return (
    <div>
      <img className={className} src={`/${type}_dark.png`} alt="" />
    </div>
  );
}

/** Icône bouteille : résumé replié de la boisson. */
export function BottleIcon({ className }: NutritionIconProps) {
  return (
    <div>
      <img className={className} src="/Gourde_dark.png" alt="" />
    </div>
  );
}
