import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import NutritionPlanView from "@/components/NutritionPlanView";
import { NUTRITION_STORAGE_KEY } from "@/lib/nutritionStorage";

const navigation = vi.hoisted(() => ({ search: new URLSearchParams() }));

/** Force le débit d'eau pour éprouver le dépassement du plafond hydrique. */
const water = vi.hoisted(() => ({ override: null as number | null }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => navigation.search,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/nutrition", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/nutrition")>();
  return {
    ...actual,
    computeHydrationRate: (
      plan: Parameters<typeof actual.computeHydrationRate>[0],
      minutes: number,
    ) => water.override ?? actual.computeHydrationRate(plan, minutes),
  };
});

const STORED_PRODUCT = {
  carbCap: "60",
  sodiumCap: "600",
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
};

function store(overrides: Record<string, unknown> = {}) {
  window.localStorage.setItem(
    NUTRITION_STORAGE_KEY,
    JSON.stringify({ ...STORED_PRODUCT, ...overrides }),
  );
}

describe("NutritionPlanView", () => {
  beforeEach(() => {
    window.localStorage.clear();
    navigation.search = new URLSearchParams("min=120");
    water.override = null;
  });

  it("affiche le rappel, les résultats, les plafonds et la timeline", async () => {
    store({ drinkEnabled: true });

    render(<NutritionPlanView />);

    expect(await screen.findByTestId("nutrition-units")).toHaveTextContent("3");
    expect(screen.getByTestId("nutrition-interval")).toHaveTextContent("40");
    expect(screen.getByTestId("nutrition-drink-volume")).toHaveTextContent("1200");
    expect(screen.getByTestId("nutrition-total-carbs")).toHaveTextContent("111,0");
    expect(screen.getByTestId("nutrition-total-sodium")).toHaveTextContent("876");
    expect(screen.getByTestId("nutrition-rate-carbs")).toHaveTextContent("55,5");
    expect(screen.getByTestId("nutrition-rate-sodium")).toHaveTextContent("438");
    expect(screen.queryByTestId("nutrition-warning")).not.toBeInTheDocument();

    expect(
      within(screen.getByRole("region", { name: "Rappel" })).getByText("120 min"),
    ).toBeInTheDocument();
    expect(screen.getByText("Barre endurance · Barre")).toBeInTheDocument();
    expect(screen.getByText("Boisson énergétique · 40 g/L")).toBeInTheDocument();

    expect(screen.getByTestId("nutrition-cap-carbs")).toHaveTextContent("Glucides : 55,5 / 60 g/h");
    expect(screen.getByTestId("nutrition-cap-sodium")).toHaveTextContent("Sodium : 438 / 600 mg/h");
    expect(screen.getByTestId("nutrition-cap-water")).toHaveTextContent("Eau : 600 / 750 ml/h");
    expect(screen.getByText("Repère usuel : 400 à 800 ml/h")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Glucides par heure" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Sodium par heure" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Boisson par heure" })).toBeInTheDocument();

    expect(screen.getByTestId("nutrition-timeline")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-recap-solid")).toHaveTextContent("3 barres");
    expect(
      screen.getByRole("link", { name: "Modifier mes données" }),
    ).toHaveAttribute("href", "/?min=120");
    expect(
      screen.getByText(/Repères généraux, à adapter avec un professionnel de santé/i),
    ).toBeInTheDocument();
  });

  it("présente le solide et le liquide dans deux colonnes de la même grille", async () => {
    store({ drinkEnabled: true });

    render(<NutritionPlanView />);

    const solid = await screen.findByTestId("nutrition-result-solid");
    const liquid = screen.getByTestId("nutrition-result-liquid");

    expect(solid).toHaveTextContent("Solide");
    expect(solid).toContainElement(screen.getByTestId("nutrition-units"));
    expect(solid).toContainElement(screen.getByTestId("nutrition-interval"));

    expect(liquid).toHaveTextContent("Liquide");
    expect(liquid).toContainElement(screen.getByTestId("nutrition-drink-volume"));
    expect(liquid).toHaveTextContent(/1200 ml/);
    expect(liquid).toHaveTextContent(/8 prises/);
    expect(liquid).toHaveTextContent(/48,0 g de poudre/);

    const grid = solid.parentElement;
    expect(grid).toBe(liquid.parentElement);
    expect(grid).toHaveClass("grid", "grid-cols-2", "gap-2");
  });

  it("affiche « Aucune boisson » et une jauge d'eau vide sans boisson", async () => {
    store();

    render(<NutritionPlanView />);

    const liquid = await screen.findByTestId("nutrition-result-liquid");
    expect(liquid).toHaveTextContent("Aucune boisson");
    expect(screen.getByTestId("nutrition-cap-water")).toHaveTextContent("Eau : 0 / 750 ml/h");
    expect(screen.getByTestId("nutrition-cap-water")).not.toHaveClass("text-danger");
  });

  it("place la jauge d'eau sous la jauge sodium", async () => {
    store({ drinkEnabled: true });

    render(<NutritionPlanView />);

    const sodium = await screen.findByTestId("nutrition-cap-sodium");
    const waterGauge = screen.getByTestId("nutrition-cap-water");

    expect(sodium.compareDocumentPosition(waterGauge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("passe les plafonds en danger quand ils sont dépassés", async () => {
    navigation.search = new URLSearchParams("min=60");
    store({ drinkEnabled: true, drinkConcentration: "150", drinkCarbsPer100: "90", drinkSaltPer100: "0" });

    render(<NutritionPlanView />);

    const carbs = await screen.findByTestId("nutrition-cap-carbs");
    expect(carbs).toHaveTextContent("Glucides : 81,0 / 60 g/h");
    expect(carbs).toHaveClass("text-danger");
    expect(screen.getByRole("progressbar", { name: "Glucides par heure" })).toHaveClass("bg-danger");
    expect(screen.getByTestId("nutrition-cap-sodium")).not.toHaveClass("text-danger");
    expect(screen.getByTestId("nutrition-cap-water")).not.toHaveClass("text-danger");
    expect(screen.getByTestId("nutrition-warning")).toHaveTextContent(
      "Réduis la concentration de la boisson.",
    );
  });

  it("passe la jauge d'eau en danger en cas de dépassement", async () => {
    water.override = 900;
    store({ drinkEnabled: true });

    render(<NutritionPlanView />);

    const gauge = await screen.findByTestId("nutrition-cap-water");
    expect(gauge).toHaveTextContent("Eau : 900 / 750 ml/h");
    expect(gauge).toHaveClass("text-danger");
    expect(screen.getByRole("progressbar", { name: "Boisson par heure" })).toHaveClass("bg-danger");
  });

  it("affiche « Données introuvables » sans stockage", async () => {
    render(<NutritionPlanView />);

    expect(await screen.findByText("Données introuvables")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Revenir au formulaire" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("affiche « Données introuvables » pour une durée invalide", async () => {
    navigation.search = new URLSearchParams("min=zéro");
    store();

    render(<NutritionPlanView />);

    expect(await screen.findByText("Données introuvables")).toBeInTheDocument();
  });
});
