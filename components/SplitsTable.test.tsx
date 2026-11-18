import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SplitsTable from "@/components/SplitsTable";
import type { PacingResult, PacingSplit } from "@/lib/pacingRun";

/** Trois kilomètres dont le dernier partiel : 1 + 1 + 0,5 km. */
const SPLITS: PacingSplit[] = [
  {
    km: 1,
    distanceKm: 1,
    durationSec: 321.43,
    cumulativeSec: 321.43,
    paceSecPerKm: 321.43,
    speedKmh: 11.2,
    ascentM: 12,
    descentM: 0,
  },
  {
    km: 2,
    distanceKm: 1,
    durationSec: 321.43,
    cumulativeSec: 642.86,
    paceSecPerKm: 321.43,
    speedKmh: 11.2,
    ascentM: 0,
    descentM: 8.4,
  },
  {
    km: 3,
    distanceKm: 0.5,
    durationSec: 160.71,
    cumulativeSec: 803.57,
    paceSecPerKm: 321.42,
    speedKmh: 11.2,
    ascentM: 3,
    descentM: 0,
  },
];

const RESULT: PacingResult = {
  splits: SPLITS,
  totalSec: 803.57,
  minutes: 13,
  averageSpeedKmh: 11.2,
};

describe("SplitsTable", () => {
  it("décrit le tableau par une légende et des en-têtes de colonnes (exemple 11)", () => {
    render(<SplitsTable result={RESULT} bike={false} />);

    const table = screen.getByTestId("gpx-splits");
    expect(table.tagName.toLowerCase()).toBe("table");
    expect(screen.getByText("Temps de passage par kilomètre")).toBeInTheDocument();

    const columns = within(table).getAllByRole("columnheader");
    expect(columns.map((column) => column.textContent)).toEqual([
      "Km",
      "Temps de passage",
      "Allure",
      "D+",
    ]);
    for (const column of columns) {
      expect(column).toHaveAttribute("scope", "col");
    }
  });

  it("affiche une ligne par kilomètre, temps cumulés et allure (exemple 11)", () => {
    render(<SplitsTable result={RESULT} bike={false} />);

    const rows = within(screen.getByTestId("gpx-splits")).getAllByRole("row");
    expect(rows).toHaveLength(4);

    expect(rows[1]).toHaveTextContent("1");
    expect(rows[1]).toHaveTextContent("5:21");
    expect(rows[2]).toHaveTextContent("10:43");
    expect(rows[3]).toHaveTextContent("13:24");
    expect(rows[3]).toHaveTextContent("5:21");
    expect(rows[1]).toHaveTextContent("12");
  });

  it("annonce la distance réelle du dernier kilomètre partiel (exemple 11)", () => {
    render(<SplitsTable result={RESULT} bike={false} />);

    const rows = within(screen.getByTestId("gpx-splits")).getAllByRole("row");
    const lastCells = within(rows[3]).getAllByRole("cell");
    expect(lastCells[0]).toHaveTextContent("2,5");
    expect(lastCells[0]).not.toHaveTextContent("3");
  });

  it("remplace l'allure par la vitesse pour le vélo (exemple 11)", () => {
    render(<SplitsTable result={RESULT} bike />);

    const table = screen.getByTestId("gpx-splits");
    const columns = within(table).getAllByRole("columnheader");
    expect(columns.map((column) => column.textContent)).toEqual([
      "Km",
      "Temps de passage",
      "Vitesse",
      "D+",
    ]);
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent("11,2");
  });

  it("borne la hauteur et interdit le défilement horizontal (exemple 11)", () => {
    render(<SplitsTable result={RESULT} bike={false} />);

    const container = screen.getByTestId("gpx-splits").parentElement;
    expect(container?.className).toContain("max-h-80");
    expect(container?.className).toContain("overflow-y-auto");
    expect(container?.className).not.toContain("overflow-x-auto");
  });
});
