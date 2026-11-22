import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import NutritionPlanner from "@/components/NutritionPlanner";
import type { EffortFormValues } from "@/lib/effort";
import type { Product } from "@/lib/products";
import {
  NUTRITION_STORAGE_KEY,
  NUTRITION_STORAGE_KEY_V1,
  type NutritionSettings,
} from "@/lib/nutritionStorage";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

type User = ReturnType<typeof userEvent.setup>;

/** Effort transmis par le bloc Activité : 10 km à 12 km/h, soit 50 min. */
const EFFORT: EffortFormValues = {
  distanceKm: "10",
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

const PATE: Product = {
  id: "pate",
  brand: "Baovola",
  name: "Pâte pomme",
  type: "Pate",
  kcal: 90,
  carbs: 18,
  salt: 0,
  weight: 25,
};

const COMPOTE: Product = {
  id: "compote",
  brand: "Materne",
  name: "Compote poire",
  type: "Pate",
  kcal: 80,
  carbs: 16,
  salt: 0,
  weight: 90,
};

const SETTINGS: NutritionSettings = {
  carbCap: "60",
  sodiumCap: "600",
  products: [BARRE, GEL, PATE],
  selectedIds: ["barre", "gel"],
  strategyKey: "mixte50",
  drinkEnabled: false,
  drinkBrand: "",
  drinkName: "",
  drinkConcentration: "",
  drinkKcalPer100: "",
  drinkCarbsPer100: "",
  drinkSaltPer100: "",
};

type Draft = {
  name: string;
  type: string;
  brand?: string;
  kcal?: string;
  carbs?: string;
  salt?: string;
  weight?: string;
};

/** Remplit le formulaire produit ouvert. */
async function fillProduct(u: User, draft: Draft) {
  await u.type(screen.getByLabelText("Marque"), draft.brand ?? "Overstims");
  await u.type(screen.getByLabelText("Nom du produit"), draft.name);
  await u.selectOptions(screen.getByLabelText("Type"), draft.type);
  await u.type(screen.getByLabelText("Énergie (kcal)"), draft.kcal ?? "200");
  await u.type(screen.getByLabelText("Glucides (g)"), draft.carbs ?? "25");
  await u.type(screen.getByLabelText("Sel (g)"), draft.salt ?? "0.25");
  await u.type(screen.getByLabelText("Poids (g)"), draft.weight ?? "60");
}

/** Ouvre le formulaire si besoin, le remplit et valide. */
async function addProduct(u: User, draft: Draft) {
  if (!screen.queryByLabelText("Nom du produit")) {
    await u.click(screen.getByRole("button", { name: "Ajouter un produit" }));
  }
  await fillProduct(u, draft);
  await u.click(screen.getByRole("button", { name: "Valider le produit" }));
}

/** Ligne de liste d'un produit. */
function row(name: string): HTMLElement {
  const node = screen.getByText(name).closest("li");
  if (!node) {
    throw new Error(`ligne introuvable pour ${name}`);
  }
  return node as HTMLElement;
}

async function fillDrink(u: User) {
  await u.click(screen.getByLabelText("Ajouter une boisson énergétique"));
  await u.type(screen.getByLabelText("Marque de la boisson"), "Overstims");
  await u.type(
    screen.getByLabelText("Nom de la boisson"),
    "Boisson énergétique",
  );
  await u.type(screen.getByLabelText("Concentration (g/L)"), "40");
  await u.type(screen.getByLabelText("Énergie pour 100 g (kcal)"), "380");
  await u.type(screen.getByLabelText("Glucides pour 100 g (g)"), "75");
  await u.type(screen.getByLabelText("Sel pour 100 g (g)"), "3");
}

describe("NutritionPlanner", () => {
  beforeEach(() => {
    push.mockClear();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("affiche les plafonds, la liste de produits, la boisson et les actions", () => {
    render(<NutritionPlanner minutes="" effort={EFFORT} />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Plafond à respecter" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Produits" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Boisson" }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText("Glucides max (g/h)")).toHaveValue(60);
    expect(screen.getByLabelText("Sodium max (mg/h)")).toHaveValue(600);
    expect(screen.getByText("Repère usuel : 30 à 90 g/h")).toBeInTheDocument();

    expect(screen.getByLabelText("Marque")).toBeInTheDocument();
    expect(screen.getByLabelText("Nom du produit")).toBeInTheDocument();
    expect(screen.getByLabelText("Type")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Ajouter une boisson énergétique"),
    ).not.toBeChecked();

    expect(
      screen.getByRole("button", { name: "Calculer ma nutrition" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Réinitialiser la nutrition" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Stratégie d'alimentation"),
    ).not.toBeInTheDocument();
  });

  it("ajoute un produit, le sélectionne et replie le formulaire", async () => {
    render(<NutritionPlanner minutes="120" effort={EFFORT} />);
    const u = userEvent.setup();

    await addProduct(u, { name: "Barre endurance", type: "Barre" });

    expect(screen.queryByLabelText("Marque")).not.toBeInTheDocument();
    expect(screen.getByText("Barre endurance")).toBeInTheDocument();
    expect(screen.getByText("Barre", { selector: "span" })).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Sélectionner Barre endurance" }),
    ).toBeChecked();
    expect(
      within(row("Barre endurance")).getByText("Produit A"),
    ).toBeInTheDocument();
  });

  it("garde le formulaire ouvert et affiche les erreurs s'il est incomplet", async () => {
    render(<NutritionPlanner minutes="120" effort={EFFORT} />);

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Valider le produit" }));

    expect(screen.getByText("La marque est obligatoire.")).toBeInTheDocument();
    expect(screen.getByText("Choisis un type de produit.")).toBeInTheDocument();
    expect(screen.getByLabelText("Marque")).toBeInTheDocument();
  });

  it("rouvre un produit avec « Modifier » et enregistre la modification", async () => {
    window.localStorage.setItem(
      NUTRITION_STORAGE_KEY,
      JSON.stringify(SETTINGS),
    );

    render(<NutritionPlanner minutes="120" effort={EFFORT} />);
    const u = userEvent.setup();

    await u.click(
      screen.getByRole("button", { name: "Modifier Barre endurance" }),
    );

    expect(screen.getByLabelText("Marque")).toHaveValue("Overstims");
    await u.clear(screen.getByLabelText("Nom du produit"));
    await u.type(screen.getByLabelText("Nom du produit"), "Barre salée");
    await u.click(screen.getByRole("button", { name: "Valider le produit" }));

    expect(screen.getByText("Barre salée")).toBeInTheDocument();
    expect(screen.queryByText("Barre endurance")).not.toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Sélectionner Barre salée" }),
    ).toBeChecked();
  });

  it("sélectionne et désélectionne un produit", async () => {
    window.localStorage.setItem(
      NUTRITION_STORAGE_KEY,
      JSON.stringify(SETTINGS),
    );

    render(<NutritionPlanner minutes="120" effort={EFFORT} />);
    const u = userEvent.setup();

    const barre = screen.getByRole("checkbox", {
      name: "Sélectionner Barre endurance",
    });
    expect(barre).toBeChecked();
    expect(
      within(row("Barre endurance")).getByText("Produit A"),
    ).toBeInTheDocument();

    await u.click(barre);

    expect(barre).not.toBeChecked();
    expect(
      within(row("Barre endurance")).queryByText("Produit A"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Stratégie d'alimentation"),
    ).not.toBeInTheDocument();
  });

  it("refuse un quatrième produit sélectionné (exemple 12)", async () => {
    window.localStorage.setItem(
      NUTRITION_STORAGE_KEY,
      JSON.stringify({
        ...SETTINGS,
        products: [BARRE, GEL, PATE, COMPOTE],
        selectedIds: ["barre", "gel", "pate"],
        strategyKey: "mixte33",
      }),
    );

    render(<NutritionPlanner minutes="120" effort={EFFORT} />);

    const compote = screen.getByRole("checkbox", {
      name: "Sélectionner Compote poire",
    });
    expect(compote).toBeDisabled();
    expect(
      screen.getByText("Tu peux sélectionner 3 produits au maximum."),
    ).toBeInTheDocument();
  });

  it("déplace un produit avec les chevrons (exemple 9)", async () => {
    window.localStorage.setItem(
      NUTRITION_STORAGE_KEY,
      JSON.stringify(SETTINGS),
    );

    render(<NutritionPlanner minutes="120" effort={EFFORT} />);
    const u = userEvent.setup();

    expect(
      within(row("Barre endurance")).getByText("Produit A"),
    ).toBeInTheDocument();
    expect(within(row("Gel café")).getByText("Produit B")).toBeInTheDocument();

    await u.click(screen.getByRole("button", { name: "Monter Produit B" }));

    expect(within(row("Gel café")).getByText("Produit A")).toBeInTheDocument();
    expect(
      within(row("Barre endurance")).getByText("Produit B"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Monter Produit A" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Descendre Produit B" }),
    ).toBeDisabled();

    await u.click(screen.getByRole("button", { name: "Descendre Produit A" }));

    expect(
      within(row("Barre endurance")).getByText("Produit A"),
    ).toBeInTheDocument();
  });

  it("supprime un produit sélectionné et recalcule la stratégie (exemple 10)", async () => {
    window.localStorage.setItem(
      NUTRITION_STORAGE_KEY,
      JSON.stringify(SETTINGS),
    );

    render(<NutritionPlanner minutes="120" effort={EFFORT} />);
    const u = userEvent.setup();

    expect(screen.getByLabelText("Stratégie d'alimentation")).toHaveValue(
      "mixte50",
    );

    await u.click(screen.getByRole("button", { name: "Supprimer Gel café" }));

    expect(screen.queryByText("Gel café")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Stratégie d'alimentation"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Barre endurance")).toBeInTheDocument();
  });

  it("affiche le dropdown de stratégie dès deux solides (exemples 2 à 5)", async () => {
    window.localStorage.setItem(
      NUTRITION_STORAGE_KEY,
      JSON.stringify(SETTINGS),
    );

    render(<NutritionPlanner minutes="120" effort={EFFORT} />);
    const u = userEvent.setup();

    const strategy = screen.getByLabelText("Stratégie d'alimentation");
    expect(strategy).toHaveValue("mixte50");
    expect(
      screen.getByText("Répartition équitable, A puis B"),
    ).toBeInTheDocument();

    await u.selectOptions(strategy, "variable");
    expect(
      screen.getByText("Un produit différent une fois sur deux"),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Aide : stratégie d'alimentation" }),
    ).toBeInTheDocument();
  });

  it("revient à la première stratégie en passant de 2 à 3 solides (exemple 11)", async () => {
    window.localStorage.setItem(
      NUTRITION_STORAGE_KEY,
      JSON.stringify(SETTINGS),
    );

    render(<NutritionPlanner minutes="120" effort={EFFORT} />);
    const u = userEvent.setup();

    await u.selectOptions(
      screen.getByLabelText("Stratégie d'alimentation"),
      "variable",
    );

    await u.click(
      screen.getByRole("checkbox", { name: "Sélectionner Pâte pomme" }),
    );

    expect(screen.getByLabelText("Stratégie d'alimentation")).toHaveValue(
      "mixte33",
    );
    expect(
      screen.getByText("Répartition équitable, A, puis B, puis C"),
    ).toBeInTheDocument();
  });

  it("navigue vers le plan quand tout est valide", async () => {
    render(<NutritionPlanner minutes="120" effort={EFFORT} />);
    const u = userEvent.setup();

    await addProduct(u, { name: "Barre endurance", type: "Barre" });

    expect(push).not.toHaveBeenCalled();

    await u.click(
      screen.getByRole("button", { name: "Calculer ma nutrition" }),
    );

    expect(push).toHaveBeenCalledWith("/nutrition?min=120&km=10&v=12&u=kmh");
  });

  it("transmet aussi l'effort dans l'URL du plan (exemple 19)", async () => {
    render(
      <NutritionPlanner
        minutes="50"
        effort={{ distanceKm: "10", speed: "5:00", speedUnit: "minkm" }}
      />,
    );
    const u = userEvent.setup();

    await addProduct(u, { name: "Barre endurance", type: "Barre" });
    await u.click(
      screen.getByRole("button", { name: "Calculer ma nutrition" }),
    );

    expect(push).toHaveBeenCalledWith(
      "/nutrition?min=50&km=10&v=5%3A00&u=minkm",
    );
  });

  it("demande la durée du bloc Activité quand elle manque", async () => {
    render(<NutritionPlanner minutes="" effort={EFFORT} />);
    const u = userEvent.setup();

    await addProduct(u, { name: "Barre endurance", type: "Barre" });
    await u.click(
      screen.getByRole("button", { name: "Calculer ma nutrition" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Renseigne la durée dans le bloc Activité.",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("rouvre le formulaire produit en erreur et ne navigue pas", async () => {
    render(<NutritionPlanner minutes="120" effort={EFFORT} />);

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Calculer ma nutrition" }));

    expect(screen.getByText("La marque est obligatoire.")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("replie et rouvre la boisson", async () => {
    render(<NutritionPlanner minutes="120" effort={EFFORT} />);
    const u = userEvent.setup();

    expect(
      screen.queryByLabelText("Concentration (g/L)"),
    ).not.toBeInTheDocument();

    await fillDrink(u);
    await u.click(screen.getByRole("button", { name: "Valider la boisson" }));

    expect(
      screen.queryByLabelText("Concentration (g/L)"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("drink-summary-name")).toHaveTextContent(
      "Boisson énergétique",
    );

    await u.click(screen.getByRole("button", { name: "Modifier la boisson" }));

    expect(screen.getByLabelText("Concentration (g/L)")).toHaveValue(40);
  });

  it("hydrate la liste depuis le stockage v2", () => {
    window.localStorage.setItem(
      NUTRITION_STORAGE_KEY,
      JSON.stringify(SETTINGS),
    );

    render(<NutritionPlanner minutes="120" effort={EFFORT} />);

    expect(screen.queryByLabelText("Marque")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Stratégie d'alimentation")).toHaveValue(
      "mixte50",
    );
  });

  it("migre un ancien produit v1 en « Pâte de fruit » sélectionnée (exemple 13)", () => {
    window.localStorage.setItem(
      NUTRITION_STORAGE_KEY_V1,
      JSON.stringify({
        carbCap: "60",
        sodiumCap: "600",
        productBrand: "Materne",
        productName: "Compote pomme",
        productType: "Compote",
        productKcal: "90",
        productCarbs: "18",
        productSalt: "0",
        productWeight: "90",
        drinkEnabled: false,
        drinkBrand: "",
        drinkName: "",
        drinkConcentration: "",
        drinkKcalPer100: "",
        drinkCarbsPer100: "",
        drinkSaltPer100: "",
      }),
    );

    render(<NutritionPlanner minutes="120" effort={EFFORT} />);

    expect(screen.getByText("Compote pomme")).toBeInTheDocument();
    expect(within(row("Compote pomme")).getByText("Pate")).toBeInTheDocument();
    expect(
      within(row("Compote pomme")).getByText("Produit A"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Sélectionner Compote pomme" }),
    ).toBeChecked();
  });

  it("réinitialise les valeurs, la liste et le stockage", async () => {
    window.localStorage.setItem(
      NUTRITION_STORAGE_KEY,
      JSON.stringify(SETTINGS),
    );

    render(<NutritionPlanner minutes="120" effort={EFFORT} />);
    const u = userEvent.setup();

    await u.click(
      screen.getByRole("button", { name: "Réinitialiser la nutrition" }),
    );

    expect(window.localStorage.getItem(NUTRITION_STORAGE_KEY)).toBeNull();
    expect(screen.queryByText("Barre endurance")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Marque")).toHaveValue("");
    expect(screen.getByLabelText("Glucides max (g/h)")).toHaveValue(60);
    expect(push).not.toHaveBeenCalled();
  });

  it("fonctionne quand localStorage lève", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("stockage indisponible");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("stockage indisponible");
    });

    render(<NutritionPlanner minutes="120" effort={EFFORT} />);
    const u = userEvent.setup();

    expect(screen.getByLabelText("Marque")).toHaveValue("");

    await addProduct(u, { name: "Barre endurance", type: "Barre" });
    await u.click(
      screen.getByRole("button", { name: "Calculer ma nutrition" }),
    );

    expect(push).toHaveBeenCalledWith("/nutrition?min=120&km=10&v=12&u=kmh");
  });
});
