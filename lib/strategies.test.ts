import { describe, expect, it } from "vitest";

import {
  defaultStrategy,
  getStrategies,
  resolveStrategy,
  SINGLE_STRATEGY,
  strategyText,
  type Strategy,
} from "@/lib/strategies";

const LABELS = ["A", "B", "C"];

describe("getStrategies — table à 2 solides", () => {
  const strategies = getStrategies(2);

  it("propose les trois stratégies de la SPEC", () => {
    expect(strategies.map((strategy) => strategy.key)).toEqual(["mixte50", "mixte75", "variable"]);
    expect(strategies.map((strategy) => strategy.label)).toEqual(["mixte50%", "mixte75%", "variable"]);
    expect(strategies.map((strategy) => strategy.shares)).toEqual([
      [50, 50],
      [75, 25],
      [50, 50],
    ]);
    expect(strategies.map((strategy) => strategy.order)).toEqual([
      "sequence",
      "sequence",
      "alternate",
    ]);
  });

  it("garde des clés uniques dans la table", () => {
    expect(new Set(strategies.map((strategy) => strategy.key)).size).toBe(strategies.length);
  });
});

describe("getStrategies — table à 3 solides", () => {
  const strategies = getStrategies(3);

  it("propose les trois stratégies de la SPEC", () => {
    expect(strategies.map((strategy) => strategy.key)).toEqual(["mixte33", "mixte50", "variable"]);
    expect(strategies.map((strategy) => strategy.label)).toEqual([
      "mixte33%",
      "mixte75%",
      "variable",
    ]);
    expect(strategies.map((strategy) => strategy.shares)).toEqual([
      [33, 33, 34],
      [50, 25, 25],
      [33, 33, 34],
    ]);
    expect(strategies.map((strategy) => strategy.order)).toEqual([
      "sequence",
      "sequence",
      "alternate",
    ]);
  });

  it("garde des clés uniques dans la table", () => {
    expect(new Set(strategies.map((strategy) => strategy.key)).size).toBe(strategies.length);
  });
});

describe("getStrategies — un seul solide", () => {
  it("ne propose aucune stratégie (pas de dropdown)", () => {
    expect(getStrategies(1)).toEqual([]);
  });

  it("répartit 100 % sur l'unique produit", () => {
    expect(SINGLE_STRATEGY.shares).toEqual([100]);
    expect(SINGLE_STRATEGY.order).toBe("sequence");
  });
});

describe("strategyText", () => {
  it("décrit la répartition à deux produits (exemples 2 à 4)", () => {
    const [mixte50, mixte75, variable] = getStrategies(2);
    expect(strategyText(mixte50, LABELS)).toBe("Répartition équitable, A puis B");
    expect(strategyText(mixte75, LABELS)).toBe("75 % de A et 25 % de B");
    expect(strategyText(variable, LABELS)).toBe("Un produit différent une fois sur deux");
  });

  it("décrit la répartition à trois produits (exemple 5)", () => {
    const [mixte33, mixte50, variable] = getStrategies(3);
    expect(strategyText(mixte33, LABELS)).toBe("Répartition équitable, A, puis B, puis C");
    expect(strategyText(mixte50, LABELS)).toBe("50 % de A, 25 % de B et 25 % de C");
    expect(strategyText(variable, LABELS)).toBe("Un produit différent une fois sur trois");
  });

  it("génère le texte à partir des labels fournis", () => {
    const mixte75 = getStrategies(2)[1];
    expect(strategyText(mixte75, ["X", "Y"])).toBe("75 % de X et 25 % de Y");
  });
});

describe("strategy par défaut", () => {
  it("prend la première de la table", () => {
    expect(defaultStrategy(2).key).toBe("mixte50");
    expect(defaultStrategy(3).key).toBe("mixte33");
    expect(defaultStrategy(1)).toEqual(SINGLE_STRATEGY);
  });

  it("retombe sur la première de la table si la clé est absente ou inconnue", () => {
    expect(resolveStrategy(2, null).key).toBe("mixte50");
    expect(resolveStrategy(2, "inconnue").key).toBe("mixte50");
    expect(resolveStrategy(3, "mixte75").key).toBe("mixte33");
  });

  it("retrouve la stratégie enregistrée quand elle existe", () => {
    const mixte75: Strategy = getStrategies(2)[1];
    expect(resolveStrategy(2, "mixte75")).toEqual(mixte75);
    expect(resolveStrategy(3, "variable").order).toBe("alternate");
  });

  it("revient à la première stratégie à 3 solides (exemple 11)", () => {
    expect(resolveStrategy(3, defaultStrategy(3).key).shares).toEqual([33, 33, 34]);
    expect(resolveStrategy(3, null).shares).toEqual([33, 33, 34]);
  });
});
