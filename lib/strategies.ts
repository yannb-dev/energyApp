/** Stratégies de répartition des solides entre les produits sélectionnés. */

export type StrategyOrder = "sequence" | "alternate";

export type Strategy = {
  key: string;
  label: string;
  /** Part de chaque produit, dans l'ordre A, B, C ; la somme vaut 100. */
  shares: number[];
  /** `sequence` : A puis B… ; `alternate` : un produit différent à chaque prise. */
  order: StrategyOrder;
};

/** Un seul solide : aucune stratégie proposée, tout part sur ce produit. */
export const SINGLE_STRATEGY: Strategy = {
  key: "unique",
  label: "100 %",
  shares: [100],
  order: "sequence",
};

const TWO_PRODUCTS: Strategy[] = [
  {
    key: "mixte50",
    label: "50% A - 50% B",
    shares: [50, 50],
    order: "sequence",
  },
  {
    key: "mixte75",
    label: "75% A - 25% B",
    shares: [75, 25],
    order: "sequence",
  },
  {
    key: "variable",
    label: "Alternance A - B",
    shares: [50, 50],
    order: "alternate",
  },
];

const THREE_PRODUCTS: Strategy[] = [
  {
    key: "mixte33",
    label: "Répartition équitable A - B- C",
    shares: [33, 33, 34],
    order: "sequence",
  },
  {
    key: "mixte50",
    label: "50% A - 25% B - 25% C",
    shares: [50, 25, 25],
    order: "sequence",
  },
  {
    key: "variable",
    label: "Alternance A - B - C",
    shares: [33, 33, 34],
    order: "alternate",
  },
];

/** Stratégies disponibles pour un nombre de solides sélectionnés. */
export function getStrategies(count: 1 | 2 | 3): Strategy[] {
  if (count === 1) {
    return [];
  }
  return count === 2 ? TWO_PRODUCTS : THREE_PRODUCTS;
}

/** Stratégie par défaut : la première de la table. */
export function defaultStrategy(count: 1 | 2 | 3): Strategy {
  if (count === 1) {
    return SINGLE_STRATEGY;
  }
  return getStrategies(count)[0];
}

/** Stratégie enregistrée si elle existe encore pour ce nombre de solides, sinon défaut. */
export function resolveStrategy(
  count: 1 | 2 | 3,
  key: string | null,
): Strategy {
  if (count === 1) {
    return SINGLE_STRATEGY;
  }
  const found = getStrategies(count).find((strategy) => strategy.key === key);
  return found ?? defaultStrategy(count);
}

/** Texte affiché sous le dropdown, généré à partir des labels « A », « B », « C ». */
export function strategyText(strategy: Strategy, labels: string[]): string {
  const shareTexts = strategy.shares.map(
    (share, index) => `${share} % de ${labels[index] ?? String(index + 1)}`,
  );

  if (strategy.order === "alternate") {
    const count = strategy.shares.length === 2 ? "deux" : "trois";
    return `Un produit différent une fois sur ${count}`;
  }

  const spread = Math.max(...strategy.shares) - Math.min(...strategy.shares);
  if (spread <= 1) {
    if (strategy.shares.length === 2) {
      return `Répartition équitable, ${labels[0]} puis ${labels[1]}`;
    }
    if (strategy.shares.length === 3) {
      return `Répartition équitable, ${labels[0]}, puis ${labels[1]}, puis ${labels[2]}`;
    }
  }

  if (shareTexts.length <= 1) {
    return shareTexts[0] ?? "";
  }
  return `${shareTexts.slice(0, -1).join(", ")} et ${shareTexts[shareTexts.length - 1]}`;
}
