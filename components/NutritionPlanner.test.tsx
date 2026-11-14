import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import NutritionPlanner from "@/components/NutritionPlanner";
import { NUTRITION_STORAGE_KEY } from "@/lib/nutritionStorage";

const user = () => userEvent.setup();

async function fillProductForm() {
  const u = user();
  await u.type(screen.getByLabelText("Marque"), "Overstims");
  await u.type(screen.getByLabelText("Nom du produit"), "Barre endurance");
  await u.selectOptions(screen.getByLabelText("Type"), "Barre");
  await u.type(screen.getByLabelText("Énergie (kcal)"), "200");
  await u.type(screen.getByLabelText("Glucides (g)"), "25");
  await u.type(screen.getByLabelText("Sel (g)"), "0.25");
  await u.type(screen.getByLabelText("Poids (g)"), "60");
  await u.type(screen.getByLabelText("Durée de l'effort (min)"), "120");
  return u;
}

describe("NutritionPlanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("affiche ses trois cartes et les champs attendus", () => {
    render(<NutritionPlanner />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Produit" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Boisson" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Plan de nutrition" }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText("Glucides max (g/h)")).toHaveValue(60);
    expect(screen.getByLabelText("Sodium max (mg/h)")).toHaveValue(600);
    expect(screen.getByLabelText("Durée de l'effort (min)")).toBeInTheDocument();
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
    expect(
      screen.getByText(/Repères généraux, à adapter avec un professionnel de santé/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Enregistré dans ce navigateur/i)).toBeInTheDocument();
  });

  it("affiche et masque les champs de la boisson avec la case à cocher", async () => {
    render(<NutritionPlanner />);
    const u = user();

    expect(screen.queryByLabelText("Concentration (g/L)")).not.toBeInTheDocument();

    await u.click(screen.getByLabelText("Ajouter une boisson énergétique"));

    expect(screen.getByLabelText("Concentration (g/L)")).toBeInTheDocument();
    expect(screen.getByLabelText("Marque de la boisson")).toBeInTheDocument();
    expect(screen.getByLabelText("Nom de la boisson")).toBeInTheDocument();
    expect(screen.getByLabelText("Énergie pour 100 g (kcal)")).toBeInTheDocument();
    expect(screen.getByLabelText("Glucides pour 100 g (g)")).toBeInTheDocument();
    expect(screen.getByLabelText("Sel pour 100 g (g)")).toBeInTheDocument();

    await u.click(screen.getByLabelText("Ajouter une boisson énergétique"));

    expect(screen.queryByLabelText("Concentration (g/L)")).not.toBeInTheDocument();
  });

  it("affiche le plan de l'exemple 1 dès que le formulaire est valide", async () => {
    render(<NutritionPlanner />);
    await fillProductForm();

    expect(screen.getByTestId("nutrition-units")).toHaveTextContent("4");
    expect(screen.getByTestId("nutrition-interval")).toHaveTextContent("30");
    expect(screen.getByTestId("nutrition-total-carbs")).toHaveTextContent("100,0");
    expect(screen.getByTestId("nutrition-total-sodium")).toHaveTextContent("400");
    expect(screen.getByTestId("nutrition-rate-carbs")).toHaveTextContent("50,0");
    expect(screen.getByTestId("nutrition-rate-sodium")).toHaveTextContent("200");
    expect(screen.queryByTestId("nutrition-drink-volume")).not.toBeInTheDocument();
    expect(screen.queryByTestId("nutrition-warning")).not.toBeInTheDocument();
  });

  it("affiche la boisson et l'alerte de concentration de l'exemple 4", async () => {
    render(<NutritionPlanner />);
    const u = await fillProductForm();

    const duration = screen.getByLabelText("Durée de l'effort (min)");
    await u.clear(duration);
    await u.type(duration, "60");

    await u.click(screen.getByLabelText("Ajouter une boisson énergétique"));
    await u.type(screen.getByLabelText("Marque de la boisson"), "Overstims");
    await u.type(screen.getByLabelText("Nom de la boisson"), "Boisson énergétique");
    await u.type(screen.getByLabelText("Concentration (g/L)"), "150");
    await u.type(screen.getByLabelText("Énergie pour 100 g (kcal)"), "380");
    await u.type(screen.getByLabelText("Glucides pour 100 g (g)"), "90");
    await u.type(screen.getByLabelText("Sel pour 100 g (g)"), "0");

    expect(screen.getByTestId("nutrition-drink-volume")).toHaveTextContent("600");
    expect(screen.getByTestId("nutrition-units")).toHaveTextContent("0");
    expect(screen.getByTestId("nutrition-warning")).toHaveTextContent(
      "Réduis la concentration de la boisson.",
    );
  });

  it("affiche une erreur par champ vide et aucun résultat", async () => {
    render(<NutritionPlanner />);

    await user().click(screen.getByRole("button", { name: "Calculer ma nutrition" }));

    expect(screen.getByText("La durée de l'effort est obligatoire.")).toBeInTheDocument();
    expect(screen.getByText("La marque est obligatoire.")).toBeInTheDocument();
    expect(screen.getByText("Le nom du produit est obligatoire.")).toBeInTheDocument();
    expect(screen.getByText("Choisis un type de produit.")).toBeInTheDocument();
    expect(screen.getByText("Le poids de l'unité est obligatoire.")).toBeInTheDocument();
    expect(screen.queryByTestId("nutrition-results")).not.toBeInTheDocument();
  });

  it("signale les champs de la boisson quand la case est cochée", async () => {
    render(<NutritionPlanner />);
    const u = user();

    await u.click(screen.getByLabelText("Ajouter une boisson énergétique"));
    await u.click(screen.getByRole("button", { name: "Calculer ma nutrition" }));

    expect(screen.getByText("La concentration est obligatoire.")).toBeInTheDocument();
    expect(screen.getByText("Le nom de la boisson est obligatoire.")).toBeInTheDocument();
    expect(screen.queryByTestId("nutrition-results")).not.toBeInTheDocument();
  });

  it("signale une valeur hors bornes et n'affiche aucun résultat", async () => {
    render(<NutritionPlanner />);
    const u = await fillProductForm();
    expect(screen.getByTestId("nutrition-results")).toBeInTheDocument();

    const carbCap = screen.getByLabelText("Glucides max (g/h)");
    await u.clear(carbCap);
    await u.type(carbCap, "19");

    expect(screen.getByText(/entre 20 et 120/)).toBeInTheDocument();
    expect(screen.queryByTestId("nutrition-results")).not.toBeInTheDocument();
  });

  it("restaure le produit enregistré mais pas la durée", async () => {
    const { unmount } = render(<NutritionPlanner />);
    await fillProductForm();
    unmount();

    render(<NutritionPlanner />);

    expect(screen.getByLabelText("Marque")).toHaveValue("Overstims");
    expect(screen.getByLabelText("Nom du produit")).toHaveValue("Barre endurance");
    expect(screen.getByLabelText("Glucides (g)")).toHaveValue(25);
    expect(screen.getByLabelText("Durée de l'effort (min)")).toHaveValue(null);
  });

  it("repart des valeurs par défaut si le stockage est corrompu", () => {
    window.localStorage.setItem(NUTRITION_STORAGE_KEY, "{pas du json");

    render(<NutritionPlanner />);

    expect(screen.getByLabelText("Marque")).toHaveValue("");
    expect(screen.getByLabelText("Glucides max (g/h)")).toHaveValue(60);
    expect(screen.queryByTestId("nutrition-results")).not.toBeInTheDocument();
  });

  it("fonctionne quand localStorage lève", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("stockage indisponible");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("stockage indisponible");
    });

    render(<NutritionPlanner />);

    expect(screen.getByLabelText("Marque")).toHaveValue("");

    await fillProductForm();

    expect(screen.getByTestId("nutrition-units")).toHaveTextContent("4");
  });

  it("réinitialise les champs, les résultats et la clé de stockage", async () => {
    render(<NutritionPlanner />);
    const u = await fillProductForm();
    expect(window.localStorage.getItem(NUTRITION_STORAGE_KEY)).not.toBeNull();

    await u.click(screen.getByRole("button", { name: "Réinitialiser la nutrition" }));

    expect(screen.getByLabelText("Marque")).toHaveValue("");
    expect(screen.getByLabelText("Durée de l'effort (min)")).toHaveValue(null);
    expect(screen.getByLabelText("Glucides max (g/h)")).toHaveValue(60);
    expect(screen.getByLabelText("Sodium max (mg/h)")).toHaveValue(600);
    expect(screen.queryByTestId("nutrition-results")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(NUTRITION_STORAGE_KEY)).toBeNull();
  });
});
