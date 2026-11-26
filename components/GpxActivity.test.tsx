import { act, cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import GpxActivity from "@/components/GpxActivity";
import type { AthleteSettings } from "@/lib/athleteStorage";
import { findSport } from "@/lib/sports";
import {
  ActivityProbe,
  renderWithProviders,
} from "@/test/renderWithProviders";

const RUN = findSport("course-modere")!;
const TRAIL = findSport("trail-modere")!;
const BIKE = findSport("velo-route-vtt-modere")!;
const SKI = findSport("ski-rando-modere")!;

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

/** Trace de 40 km à 45 % de pente : la durée dépasse 24 h au rythme modéré. */
const STEEP_40_KM = gpxXml(401, (index) => 100 + index * 45);

/** Trace de ski : 2 km de montée puis 2 km de descente. */
const SKI_HILL = gpxXml(41, (index) =>
  100 + (index <= 20 ? index * 10 : (40 - index) * 10),
);

type RenderOptions = {
  sport?: typeof RUN;
  athlete?: Partial<AthleteSettings>;
  weightKg?: string;
};

function renderGpx(options: RenderOptions = {}) {
  const { sport = RUN, athlete = {}, weightKg = "70" } = options;

  renderWithProviders(
    <>
      <GpxActivity
        sport={sport}
        profile={{ weightKg }}
        athlete={{ ...ATHLETE, ...athlete }}
        onEditSettings={vi.fn()}
      />
      <ActivityProbe />
    </>,
    { activity: { sportId: sport.id, inputMode: "gpx" } },
  );
}

async function upload(
  u: ReturnType<typeof userEvent.setup>,
  xml: string,
  name = "t.gpx",
) {
  await u.upload(screen.getByLabelText("Trace GPX"), new File([xml], name));
  // L'import passe par `await file.text()` : on termine l'acte avant de lire la durée.
  await act(async () => {});
}

/** Durée publiée au contexte par GpxActivity, en texte. */
function minutesText(): string {
  return screen.getByTestId("activity-minutes").textContent ?? "";
}

/** Durée publiée au contexte, en nombre ; null si elle n'est pas calculable. */
function minutes(): number | null {
  const text = minutesText();
  return text === "" ? null : Number(text);
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
    renderGpx();
    const u = user();

    await upload(u, FLAT_10_KM);

    expect(screen.getByTestId("gpx-duration")).toHaveTextContent("54 min");
    expect(minutesText()).toBe("54");

    const summary = screen.getByTestId("gpx-summary");
    expect(summary).toHaveTextContent("Distance 10 km");
    expect(summary).toHaveTextContent("Vitesse moyenne 11,2 km/h");
  });

  it("passe de rythme modéré à compétition : 44 min (exemple 4)", async () => {
    renderGpx();
    const u = user();

    await upload(u, FLAT_10_KM);
    expect(screen.getByRole("radio", { name: "Rythme modéré (70 %)" })).toBeChecked();

    await u.click(screen.getByRole("radio", { name: "Compétition (85 %)" }));

    expect(screen.getByTestId("gpx-duration")).toHaveTextContent("44 min");
    expect(minutesText()).toBe("44");
  });

  it("expose les quatre niveaux d'intensité et une aide (exemple 2)", () => {
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
    renderGpx({ sport: TRAIL });
    const u = user();

    expect(screen.getByRole("radio", { name: "Roulant" })).toBeChecked();

    await upload(u, FLAT_10_KM);
    const rolling = minutes();
    expect(rolling).toBe(54);

    await u.click(screen.getByRole("radio", { name: "Très technique" }));

    const technical = minutes();
    expect(technical ?? 0).toBeGreaterThan(rolling ?? 0);
  });
});

describe("GpxActivity — données requises", () => {
  it("course sans VMA : message, bouton de paramètres et aucune durée (exemple 6)", async () => {
    renderGpx({ athlete: { vmaKmh: "" } });
    const u = user();

    await upload(u, FLAT_10_KM);

    expect(screen.getByTestId("gpx-error")).toHaveTextContent(
      "Renseigne ta VMA dans le bloc Paramètres.",
    );
    expect(screen.queryByTestId("gpx-summary")).not.toBeInTheDocument();
    expect(minutesText()).toBe("");

    const settings = screen.getByRole("button", {
      name: "Modifier mes paramètres",
    });
    expect(settings).toHaveFocus();
  });

  it("vélo sans PMA : message PMA et poids, aucune durée (exemple 7)", async () => {
    renderGpx({
      sport: BIKE,
      athlete: { pmaWatts: "" },
    });
    const u = user();

    await upload(u, FLAT_10_KM);

    expect(screen.getByTestId("gpx-error")).toHaveTextContent(
      "Renseigne ta PMA et ton poids dans le bloc Paramètres.",
    );
    expect(minutesText()).toBe("");
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
    renderGpx({
      sport: BIKE,
      weightKg: "75",
      athlete: { hasBike: true, bikeKg: "8", bikePosition: "hoods" },
    });
    const u = user();

    await upload(u, FLAT_10_KM);

    expect(screen.getByTestId("gpx-duration")).toHaveTextContent("17 min");
    expect(minutesText()).toBe("17");
    expect(
      screen.queryByText(/Vélo par défaut/),
    ).not.toBeInTheDocument();
  });
});

describe("GpxActivity — fichiers refusés", () => {
  it("fichier illisible : message et aucun résultat (exemple 8)", async () => {
    renderGpx();
    const u = user();

    await upload(u, "abc");

    expect(screen.getByTestId("gpx-error")).toHaveTextContent(
      "Fichier GPX illisible.",
    );
    expect(screen.queryByTestId("gpx-summary")).not.toBeInTheDocument();
    expect(minutesText()).toBe("");
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
    renderGpx({ athlete: { vmaKmh: "8" } });
    const u = user();

    await upload(u, STEEP_40_KM);

    expect(screen.getByTestId("gpx-error")).toHaveTextContent(
      "La durée calculée doit être entre 1 minute et 24 h.",
    );
    expect(screen.queryByTestId("gpx-summary")).not.toBeInTheDocument();
    expect(minutesText()).toBe("");
  });
});

describe("GpxActivity — profil et temps de passage", () => {
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
    renderGpx();
    const u = user();

    await upload(u, FLAT_10_KM);
    expect(screen.getByTestId("gpx-summary")).toBeInTheDocument();

    await u.click(screen.getByRole("button", { name: "Retirer la trace" }));

    expect(screen.queryByTestId("gpx-summary")).not.toBeInTheDocument();
    expect(minutesText()).toBe("");
  });

  it("ne lit ni n'écrit aucun stockage et n'appelle pas fetch (exemple 16)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    // Les providers lisent le stockage à leur montage : on espionne après coup,
    // pour ne contrôler que les actions de GpxActivity elle-même.
    renderGpx();

    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const removeItem = vi.spyOn(Storage.prototype, "removeItem");

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

describe("GpxActivity — ski de randonnée", () => {
  it("affiche le niveau de ski, les phases, sans terrain ni VMA (exemple 14)", async () => {
    renderGpx({ sport: SKI, athlete: { vmaKmh: "" } });
    const u = user();

    expect(
      screen.getByRole("radiogroup", { name: "Niveau de ski" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("radiogroup", { name: "Terrain" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Intermédiaire" })).toBeChecked();
    expect(
      screen.getByRole("radio", { name: "Rythme modéré (≈ 400 m/h)" }),
    ).toBeInTheDocument();

    await upload(u, SKI_HILL);

    expect(screen.getByTestId("gpx-phases")).toBeInTheDocument();
    expect(
      screen.queryByText("Renseigne ta VMA dans le bloc Paramètres."),
    ).not.toBeInTheDocument();
    expect(minutes()).not.toBeNull();
  });

  it("passer à Expert réduit la durée sur une trace avec descente (exemple 14)", async () => {
    renderGpx({ sport: SKI });
    const u = user();

    await upload(u, SKI_HILL);
    const intermediate = minutes();

    await u.click(screen.getByRole("radio", { name: "Expert" }));

    const expert = minutes();
    expect(expert ?? 0).toBeLessThan(intermediate ?? 0);
  });

  it("ne lit ni n'écrit aucun stockage et n'appelle pas fetch en ski (exemple 17)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderGpx({ sport: SKI });

    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const removeItem = vi.spyOn(Storage.prototype, "removeItem");

    const u = user();

    await upload(u, SKI_HILL);
    await u.click(screen.getByRole("radio", { name: "Expert" }));
    await u.click(screen.getByRole("radio", { name: /Compétition/ }));
    await u.click(screen.getByRole("button", { name: "Retirer la trace" }));

    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
