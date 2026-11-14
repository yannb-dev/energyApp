import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NutritionTimeline from "@/components/NutritionTimeline";
import { computeNutritionPlan, type NutritionFormValues } from "@/lib/nutrition";

/** Barre de référence : 25 g de glucides, 0,25 g de sel, 200 kcal, 60 g. */
function formValues(overrides: Partial<NutritionFormValues> = {}): NutritionFormValues {
  return {
    carbCap: "60",
    sodiumCap: "600",
    minutes: "120",
    productBrand: "Overstims",
    productName: "Barre endurance",
    productType: "Barre",
    productKcal: "200",
    productCarbs: "25",
    productSalt: "0.25",
    productWeight: "60",
    drinkEnabled: false,
    drinkBrand: "Overstims",
    drinkName: "Boisson énergétique",
    drinkConcentration: "40",
    drinkKcalPer100: "380",
    drinkCarbsPer100: "75",
    drinkSaltPer100: "3",
    ...overrides,
  };
}

function setup(overrides: Partial<NutritionFormValues> = {}) {
  const values = formValues(overrides);
  const plan = computeNutritionPlan(values);
  if (!plan) {
    throw new Error("valeurs de test invalides");
  }
  return { values, plan };
}

describe("NutritionTimeline", () => {
  it("résume les barres et la boisson (exemple 2)", () => {
    const { values, plan } = setup({ drinkEnabled: true });

    render(<NutritionTimeline values={values} plan={plan} />);

    expect(screen.getByTestId("timeline-recap-solid")).toHaveTextContent("3 barres");
    expect(screen.getByTestId("timeline-recap-drink")).toHaveTextContent("1200 ml de boisson");
    expect(screen.getAllByTestId("timeline-solid")).toHaveLength(3);
    expect(screen.getAllByTestId("timeline-drink")).toHaveLength(8);
  });

  it("n'affiche que le solide quand il n'y a pas de boisson (exemple 1)", () => {
    const { values, plan } = setup();

    render(<NutritionTimeline values={values} plan={plan} />);

    expect(screen.getByTestId("timeline-recap-solid")).toHaveTextContent("4 barres");
    expect(screen.queryByTestId("timeline-recap-drink")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("timeline-solid")).toHaveLength(4);
    expect(screen.queryAllByTestId("timeline-drink")).toHaveLength(0);
  });

  it("place chaque prise à sa minute sur un axe de 240 px (exemple 2)", () => {
    const { values, plan } = setup({ drinkEnabled: true });

    render(<NutritionTimeline values={values} plan={plan} />);

    expect(screen.getByTestId("timeline-axis")).toHaveStyle({ height: "240px" });

    const solids = screen.getAllByTestId("timeline-solid");
    expect(solids.map((node) => node.style.top)).toEqual(["40px", "120px", "200px"]);
    expect(solids[0]).toHaveTextContent("20 min");

    const drinks = screen.getAllByTestId("timeline-drink");
    expect(drinks.map((node) => node.style.top)).toEqual([
      "30px",
      "60px",
      "90px",
      "120px",
      "150px",
      "180px",
      "210px",
      "240px",
    ]);
    expect(drinks[0]).toHaveTextContent("15 min");
    expect(drinks[0]).toHaveTextContent("150 ml");
  });

  it("trace une ligne de 10 px arrondie, sans indication de temps", () => {
    const { values, plan } = setup();

    render(<NutritionTimeline values={values} plan={plan} />);

    const line = screen.getByTestId("timeline-line");
    expect(line).toHaveClass("w-[10px]", "rounded-[3px]");
    expect(screen.queryByTestId("timeline-tick")).not.toBeInTheDocument();
    expect(screen.queryByTestId("timeline-tick-label")).not.toBeInTheDocument();
    expect(screen.queryByText("0 min")).not.toBeInTheDocument();
  });

  it("adapte la hauteur de l'axe à une durée courte", () => {
    const { values, plan } = setup({ minutes: "30" });

    render(<NutritionTimeline values={values} plan={plan} />);

    expect(screen.getByTestId("timeline-axis")).toHaveStyle({ height: "60px" });
  });

  it("étend l'axe pour une durée longue", () => {
    const { values, plan } = setup({ minutes: "360" });

    render(<NutritionTimeline values={values} plan={plan} />);

    expect(screen.getByTestId("timeline-axis")).toHaveStyle({ height: "720px" });
  });

  it("nomme le solide selon le type de produit", () => {
    const { values, plan } = setup({ productType: "Gel" });

    render(<NutritionTimeline values={values} plan={plan} />);

    expect(screen.getByTestId("timeline-recap-solid")).toHaveTextContent("4 gels");
  });

  it("expose un résumé accessible", () => {
    const { values, plan } = setup({ drinkEnabled: true });

    render(<NutritionTimeline values={values} plan={plan} />);

    const timeline = screen.getByTestId("nutrition-timeline");
    expect(timeline).toHaveAttribute("role", "img");
    expect(timeline.getAttribute("aria-label")).toContain(
      "3 prises solides et 8 gorgées sur 120 min, 1200 ml de boisson",
    );
  });
});
