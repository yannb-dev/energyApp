import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import NutritionPlanView from "@/components/NutritionPlanView";
import type { EffortFormValues } from "@/lib/effort";
import type { Product } from "@/lib/products";
import { NUTRITION_STORAGE_KEY, type NutritionSettings } from "@/lib/nutritionStorage";
import { renderWithProviders } from "@/test/renderWithProviders";

/** Force le débit d'eau pour éprouver le dépassement du plafond hydrique. */
const water = vi.hoisted(() => ({ override: null as number | null }));

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

/** Effort de référence : 24 km à 12 km/h, soit 120 min. */
const EFFORT_120: EffortFormValues = {
  distanceKm: "24",
  speed: "12",
  speedUnit: "kmh",
};

/** Même allure sur 12 km : 60 min. */
const EFFORT_60: EffortFormValues = {
  distanceKm: "12",
  speed: "12",
  speedUnit: "kmh",
};

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

const SETTINGS: NutritionSettings = {
  carbCap: "60",
  sodiumCap: "600",
  products: [BARRE, GEL],
  selectedIds: ["barre", "gel"],
  strategyKey: "mixte50",
  drinkEnabled: false,
  drinkBrand: "Overstims",
  drinkName: "Boisson énergétique",
  drinkConcentration: "40",
  drinkKcalPer100: "380",
  drinkCarbsPer100: "75",
  drinkSaltPer100: "3",
};

function store(overrides: Partial<NutritionSettings> = {}) {
  window.localStorage.setItem(
    NUTRITION_STORAGE_KEY,
    JSON.stringify({ ...SETTINGS, ...overrides }),
  );
}

function renderPlan(effort: EffortFormValues = EFFORT_120) {
  return renderWithProviders(<NutritionPlanView />, {
    activity: { effort },
  });
}

describe("NutritionPlanView", () => {
  beforeEach(() => {
    window.localStorage.clear();
    water.override = null;
  });

  it("affiche le rappel, une tuile par produit, les totaux et la timeline", async () => {
    store();

    renderPlan();

    expect(await screen.findByTestId("nutrition-results")).toBeInTheDocument();

    const rappel = within(screen.getByRole("region", { name: "Rappel" }));
    expect(rappel.getByText("120 min")).toBeInTheDocument();
    expect(rappel.getByText("Barre endurance · Barre")).toBeInTheDocument();
    expect(rappel.getByText("Gel café · Gel")).toBeInTheDocument();
    expect(rappel.getByText("Produit A")).toBeInTheDocument();
    expect(rappel.getByText("Produit B")).toBeInTheDocument();

    const tiles = screen.getAllByTestId("nutrition-product-result");
    expect(tiles).toHaveLength(2);
    expect(tiles[0]).toHaveAttribute("data-product-id", "barre");
    expect(within(tiles[0]).getByTestId("nutrition-units")).toHaveTextContent("2");
    expect(tiles[1]).toHaveAttribute("data-product-id", "gel");
    expect(within(tiles[1]).getByTestId("nutrition-units")).toHaveTextContent("2");

    expect(screen.getByTestId("nutrition-total-carbs")).toHaveTextContent("94,0");
    expect(screen.getByTestId("nutrition-total-sodium")).toHaveTextContent("280");
    expect(screen.getByTestId("nutrition-rate-carbs")).toHaveTextContent("47,0");
    expect(screen.getByTestId("nutrition-rate-sodium")).toHaveTextContent("140");
    expect(screen.getByText("Facteur limitant : glucides")).toBeInTheDocument();
    expect(screen.queryByTestId("nutrition-warning")).not.toBeInTheDocument();

    expect(screen.getByTestId("nutrition-cap-carbs")).toHaveTextContent("Glucides : 47,0 / 60 g/h");
    expect(screen.getByTestId("nutrition-cap-sodium")).toHaveTextContent("Sodium : 140 / 600 mg/h");
    expect(screen.getByTestId("nutrition-cap-water")).toHaveTextContent("Eau : 0 ml/h");
    expect(screen.getByTestId("nutrition-timeline")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Modifier mes données" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("« Modifier mes données » pointe vers l'accueil (exemple 19)", async () => {
    store();

    renderPlan();

    await screen.findByTestId("nutrition-results");
    expect(screen.getByRole("link", { name: "Modifier mes données" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("déduit la boisson du budget et la présente dans une tuile (exemple 6)", async () => {
    store({ drinkEnabled: true });

    renderPlan();

    const tiles = await screen.findAllByTestId("nutrition-product-result");
    expect(within(tiles[0]).getByTestId("nutrition-units")).toHaveTextContent("1");
    expect(within(tiles[1]).getByTestId("nutrition-units")).toHaveTextContent("1");

    const liquid = screen.getByTestId("nutrition-result-liquid");
    expect(liquid).toHaveTextContent("Liquide");
    expect(liquid).toHaveTextContent(/1200 ml/);
    expect(liquid).toHaveTextContent(/48,0 g de poudre/);
    expect(screen.getByTestId("nutrition-total-carbs")).toHaveTextContent("83,0");
    expect(screen.getByTestId("nutrition-total-sodium")).toHaveTextContent("716");
    expect(screen.getByTestId("nutrition-cap-water")).toHaveTextContent("Eau : 600 ml/h");
  });

  it("calcule uniquement avec la boisson sans solide (exemple 15)", async () => {
    store({ selectedIds: [], products: [], drinkEnabled: true });

    renderPlan();

    expect(await screen.findByTestId("nutrition-result-liquid")).toHaveTextContent("Liquide");

    expect(screen.queryAllByTestId("nutrition-product-result")).toHaveLength(0);
    expect(screen.getByTestId("nutrition-total-carbs")).toHaveTextContent("36,0");
    expect(screen.getByTestId("nutrition-total-sodium")).toHaveTextContent("576");
    expect(screen.queryByTestId("nutrition-warning")).not.toBeInTheDocument();
  });

  it("affiche « Aucune boisson » et une jauge d'eau vide sans boisson", async () => {
    store();

    renderPlan();

    const liquid = await screen.findByTestId("nutrition-result-liquid");
    expect(liquid).toHaveTextContent("Aucune boisson");
    expect(screen.getByTestId("nutrition-cap-water")).toHaveTextContent("Eau : 0 ml/h");
    expect(screen.getByTestId("nutrition-cap-water")).not.toHaveClass("text-danger");
  });

  it("passe les plafonds en danger quand ils sont dépassés", async () => {
    store({
      products: [BARRE],
      selectedIds: ["barre"],
      drinkEnabled: true,
      drinkConcentration: "150",
      drinkCarbsPer100: "90",
      drinkSaltPer100: "0",
    });

    renderPlan(EFFORT_60);

    const carbs = await screen.findByTestId("nutrition-cap-carbs");
    expect(carbs).toHaveTextContent("Glucides : 81,0 / 60 g/h");
    expect(carbs).toHaveClass("text-danger");
    expect(
      screen.getByRole("progressbar", { name: "Glucides par heure" }),
    ).toHaveClass("bg-danger");
    expect(screen.getByText("Réduis la concentration de la boisson.")).toBeInTheDocument();
  });

  it("passe la jauge d'eau en danger en cas de dépassement", async () => {
    water.override = 900;
    store({ drinkEnabled: true });

    renderPlan();

    const gauge = await screen.findByTestId("nutrition-cap-water");
    expect(gauge).toHaveTextContent("Eau : 900 ml/h");
    expect(gauge).toHaveClass("text-danger");
  });

  it("affiche « Données introuvables » sans stockage", async () => {
    renderPlan();

    expect(await screen.findByText("Données introuvables")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Revenir au formulaire" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("affiche « Données introuvables » sans activité, même avec une nutrition valide (exemple 14)", async () => {
    store();

    renderWithProviders(<NutritionPlanView />);

    expect(await screen.findByText("Données introuvables")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Revenir au formulaire" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("affiche « Données introuvables » pour une boisson incomplète (exemple 15)", async () => {
    store({ drinkEnabled: true, drinkConcentration: "" });

    renderPlan();

    expect(await screen.findByText("Données introuvables")).toBeInTheDocument();
  });

  it("propose une aide « ? » à côté du facteur limitant", async () => {
    store();

    renderPlan();

    const help = await screen.findByRole("button", { name: "Aide : facteur limitant" });

    expect(help).toHaveAttribute("aria-expanded", "false");
    expect(help).toHaveAttribute("aria-controls", "help-limiting-factor");

    await userEvent.setup().click(help);

    expect(help).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "Facteur limitant" })).toHaveTextContent(
      "part",
    );
  });
});
