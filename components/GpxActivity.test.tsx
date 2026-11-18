import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import GpxActivity from "@/components/GpxActivity";
import type { AthleteSettings } from "@/lib/athleteStorage";
import { findSport } from "@/lib/sports";

const RUN = findSport("course-modere")!;
const TRAIL = findSport("trail-modere")!;
const BIKE = findSport("velo-route-vtt-modere")!;

/** Données athlète de référence : VMA et PMA renseignées, pas de vélo déclaré. */
const ATHLETE: AthleteSettings = {
  vmaKmh: "16",
  pmaWatts: "300",
  hasBike: false,
  bikeKg: "",
  bikePosition: "hoods",
};

const user = () => userEvent.setup();

/** Pas de latitude (degrés) pour 0,1 km : 101 points font une trace plate de 10 km. */
const STEP_DEG = (0.1 * 180) / (Math.PI * 6371);

/**
 * Fichier GPX de test : `pointCount` points espacés de 0,1 km.
 * `eleAt` renvoie l'altitude d'un point, ou undefined pour l'omettre.
 */
function gpxXml(
  pointCount: number,
  eleAt: (index: number) => number | undefined = () => 100,
): string {
  const points = Array.from({ length: pointCount }, (_, index) => {
    const lat = (45 + index * STEP_DEG).toFixed(9);
    const ele = eleAt(index);
    return `<trkpt lat="${lat}" lon="6">${ele === undefined ? "" : `<ele>${ele}</ele>`}</trkpt>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="test"><trk><trkseg>${points.join("")}</trkseg></trk></gpx>`;
}

/** Trace plate de 10 km, 101 points. */
const FLAT_10_KM = gpxXml(101);

/** Trace de 2,5 km qui monte de 2 m par 100 m (26 points). */
const HILLY_2_5_KM = gpxXml(26, (index) => 100 + index * 2);

/** Trace de 40 km à 45 % de pente : la durée dépasse 24 h au rythme modéré. */
const STEEP_40_KM = gpxXml(401, (index) => 100 + index * 45);

type RenderOptions = {
  sport?: typeof RUN;
  athlete?: Partial<AthleteSettings>;
  weightKg?: string;
};

function renderGpx(options: RenderOptions = {}) {
  const onMinutesChange = vi.fn();
  const { sport = RUN, athlete = {}, weightKg = "70" } = options;

  render(
    <GpxActivity
      sport={sport}
      profile={{ weightKg }}
      athlete={{ ...ATHLETE, ...athlete }}
      onMinutesChange={onMinutesChange}
    />,
  );

  return onMinutesChange;
}

async function upload(
  u: ReturnType<typeof userEvent.setup>,
  xml: string,
  name = "t.gpx",
) {
  await u.upload(screen.getByLabelText("Trace GPX"), new File([xml], name));
}

/** Dernière durée transmise à la page. */
function lastMinutes(spy: ReturnType<typeof vi.fn>): string | undefined {
  const calls = spy.mock.calls;
  return calls.length === 0 ? undefined : (calls[calls.length - 1][0] as string);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("GpxActivity — import et résumé", () => {
  it("n'affiche aucun résultat avant l'import (exemple 2)", () => {
    renderGpx();

    expect(screen.getByLabelText("Trace GPX")).toHaveAttribute(
      "accept",
      ".gpx,application/gpx+xml",
    );
    expect(screen.queryByTestId("gpx-summary")).not.toBeInTheDocument();
  });

  it("course plate de 10 km, VMA 16, rythme modéré : 54 min (exemple 2)", async () => {
    const onMinutesChange = renderGpx();
    const u = user();

    await upload(u, FLAT_10_KM);

    expect(screen.getByTestId("gpx-duration")).toHaveTextContent("54 min");
    expect(onMinutesChange).toHaveBeenLastCalledWith("54");

    const summary = screen.getByTestId("gpx-summary");
    expect(summary).toHaveTextContent("Distance 10 km");
    expect(summary).toHaveTextContent("Vitesse moyenne 11,2 km/h");
  });

  it("passe de rythme modéré à compétition : 44 min (exemple 4)", async () => {
    const onMinutesChange = renderGpx();
    const u = user();

    await upload(u, FLAT_10_KM);
    expect(screen.getByRole("radio", { name: "Rythme modéré (70 %)" })).toBeChecked();

    await u.click(screen.getByRole("radio", { name: "Compétition (85 %)" }));

    expect(screen.getByTestId("gpx-duration")).toHaveTextContent("44 min");
    expect(onMinutesChange).toHaveBeenLastCalledWith("44");
  });

  it("expose les quatre niveaux d'intensité et une aide (exemple 2)", async () => {
    renderGpx();

    const group = screen.getByRole("radiogroup", { name: "Intensité" });
    expect(within(group).getAllByRole("radio")).toHaveLength(4);
    expect(
      screen.getByRole("button", { name: "Aide : intensité" }),
    ).toBeInTheDocument();
  });
});

describe("GpxActivity — terrain", () => {
  it("le terrain n'existe ni pour la course ni pour le vélo (exemple 5)", () => {
    renderGpx();
    expect(
      screen.queryByRole("radiogroup", { name: "Terrain" }),
    ).not.toBeInTheDocument();

    cleanup();
    renderGpx({ sport: BIKE });
    expect(
      screen.queryByRole("radiogroup", { name: "Terrain" }),
    ).not.toBeInTheDocument();
  });

  it("le trail démarre en roulant et ralentit en très technique (exemple 5)", async () => {
    const onMinutesChange = renderGpx({ sport: TRAIL });
    const u = user();

    expect(screen.getByRole("radio", { name: "Roulant" })).toBeChecked();

    await upload(u, FLAT_10_KM);
    const rolling = Number(lastMinutes(onMinutesChange));
    expect(rolling).toBe(54);

    await u.click(screen.getByRole("radio", { name: "Très technique" }));

    const technical = Number(lastMinutes(onMinutesChange));
    expect(technical).toBeGreaterThan(rolling);
  });
});

describe("GpxActivity — données requises", () => {
  it("course sans VMA : message, bouton de paramètres et aucune durée (exemple 6)", async () => {
    const onMinutesChange = renderGpx({ athlete: { vmaKmh: "" } });
    const u = user();

    await upload(u, FLAT_10_KM);

    expect(screen.getByTestId("gpx-error")).toHaveTextContent(
      "Renseigne ta VMA dans le bloc Paramètres.",
    );
    expect(screen.queryByTestId("gpx-summary")).not.toBeInTheDocument();
    expect(onMinutesChange).toHaveBeenLastCalledWith("");

    const settings = screen.getByRole("button", {
      name: "Modifier mes paramètres",
    });
    expect(settings).toHaveFocus();
  });

  it("vélo sans PMA : message PMA et poids, aucune durée (exemple 7)", async () => {
    const onMinutesChange = renderGpx({
      sport: BIKE,
      athlete: { pmaWatts: "" },
    });
    const u = user();

    await upload(u, FLAT_10_KM);

    expect(screen.getByTestId("gpx-error")).toHaveTextContent(
      "Renseigne ta PMA et ton poids dans le bloc Paramètres.",
    );
    expect(onMinutesChange).toHaveBeenLastCalledWith("");
  });

  it("vélo sans vélo déclaré : 9 kg par défaut, position mains en bas (exemple 7)", async () => {
    renderGpx({ sport: BIKE, weightKg: "75", athlete: { hasBike: false } });
    const u = user();

    await upload(u, FLAT_10_KM);

    expect(
      screen.getByText(
        "Vélo par défaut : 9 kg, position mains en bas.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId("gpx-summary")).toBeInTheDocument();
  });

  it("vélo complet : 10 km à plat, PMA 300, 75 kg, vélo 8 kg : 17 min (exemple 3)", async () => {
    const onMinutesChange = renderGpx({
      sport: BIKE,
      weightKg: "75",
      athlete: { hasBike: true, bikeKg: "8", bikePosition: "hoods" },
    });
    const u = user();

    await upload(u, FLAT_10_KM);

    expect(screen.getByTestId("gpx-duration")).toHaveTextContent("17 min");
    expect(onMinutesChange).toHaveBeenLastCalledWith("17");
    expect(
      screen.queryByText(/Vélo par défaut/),
    ).not.toBeInTheDocument();
  });
});

describe("GpxActivity — fichiers refusés", () => {
  it("fichier illisible : message et aucun résultat (exemple 8)", async () => {
    const onMinutesChange = renderGpx();
    const u = user();

    await upload(u, "abc");

    expect(screen.getByTestId("gpx-error")).toHaveTextContent(
      "Fichier GPX illisible.",
    );
    expect(screen.queryByTestId("gpx-summary")).not.toBeInTheDocument();
    expect(onMinutesChange).toHaveBeenLastCalledWith("");
  });

  it("fichier sans trace : message et aucun résultat (exemple 8)", async () => {
    renderGpx();
    const u = user();

    await upload(
      u,
      '<?xml version="1.0"?><gpx version="1.1"><trk><trkseg></trkseg></trk></gpx>',
    );

    expect(screen.getByTestId("gpx-error")).toHaveTextContent(
      "Aucune trace trouvée dans ce fichier.",
    );
  });

  it("trace trop longue pour la journée : message de borne (exemple 9)", async () => {
    const onMinutesChange = renderGpx({ athlete: { vmaKmh: "8" } });
    const u = user();

    await upload(u, STEEP_40_KM);

    expect(screen.getByTestId("gpx-error")).toHaveTextContent(
      "La durée calculée doit être entre 1 minute et 24 h.",
    );
    expect(screen.queryByTestId("gpx-summary")).not.toBeInTheDocument();
    expect(onMinutesChange).toHaveBeenLastCalledWith("");
  });
});

describe("GpxActivity — profil et temps de passage", () => {
  it("trace sans altitude : mention, pas de profil, tableau et durée (exemple 10)", async () => {
    renderGpx();
    const u = user();

    await upload(u, gpxXml(101, () => undefined));

    expect(
      screen.getByText(
        "Altitude absente de la trace : profil plat, durée sans effet de pente.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("gpx-profile")).not.toBeInTheDocument();
    expect(screen.getByTestId("gpx-splits")).toBeInTheDocument();
    expect(screen.getByTestId("gpx-duration")).toHaveTextContent("54 min");
  });

  it("profil accessible et dernière ligne partielle du tableau (exemple 11)", async () => {
    renderGpx();
    const u = user();

    await upload(u, HILLY_2_5_KM);

    const profile = screen.getByTestId("gpx-profile");
    expect(profile).toHaveAttribute("role", "img");
    const label = profile.getAttribute("aria-label") ?? "";
    expect(label).toContain("2,5");
    expect(label).toContain("dénivelé positif");

    const table = screen.getByTestId("gpx-splits");
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(4);
    const lastCells = within(rows[3]).getAllByRole("cell");
    expect(lastCells[0]).toHaveTextContent("2,5");
  });

  it("affiche la mention de vie privée et l'estimation indicative (exemple 2)", () => {
    renderGpx();

    expect(
      screen.getByText(
        "La trace reste sur ton appareil, elle n'est ni envoyée ni enregistrée.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Estimation indicative.")).toBeInTheDocument();
  });
});

describe("GpxActivity — retrait et vie privée", () => {
  it("retirer la trace vide la durée et le résultat (exemple 15)", async () => {
    const onMinutesChange = renderGpx();
    const u = user();

    await upload(u, FLAT_10_KM);
    expect(screen.getByTestId("gpx-summary")).toBeInTheDocument();

    await u.click(screen.getByRole("button", { name: "Retirer la trace" }));

    expect(screen.queryByTestId("gpx-summary")).not.toBeInTheDocument();
    expect(onMinutesChange).toHaveBeenLastCalledWith("");
  });

  it("ne lit ni n'écrit aucun stockage et n'appelle pas fetch (exemple 16)", async () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const removeItem = vi.spyOn(Storage.prototype, "removeItem");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderGpx();
    const u = user();

    await upload(u, FLAT_10_KM);
    await u.click(screen.getByRole("radio", { name: "Compétition (85 %)" }));
    await u.click(screen.getByRole("button", { name: "Retirer la trace" }));

    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
