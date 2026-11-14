import { EnergyBarIcon, FlaskIcon } from "@/components/NutritionIcons";
import {
  buildNutritionTimeline,
  DRINK_SERVING_ML,
  timelineOffsetPx,
  type NutritionFormValues,
  type NutritionPlan,
  type ProductType,
} from "@/lib/nutrition";

/** Libellé du solide : « barre(s) », « gel(s) », sinon « unité(s) ». */
function solidLabel(productType: ProductType | "", units: number): string {
  const base =
    productType === "Barre" ? "barre" : productType === "Gel" ? "gel" : "unité";
  return `${units} ${units > 1 ? `${base}s` : base}`;
}

function plural(count: number, one: string, many: string): string {
  return count > 1 ? many : one;
}

function formatMinute(minute: number): string {
  return String(Math.round(minute));
}

type NutritionTimelineProps = {
  values: NutritionFormValues;
  plan: NutritionPlan;
};

export default function NutritionTimeline({
  values,
  plan,
}: NutritionTimelineProps) {
  const timeline = buildNutritionTimeline(values, plan);
  const minutes = timeline.minutes;
  const height = timelineOffsetPx(minutes);
  const solids = timeline.events.filter((event) => event.kind === "solid");
  const drinks = timeline.events.filter((event) => event.kind === "drink");
  const volumeMl = plan.drink ? Math.round(plan.drink.volumeMl) : 0;

  const label = plan.drink
    ? `${solids.length} ${plural(solids.length, "prise solide", "prises solides")} et ${
        drinks.length
      } ${plural(drinks.length, "gorgée", "gorgées")} sur ${minutes} min, ${volumeMl} ml de boisson`
    : `${solids.length} ${plural(solids.length, "prise solide", "prises solides")} sur ${minutes} min`;

  return (
    <div
      data-testid="nutrition-timeline"
      role="img"
      aria-label={label}
      className="motion-safe:animate-rise flex flex-col gap-3"
    >
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <li
          data-testid="timeline-recap-solid"
          className="flex items-center gap-1.5 font-medium text-ink"
        >
          <EnergyBarIcon />
          {solidLabel(values.productType, plan.units)}
        </li>
        {plan.drink ? (
          <li
            data-testid="timeline-recap-drink"
            className="flex items-center gap-1.5 font-medium text-ink"
          >
            <FlaskIcon />
            {volumeMl} ml de boisson
          </li>
        ) : null}
      </ul>

      <div className="mb-6">
        <div
          data-testid="timeline-axis"
          className="relative grid grid-cols-[1fr_auto_1fr] gap-4"
          style={{ height: `${height}px` }}
        >
          <div className="relative">
            {solids.map((event) => (
              <div
                key={`solid-${event.minute}`}
                data-testid="timeline-solid"
                className="absolute right-0 flex -translate-y-1/2 items-center gap-1.5"
                style={{ top: `${timelineOffsetPx(event.minute)}px` }}
              >
                <span className="text-xs text-muted">
                  {formatMinute(event.minute)} min
                </span>
                <EnergyBarIcon className="h-6 w-6 shrink-0 text-accent" />
              </div>
            ))}
          </div>

          <div
            aria-hidden="true"
            data-testid="timeline-line"
            className="h-full w-[10px] rounded-[3px] bg-line"
          />

          <div className="relative">
            {drinks.map((event) => (
              <div
                key={`drink-${event.minute}`}
                data-testid="timeline-drink"
                className="absolute left-0 flex -translate-y-1/2 items-center gap-1.5"
                style={{ top: `${timelineOffsetPx(event.minute)}px` }}
              >
                <FlaskIcon className="h-6 w-6 shrink-0 text-accent" />
                <span className="text-xs text-muted">
                  {formatMinute(event.minute)} min
                </span>
                <span className="text-xs text-muted">
                  {DRINK_SERVING_ML} ml
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
