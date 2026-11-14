import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import NutritionPlanner from "@/components/NutritionPlanner";
import { NUTRITION_STORAGE_KEY } from "@/lib/nutritionStorage";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const user = () => userEvent.setup();

/** Remplit un produit solide valide de référence. */
async function fillProduct() {
  const u = user();
  await u.type(screen.getByLabelText("Marque"), "Overstims");
  await u.type(screen.getByLabelText("Nom du produit"), "Barre endurance");
  await u.selectOptions(screen.getByLabelText("Type"), "Barre");
  await u.type(screen.getByLabelText("Énergie (kcal)"), "200");
  await u.type(screen.getByLabelText("Glucides (g)"), "25");
  await u.type(screen.getByLabelText("Sel (g)"), "0.25");
  await u.type(screen.getByLabelText("Poids (g)"), "60");
  return u;
}

/** Remplit une boisson valide de référence. */
async function fillDrink(u: ReturnType<typeof userEvent.setup>) {
  await u.click(screen.getByLabelText("Ajouter une boisson énergétique"));
  await u.type(screen.getByLabelText("Marque de la boisson"), "Overstims");
  await u.type(screen.getByLabelText("Nom de la boisson"), "Boisson énergétique");
  await u.type(screen.getByLabelText("Concentration (g/L)"), "40");
  await u.type(screen.getByLabelText("Énergie pour 100 g (kcal)"), "380");
  await u.type(screen.getByLabelText("Glucides pour 100 g (g)"), "75");
  await u.type(screen.getByLabelText("Sel pour 100 g (g)"), "3");
}

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
  drinkBrand: "",
  drinkName: "",
  drinkConcentration: "",
  drinkKcalPer100: "",
  drinkCarbsPer100: "",
  drinkSaltPer100: "",
};

describe("NutritionPlanner", () => {
  beforeEach(() => {
    push.mockClear();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("affiche les plafonds, le produit, la boisson et les deux actions", () => {
    render(<NutritionPlanner minutes="" />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Plafond à respecter" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Produit" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Boisson" })).toBeInTheDocument();

    expect(screen.getByLabelText("Glucides max (g/h)")).toHaveValue(60);
    expect(screen.getByLabelText("Sodium max (mg/h)")).toHaveValue(600);
    expect(screen.getByText("Repère usuel : 30 à 90 g/h")).toBeInTheDocument();
    expect(screen.getByText("Repère usuel : 300 à 1000 mg/h")).toBeInTheDocument();

    expect(screen.getByLabelText("Marque")).toBeInTheDocument();
    expect(screen.getByLabelText("Nom du produit")).toBeInTheDocument();
    expect(screen.getByLabelText("Type")).toBeInTheDocument();
    expect(screen.getByLabelText("Énergie (kcal)")).toBeInTheDocument();
    expect(screen.getByLabelText("Glucides (g)")).toBeInTheDocument();
    expect(screen.getByLabelText("Sel (g)")).toBeInTheDocument();
    expect(screen.getByLabelText("Poids (g)")).toBeInTheDocument();
    expect(screen.getByLabelText("Ajouter une boisson énergétique")).not.toBeChecked();

    expect(screen.getByRole("button", { name: "Calculer ma nutrition" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Réinitialiser la nutrition" }),
    ).toBeInTheDocument();

    // Plus aucune durée dans la nutrition ni aucun résultat calculé sur cette page.
    expect(screen.queryByLabelText("Durée de l'effort (min)")).not.toBeInTheDocument();
    expect(screen.queryByTestId("nutrition-units")).not.toBeInTheDocument();
    expect(screen.queryByTestId("nutrition-results")).not.toBeInTheDocument();
  });

  it("ne montre que la case quand la boisson est décochée", async () => {
    render(<NutritionPlanner minutes="120" />);
    const u = user();

    expect(screen.queryByLabelText("Concentration (g/L)")).not.toBeInTheDocument();

    await u.click(screen.getByLabelText("Ajouter une boisson énergétique"));

    expect(screen.getByLabelText("Marque de la boisson")).toBeInTheDocument();
    expect(screen.getByLabelText("Nom de la boisson")).toBeInTheDocument();
    expect(screen.getByLabelText("Concentration (g/L)")).toBeInTheDocument();
    expect(screen.getByLabelText("Énergie pour 100 g (kcal)")).toBeInTheDocument();
    expect(screen.getByLabelText("Glucides pour 100 g (g)")).toBeInTheDocument();
    expect(screen.getByLabelText("Sel pour 100 g (g)")).toBeInTheDocument();

    await u.click(screen.getByLabelText("Ajouter une boisson énergétique"));

    expect(screen.queryByLabelText("Concentration (g/L)")).not.toBeInTheDocument();
    expect(screen.queryByTestId("drink-summary-name")).not.toBeInTheDocument();
  });

  it("replie le produit après validation et le rouvre avec « Modifier le produit »", async () => {
    render(<NutritionPlanner minutes="120" />);
    const u = await fillProduct();

    await u.click(screen.getByRole("button", { name: "Valider le produit" }));

    expect(screen.queryByLabelText("Marque")).not.toBeInTheDocument();
    expect(screen.getByTestId("product-summary-name")).toHaveTextContent("Barre endurance");
    expect(screen.getByTestId("product-summary-type")).toHaveTextContent("Barre");
    expect(screen.getByTestId("product-summary-details")).toHaveTextContent(
      "Glucides 25 g · Sel 0,25 g",
    );

    await u.click(screen.getByRole("button", { name: "Modifier le produit" }));

    expect(screen.getByLabelText("Marque")).toHaveValue("Overstims");
    expect(screen.queryByTestId("product-summary-name")).not.toBeInTheDocument();
  });

  it("garde le produit ouvert et affiche ses erreurs s'il est incomplet", async () => {
    render(<NutritionPlanner minutes="120" />);

    await user().click(screen.getByRole("button", { name: "Valider le produit" }));

    expect(screen.getByText("La marque est obligatoire.")).toBeInTheDocument();
    expect(screen.getByText("Choisis un type de produit.")).toBeInTheDocument();
    expect(screen.getByLabelText("Marque")).toBeInTheDocument();
    expect(screen.queryByTestId("product-summary-name")).not.toBeInTheDocument();
  });

  it("replie la boisson après validation et la rouvre avec « Modifier la boisson »", async () => {
    render(<NutritionPlanner minutes="120" />);
    const u = user();
    await fillDrink(u);

    await u.click(screen.getByRole("button", { name: "Valider la boisson" }));

    expect(screen.queryByLabelText("Concentration (g/L)")).not.toBeInTheDocument();
    expect(screen.getByTestId("drink-summary-name")).toHaveTextContent("Boisson énergétique");
    expect(screen.getByTestId("drink-summary-details")).toHaveTextContent(
      "Glucides 75 g/100 g · Sel 3 g/100 g · 40 g/L",
    );

    await u.click(screen.getByRole("button", { name: "Modifier la boisson" }));

    expect(screen.getByLabelText("Concentration (g/L)")).toHaveValue(40);
    expect(screen.queryByTestId("drink-summary-name")).not.toBeInTheDocument();
  });

  it("garde la boisson ouverte et affiche ses erreurs si elle est incomplète", async () => {
    render(<NutritionPlanner minutes="120" />);
    const u = user();

    await u.click(screen.getByLabelText("Ajouter une boisson énergétique"));
    await u.click(screen.getByRole("button", { name: "Valider la boisson" }));

    expect(screen.getByText("La concentration est obligatoire.")).toBeInTheDocument();
    expect(screen.getByLabelText("Concentration (g/L)")).toBeInTheDocument();
  });

  it("navigue vers le plan quand tout est valide", async () => {
    render(<NutritionPlanner minutes="120" />);
    const u = await fillProduct();

    expect(push).not.toHaveBeenCalled();

    await u.click(screen.getByRole("button", { name: "Calculer ma nutrition" }));

    expect(push).toHaveBeenCalledWith("/nutrition?min=120");
  });

  it("demande la durée du bloc Activité quand elle manque", async () => {
    render(<NutritionPlanner minutes="" />);
    const u = await fillProduct();

    await u.click(screen.getByRole("button", { name: "Calculer ma nutrition" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Renseigne la durée dans le bloc Activité.");
    expect(push).not.toHaveBeenCalled();
  });

  it("refuse une durée hors bornes sans naviguer", async () => {
    render(<NutritionPlanner minutes="0" />);
    const u = await fillProduct();

    await u.click(screen.getByRole("button", { name: "Calculer ma nutrition" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Renseigne la durée dans le bloc Activité.");
    expect(push).not.toHaveBeenCalled();
  });

  it("rouvre le produit en erreur et ne navigue pas", async () => {
    render(<NutritionPlanner minutes="120" />);

    await user().click(screen.getByRole("button", { name: "Calculer ma nutrition" }));

    expect(screen.getByText("La marque est obligatoire.")).toBeInTheDocument();
    expect(screen.getByText("Le poids de l'unité est obligatoire.")).toBeInTheDocument();
    expect(screen.getByLabelText("Marque")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("rouvre la boisson en erreur et ne navigue pas", async () => {
    render(<NutritionPlanner minutes="120" />);
    const u = await fillProduct();

    await u.click(screen.getByLabelText("Ajouter une boisson énergétique"));
    await u.click(screen.getByRole("button", { name: "Calculer ma nutrition" }));

    expect(screen.getByText("La concentration est obligatoire.")).toBeInTheDocument();
    expect(screen.getByLabelText("Concentration (g/L)")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("démarre replié quand le stockage contient un produit valide", () => {
    window.localStorage.setItem(NUTRITION_STORAGE_KEY, JSON.stringify(STORED_PRODUCT));

    render(<NutritionPlanner minutes="120" />);

    expect(screen.queryByLabelText("Marque")).not.toBeInTheDocument();
    expect(screen.getByTestId("product-summary-name")).toHaveTextContent("Barre endurance");
  });

  it("démarre ouvert quand le stockage est corrompu", () => {
    window.localStorage.setItem(NUTRITION_STORAGE_KEY, "{pas du json");

    render(<NutritionPlanner minutes="120" />);

    expect(screen.getByLabelText("Marque")).toHaveValue("");
    expect(screen.getByLabelText("Glucides max (g/h)")).toHaveValue(60);
    expect(screen.queryByTestId("product-summary-name")).not.toBeInTheDocument();
  });

  it("réinitialise les valeurs, rouvre les blocs et vide le stockage", async () => {
    render(<NutritionPlanner minutes="120" />);
    const u = await fillProduct();

    await u.click(screen.getByRole("button", { name: "Valider le produit" }));
    expect(window.localStorage.getItem(NUTRITION_STORAGE_KEY)).not.toBeNull();

    await u.click(screen.getByRole("button", { name: "Réinitialiser la nutrition" }));

    expect(window.localStorage.getItem(NUTRITION_STORAGE_KEY)).toBeNull();
    expect(screen.getByLabelText("Marque")).toHaveValue("");
    expect(screen.getByLabelText("Glucides max (g/h)")).toHaveValue(60);
    expect(screen.getByLabelText("Sodium max (mg/h)")).toHaveValue(600);
    expect(push).not.toHaveBeenCalled();
  });

  it("fonctionne quand localStorage lève", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("stockage indisponible");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("stockage indisponible");
    });

    render(<NutritionPlanner minutes="120" />);

    expect(screen.getByLabelText("Marque")).toHaveValue("");

    const u = await fillProduct();
    await u.click(screen.getByRole("button", { name: "Calculer ma nutrition" }));

    expect(push).toHaveBeenCalledWith("/nutrition?min=120");
  });
});
