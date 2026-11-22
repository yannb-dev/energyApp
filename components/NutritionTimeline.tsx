import { SolidIcon, BottleIcon } from "@/components/NutritionIcons";
import {
  DRINK_SERVING_ML,
  timelineOffsetPx,
  type MultiProductPlan,
  type NutritionTimeline as TimelineData,
} from "@/lib/nutrition";
import type { Product, ProductType } from "@/lib/products";

/** Libellé du solide : « barre(s) », « gel(s) », « pâte(s) de fruit ». */
function solidLabel(productType: ProductType, units: number): string {
  if (productType === "Barre") {
    return `${units} ${units > 1 ? "barres" : "barre"}`;
  }
  if (productType === "Gel") {
    return `${units} ${units > 1 ? "gels" : "gel"}`;
  }
  return `${units} ${units > 1 ? "pâtes de fruit" : "pâte de fruit"}`;
}

function plural(count: number, one: string, many: string): string {
  return count > 1 ? many : one;
}

const formatMinutes = (min: number) => {
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  return `${h}h${String(m).padStart(2, "0")}`;
};

type NutritionTimelineProps = {
  /** Produits sélectionnés, dans l'ordre des labels. */
  products: Product[];
  plan: MultiProductPlan;
  timeline: TimelineData;
};

export default function NutritionTimeline({
  products,
  plan,
  timeline,
}: NutritionTimelineProps) {
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
      <ul className="flex flex-col items-center text-sm">
        {products.map((product) => {
          const units =
            plan.items.find((item) => item.productId === product.id)?.units ??
            0;
          return (
            <div
              key={product.id}
              data-testid="timeline-recap-solid"
              data-product-id={product.id}
              className="w-[50%] flex items-center justify-between font-medium text-ink"
            >
              <SolidIcon type={product.type} className="w-9" />
              {solidLabel(product.type, units)}
            </div>
          );
        })}
        {plan.drink ? (
          <div
            data-testid="timeline-recap-drink"
            className="w-[50%] flex items-center justify-between font-medium text-ink"
          >
            <BottleIcon className="w-5" />
            {volumeMl} ml
          </div>
        ) : null}
      </ul>

      <div className="mb-6">
        <div
          data-testid="timeline-axis"
          className="relative grid grid-cols-[1fr_auto_1fr] gap-4"
          style={{ height: `${height}px` }}
        >
          <div className="relative">
            {solids.map((event, index) => {
              const product = products.find(
                (candidate) => candidate.id === event.productId,
              );
              return (
                <div
                  key={`solid-${event.productId ?? "inconnu"}-${index}`}
                  data-testid="timeline-solid"
                  data-product-id={event.productId}
                  className="absolute right-0 flex -translate-y-1/2 items-center gap-1.5"
                  style={{ top: `${timelineOffsetPx(event.minute)}px` }}
                >
                  <span className="text-xs text-muted">
                    {formatMinutes(event.minute)} min
                  </span>
                  <SolidIcon type={product?.type} className="w-6 shrink-0" />
                </div>
              );
            })}
          </div>

          <div
            aria-hidden="true"
            data-testid="timeline-line"
            className="h-full w-2.5 rounded-[3px] bg-line"
          />

          <div className="relative">
            {drinks.map((event, index) => (
              <div
                key={`drink-${index}`}
                data-testid="timeline-drink"
                className="absolute left-0 flex -translate-y-1/2 items-center gap-1.5"
                style={{ top: `${timelineOffsetPx(event.minute)}px` }}
              >
                <BottleIcon className="w-2 shrink-0" />
                <span className="text-xs text-muted">
                  {formatMinutes(event.minute)} min
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
