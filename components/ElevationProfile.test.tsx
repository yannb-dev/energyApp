import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ElevationProfile from "@/components/ElevationProfile";
import type { Track } from "@/lib/gpx";

/** Trace minimale : seuls le profil et les totaux sont lus par le composant. */
function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    distanceKm: 42.2,
    ascentM: 850,
    descentM: 840,
    hasElevation: true,
    segments: [],
    kilometers: [],
    profile: [
      { km: 0.05, eleM: 120 },
      { km: 10, eleM: 300 },
      { km: 21, eleM: 640 },
      { km: 32, eleM: 400 },
      { km: 42.15, eleM: 120 },
    ],
    ...overrides,
  };
}

/** Textes des repères de l'axe horizontal. */
function tickLabels(svg: HTMLElement): string[] {
  return Array.from(svg.querySelectorAll("text")).map(
    (node) => node.textContent ?? "",
  );
}

describe("ElevationProfile", () => {
  it("expose une image accessible qui résume distance et dénivelé (exemple 11)", () => {
    render(<ElevationProfile track={makeTrack()} />);

    const profile = screen.getByTestId("gpx-profile");
    expect(profile.tagName.toLowerCase()).toBe("svg");
    expect(profile).toHaveAttribute("role", "img");

    const label = profile.getAttribute("aria-label") ?? "";
    expect(label).toContain("42,2");
    expect(label).toContain("850");
    expect(label).toContain("dénivelé positif");
  });

  it("reste fluide sur mobile : viewBox fixe, largeur fluide, aucun défilement", () => {
    render(<ElevationProfile track={makeTrack()} />);

    const profile = screen.getByTestId("gpx-profile");
    expect(profile).toHaveAttribute("viewBox");
    expect(profile.getAttribute("class")).toContain("w-full");
    expect(profile.getAttribute("class")).toContain("h-auto");
    expect(profile.getAttribute("class")).not.toContain("overflow-x-auto");
  });

  it("place des repères verticaux tous les 10 km sur une longue trace (exemple 11)", () => {
    render(<ElevationProfile track={makeTrack()} />);

    const labels = tickLabels(screen.getByTestId("gpx-profile"));
    expect(labels).toContain("10");
    expect(labels).toContain("20");
    expect(labels).toContain("30");
    expect(labels).toContain("40");
  });

  it("trace un repère par kilomètre sur une trace courte (exemple 11)", () => {
    render(
      <ElevationProfile
        track={makeTrack({
          distanceKm: 2.5,
          ascentM: 50,
          profile: [
            { km: 0.05, eleM: 100 },
            { km: 1.25, eleM: 125 },
            { km: 2.45, eleM: 150 },
          ],
        })}
      />,
    );

    const labels = tickLabels(screen.getByTestId("gpx-profile"));
    expect(labels).toContain("1");
    expect(labels).toContain("2");
  });

  it("n'affiche aucun profil quand la trace n'a pas d'altitude (exemple 10)", () => {
    render(
      <ElevationProfile
        track={makeTrack({ hasElevation: false, ascentM: 0, descentM: 0, profile: [] })}
      />,
    );

    expect(screen.queryByTestId("gpx-profile")).not.toBeInTheDocument();
  });
});
