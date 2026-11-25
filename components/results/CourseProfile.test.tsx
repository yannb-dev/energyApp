import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import CourseProfile from "@/components/results/CourseProfile";
import {
  ATHLETE_STORAGE_KEY,
  type AthleteSettings,
} from "@/lib/athleteStorage";
import { buildTrack, parseGpx } from "@/lib/gpx";
import { PROFILE_STORAGE_KEY, type ProfileSettings } from "@/lib/profileStorage";
import { renderWithProviders } from "@/test/renderWithProviders";

const PROFILE: ProfileSettings = {
  sex: "male",
  age: "30",
  weightKg: "70",
  heightCm: "175",
  activityIndex: 1,
};

const ATHLETE: AthleteSettings = {
  vmaKmh: "16",
  pmaWatts: "300",
  hasBike: false,
  bikeKg: "",
  bikePosition: "hoods",
};

/** Pas de latitude (degrés) pour 0,1 km. */
const STEP_DEG = (0.1 * 180) / (Math.PI * 6371);

/** Fichier GPX de test : `pointCount` points espacés de 0,1 km. */
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

/** Trace construite depuis un fichier de test. */
function trackFrom(xml: string) {
  const parsed = parseGpx(xml);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  return buildTrack(parsed.points);
}

function storeSettings() {
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(PROFILE));
  window.localStorage.setItem(ATHLETE_STORAGE_KEY, JSON.stringify(ATHLETE));
}

describe("CourseProfile", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("trace sans altitude : mention, pas de profil, tableau et durée (exemple 11)", () => {
    storeSettings();
    renderWithProviders(<CourseProfile />, {
      activity: {
        sportId: "course-modere",
        inputMode: "gpx",
        track: trackFrom(gpxXml(101, () => undefined)),
      },
    });

    expect(
      screen.getByText(
        "Altitude absente de la trace : profil plat, durée sans effet de pente.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("gpx-profile")).not.toBeInTheDocument();
    expect(screen.getByTestId("gpx-splits")).toBeInTheDocument();
  });

  it("profil accessible et dernière ligne partielle du tableau (exemple 11)", () => {
    storeSettings();
    renderWithProviders(<CourseProfile />, {
      activity: {
        sportId: "course-modere",
        inputMode: "gpx",
        track: trackFrom(gpxXml(26, (index) => 100 + index * 2)),
      },
    });

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

  it("ne rend rien en saisie manuelle (exemple 12)", () => {
    storeSettings();
    const { container } = renderWithProviders(<CourseProfile />, {
      activity: {
        sportId: "course-modere",
        inputMode: "manual",
        track: trackFrom(gpxXml(101)),
      },
    });

    expect(container).toBeEmptyDOMElement();
  });
});
