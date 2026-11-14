import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import NutritionPlanView from "@/components/NutritionPlanView";
import { NUTRITION_STORAGE_KEY } from "@/lib/nutritionStorage";

const navigation = vi.hoisted(() => ({ search: new URLSearchParams() }));

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

    expect(screen.getByText("120 min")).toBeInTheDocument();
    expect(screen.getByText("Barre endurance · Barre")).toBeInTheDocument();
    expect(screen.getByText("Boisson énergétique · 40 g/L")).toBeInTheDocument();

    expect(screen.getByTestId("nutrition-cap-carbs")).toHaveTextContent("Glucides : 55,5 / 60 g/h");
    expect(screen.getByTestId("nutrition-cap-sodium")).toHaveTextContent("Sodium : 438 / 600 mg/h");
    expect(screen.getByRole("progressbar", { name: "Glucides par heure" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Sodium par heure" })).toBeInTheDocument();

    expect(screen.getByTestId("nutrition-timeline")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Modifier mes données" }),
    ).toHaveAttribute("href", "/?min=120");
    expect(
      screen.getByText(/Repères généraux, à adapter avec un professionnel de santé/i),
    ).toBeInTheDocument();
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
    expect(screen.getByTestId("nutrition-warning")).toHaveTextContent(
      "Réduis la concentration de la boisson.",
    );
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
