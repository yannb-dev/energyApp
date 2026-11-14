import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NutritionTimeline from "@/components/NutritionTimeline";
import {
  buildNutritionTimeline,
  computeNutritionPlan,
  type NutritionFormValues,
} from "@/lib/nutrition";

/** Barre de référence (25 g de glucides, 0,25 g de sel) sur 120 min. */
function timelineFor(overrides: Partial<NutritionFormValues> = {}) {
  const values: NutritionFormValues = {
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
  const plan = computeNutritionPlan(values);
  if (!plan) {
    throw new Error("valeurs de test invalides");
  }
  return buildNutritionTimeline(values, plan);
}

describe("NutritionTimeline", () => {
  it("expose un graphe accessible qui résume les prises et le plafond", () => {
    const timeline = timelineFor({ drinkEnabled: true });

    render(<NutritionTimeline timeline={timeline} />);

    const graphic = screen.getByTestId("nutrition-timeline");
    expect(graphic).toHaveAttribute("role", "img");

    const label = graphic.getAttribute("aria-label") ?? "";
    expect(label).toContain("3 prises solides");
    expect(label).toContain("8 gorgées");
    expect(label).toContain("120 min");
    expect(label).toContain("111 g de glucides");
    expect(label).toContain("plafond de 120 g");
  });

  it("affiche autant de marqueurs que d'événements", () => {
    const timeline = timelineFor({ drinkEnabled: true });

    render(<NutritionTimeline timeline={timeline} />);

    expect(screen.getAllByTestId("timeline-marker")).toHaveLength(timeline.events.length);
  });

  it("empile les deux graphes avec la droite de plafond et la légende", () => {
    const timeline = timelineFor();

    render(<NutritionTimeline timeline={timeline} />);

    expect(screen.getAllByTestId("timeline-graph")).toHaveLength(2);
    expect(screen.getAllByTestId("timeline-cap-line")).toHaveLength(2);
    expect(screen.getByText("Plafond")).toBeInTheDocument();
    expect(screen.getByText("Prises solides")).toBeInTheDocument();
    expect(screen.getByText("Gorgées de boisson")).toBeInTheDocument();
  });

  it("grade l'axe des minutes par pas de 30 min sur 120 min", () => {
    const timeline = timelineFor();

    render(<NutritionTimeline timeline={timeline} />);

    const graph = screen.getAllByTestId("timeline-graph")[0];
    expect(
      within(graph)
        .getAllByTestId("timeline-tick-x")
        .map((node) => node.textContent),
    ).toEqual(["0", "30", "60", "90", "120"]);
  });

  it("grade l'axe des minutes par pas de 15 min sur 60 min", () => {
    const timeline = timelineFor({ minutes: "60" });

    render(<NutritionTimeline timeline={timeline} />);

    const graph = screen.getAllByTestId("timeline-graph")[0];
    expect(
      within(graph)
        .getAllByTestId("timeline-tick-x")
        .map((node) => node.textContent),
    ).toEqual(["0", "15", "30", "45", "60"]);
  });
});
