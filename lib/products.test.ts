import { describe, expect, it } from "vitest";

import {
  addProduct,
  createProductId,
  draftToProduct,
  EMPTY_PRODUCT_DRAFT,
  MAX_SELECTED_MESSAGE,
  MAX_SELECTED_PRODUCTS,
  moveSelected,
  productLabel,
  productToDraft,
  PRODUCT_TYPES,
  removeProduct,
  toggleSelected,
  updateProduct,
  validateProduct,
  type Product,
  type ProductDraft,
} from "@/lib/products";

/** Barre de référence : 25 g de glucides, 0,25 g de sel, 200 kcal, 60 g. */
function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "a",
    brand: "Overstims",
    name: "Barre endurance",
    type: "Barre",
    kcal: 200,
    carbs: 25,
    salt: 0.25,
    weight: 60,
    ...overrides,
  };
}

function draft(overrides: Partial<ProductDraft> = {}): ProductDraft {
  return {
    brand: "Overstims",
    name: "Barre endurance",
    type: "Barre",
    kcal: "200",
    carbs: "25",
    salt: "0.25",
    weight: "60",
    ...overrides,
  };
}

describe("constantes de produits", () => {
  it("expose les trois types de la SPEC", () => {
    expect(PRODUCT_TYPES).toEqual(["Gel", "Barre", "Pâte de fruit"]);
  });

  it("limite la sélection à trois produits", () => {
    expect(MAX_SELECTED_PRODUCTS).toBe(3);
    expect(MAX_SELECTED_MESSAGE).toContain("3");
  });

  it("démarre avec un brouillon vide", () => {
    expect(EMPTY_PRODUCT_DRAFT).toEqual({
      brand: "",
      name: "",
      type: "",
      kcal: "",
      carbs: "",
      salt: "",
      weight: "",
    });
  });
});

describe("validateProduct", () => {
  it("accepte un produit complet", () => {
    expect(validateProduct(draft())).toEqual({});
  });

  it("exige chaque champ", () => {
    const errors = validateProduct(EMPTY_PRODUCT_DRAFT);
    expect(Object.keys(errors).sort()).toEqual(
      ["brand", "carbs", "kcal", "name", "salt", "type", "weight"].sort(),
    );
  });

  it("borne les valeurs numériques", () => {
    expect(validateProduct(draft({ kcal: "1001" })).kcal).toMatch(/entre 0 et 1000/);
    expect(validateProduct(draft({ salt: "6" })).salt).toMatch(/entre 0 et 5/);
    expect(validateProduct(draft({ weight: "0" })).weight).toMatch(/entre 1 et 500/);
  });

  it("exige des glucides > 0 et au plus égaux au poids", () => {
    expect(validateProduct(draft({ carbs: "0" }))).toHaveProperty("carbs");
    expect(validateProduct(draft({ carbs: "61" })).carbs).toMatch(/poids/);
  });

  it("exige un type de la liste", () => {
    expect(validateProduct(draft({ type: "Compote" as ProductDraft["type"] }))).toHaveProperty(
      "type",
    );
  });

  it("limite les textes à 50 caractères", () => {
    const tropLong = "x".repeat(51);
    expect(validateProduct(draft({ brand: tropLong })).brand).toMatch(/50/);
    expect(validateProduct(draft({ name: tropLong })).name).toMatch(/50/);
  });
});

describe("conversion brouillon / produit", () => {
  it("convertit un brouillon valide en produit", () => {
    expect(draftToProduct(draft(), "a")).toEqual(product());
  });

  it("refuse un brouillon invalide", () => {
    expect(draftToProduct(draft({ kcal: "" }), "a")).toBeNull();
  });

  it("fait l'aller-retour produit → brouillon → produit", () => {
    expect(draftToProduct(productToDraft(product()), "a")).toEqual(product());
  });

  it("génère un identifiant non vide et différent à chaque appel", () => {
    const first = createProductId();
    const second = createProductId();
    expect(first.length).toBeGreaterThan(0);
    expect(first).not.toBe(second);
  });
});

describe("gestion de la liste", () => {
  it("ajoute un produit en fin de liste", () => {
    const list = addProduct([product()], product({ id: "b", name: "Gel" }));
    expect(list.map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("modifie un produit par son identifiant", () => {
    const list = updateProduct([product(), product({ id: "b" })], product({ name: "Barre salée" }));
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe("Barre salée");
    expect(list[1].id).toBe("b");
  });

  it("supprime un produit par son identifiant", () => {
    const list = removeProduct([product(), product({ id: "b" })], "a");
    expect(list.map((item) => item.id)).toEqual(["b"]);
  });
});

describe("sélection ordonnée", () => {
  it("donne les labels A, B, C dans l'ordre de sélection", () => {
    expect(productLabel(0)).toBe("Produit A");
    expect(productLabel(1)).toBe("Produit B");
    expect(productLabel(2)).toBe("Produit C");
  });

  it("ajoute puis retire un produit de la sélection", () => {
    const selected = toggleSelected([], "a");
    expect(selected).toEqual(["a"]);
    expect(toggleSelected(selected, "a")).toEqual([]);
  });

  it("refuse un quatrième produit (exemple 12)", () => {
    const three = ["a", "b", "c"];
    expect(toggleSelected(three, "d")).toEqual(three);
    expect(toggleSelected(three, "d")).toHaveLength(MAX_SELECTED_PRODUCTS);
  });

  it("déplace un produit vers le haut et vers le bas (exemple 9)", () => {
    const ids = ["a", "b", "c"];
    expect(moveSelected(ids, "b", "up")).toEqual(["b", "a", "c"]);
    expect(moveSelected(ids, "b", "down")).toEqual(["a", "c", "b"]);
  });

  it("ne fait rien aux extrémités (exemple 9)", () => {
    const ids = ["a", "b"];
    expect(moveSelected(ids, "a", "up")).toEqual(["a", "b"]);
    expect(moveSelected(ids, "b", "down")).toEqual(["a", "b"]);
    expect(moveSelected(ids, "inconnu", "up")).toEqual(["a", "b"]);
  });

  it("retire le produit sélectionné quand il est supprimé (exemple 10)", () => {
    const products = [product(), product({ id: "b" })];
    const remaining = removeProduct(products, "a");
    const selected = toggleSelected(["a", "b"], "a");
    expect(remaining.map((item) => item.id)).toEqual(["b"]);
    expect(selected).toEqual(["b"]);
  });
});
