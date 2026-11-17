import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NutritionTimeline from "@/components/NutritionTimeline";
import {
  buildMultiProductTimeline,
  computeMultiProductPlan,
  type MultiProductInput,
} from "@/lib/nutrition";
import type { Product } from "@/lib/products";

/** Barre de référence : 25 g de glucides, 0,25 g de sel, 200 kcal, 60 g. */
const BARRE: Product = {
  id: "barre",
  brand: "Overstims",
  name: "Barre endurance",
  type: "Barre",
  kcal: 200,
  carbs: 25,
  salt: 0.25,
  weight: 60,
};

const GEL: Product = {
  id: "gel",
  brand: "Overstims",
  name: "Gel café",
  type: "Gel",
  kcal: 100,
  carbs: 22,
  salt: 0.1,
  weight: 35,
};

const DRINK = { concentration: 40, kcalPer100: 380, carbsPer100: 75, saltPer100: 3 };

function setup(overrides: Partial<MultiProductInput> = {}) {
  const input: MultiProductInput = {
    carbCap: 60,
    sodiumCap: 600,
    minutes: 120,
    products: [BARRE],
    shares: [100],
    drink: null,
    ...overrides,
  };
  const plan = computeMultiProductPlan(input);
  const timeline = buildMultiProductTimeline({
    minutes: input.minutes,
    carbCap: input.carbCap,
    sodiumCap: input.sodiumCap,
    products: input.products,
    items: plan.items,
    order: "sequence",
    drink: plan.drink,
  });
  return { input, plan, timeline };
}

describe("NutritionTimeline", () => {
  it("résume le produit unique et la boisson (exemple 1)", () => {
    const { input, plan, timeline } = setup({ drink: DRINK });

    render(<NutritionTimeline products={input.products} plan={plan} timeline={timeline} />);

    expect(screen.getByTestId("timeline-recap-solid")).toHaveTextContent("3 barres");
    expect(screen.getByTestId("timeline-recap-drink")).toHaveTextContent("1200 ml de boisson");
    expect(screen.getAllByTestId("timeline-solid")).toHaveLength(3);
    expect(screen.getAllByTestId("timeline-drink")).toHaveLength(8);
  });

  it("donne un rappel par produit sélectionné (exemple 2)", () => {
    const { input, plan, timeline } = setup({ products: [BARRE, GEL], shares: [50, 50] });

    render(<NutritionTimeline products={input.products} plan={plan} timeline={timeline} />);

    const recaps = screen.getAllByTestId("timeline-recap-solid");
    expect(recaps).toHaveLength(2);
    expect(recaps[0]).toHaveTextContent("2 barres");
    expect(recaps[1]).toHaveTextContent("2 gels");
  });

  it("nomme le produit « pâte de fruit »", () => {
    const pate: Product = { ...GEL, id: "pate", name: "Pâte pomme", type: "Pâte de fruit" };
    const { input, plan, timeline } = setup({ products: [pate] });

    render(<NutritionTimeline products={input.products} plan={plan} timeline={timeline} />);

    expect(screen.getByTestId("timeline-recap-solid")).toHaveTextContent("5 pâtes de fruit");
  });

  it("place chaque prise à sa minute sur un axe de 240 px (exemple 1)", () => {
    const { input, plan, timeline } = setup({ drink: DRINK });

    render(<NutritionTimeline products={input.products} plan={plan} timeline={timeline} />);

    expect(screen.getByTestId("timeline-axis")).toHaveStyle({ height: "240px" });

    const solids = screen.getAllByTestId("timeline-solid");
    expect(solids.map((node) => node.style.top)).toEqual(["40px", "120px", "200px"]);
    expect(solids[0]).toHaveTextContent("20 min");

    const drinks = screen.getAllByTestId("timeline-drink");
    expect(drinks[0]).toHaveTextContent("15 min");
    expect(drinks[0]).toHaveTextContent("150 ml");
  });

  it("suit l'ordre des produits de la timeline (exemple 9)", () => {
    const { input, plan, timeline } = setup({ products: [BARRE, GEL], shares: [50, 50] });

    render(<NutritionTimeline products={input.products} plan={plan} timeline={timeline} />);

    const solids = screen.getAllByTestId("timeline-solid");
    expect(solids.map((node) => node.getAttribute("data-product-id"))).toEqual([
      "barre",
      "barre",
      "gel",
      "gel",
    ]);
  });

  it("trace une ligne de 10 px arrondie, sans indication de temps", () => {
    const { input, plan, timeline } = setup();

    render(<NutritionTimeline products={input.products} plan={plan} timeline={timeline} />);

    const line = screen.getByTestId("timeline-line");
    expect(line).toHaveClass("w-[10px]", "rounded-[3px]");
    expect(screen.queryByText("0 min")).not.toBeInTheDocument();
  });

  it("adapte la hauteur de l'axe à la durée", () => {
    const court = setup({ minutes: 30 });
    const { unmount } = render(
      <NutritionTimeline products={court.input.products} plan={court.plan} timeline={court.timeline} />,
    );
    expect(screen.getByTestId("timeline-axis")).toHaveStyle({ height: "60px" });
    unmount();

    const long = setup({ minutes: 360 });
    render(
      <NutritionTimeline products={long.input.products} plan={long.plan} timeline={long.timeline} />,
    );
    expect(screen.getByTestId("timeline-axis")).toHaveStyle({ height: "720px" });
  });

  it("expose un résumé accessible", () => {
    const { input, plan, timeline } = setup({ drink: DRINK });

    render(<NutritionTimeline products={input.products} plan={plan} timeline={timeline} />);

    const timelineNode = screen.getByTestId("nutrition-timeline");
    expect(timelineNode).toHaveAttribute("role", "img");
    expect(timelineNode.getAttribute("aria-label")).toContain(
      "3 prises solides et 8 gorgées sur 120 min, 1200 ml de boisson",
    );
  });
});
