import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ActivityProvider, {
  useActivity,
} from "@/components/providers/ActivityProvider";

describe("ActivityProvider", () => {
  it("lève une erreur explicite hors du provider (exemple 7)", () => {
    expect(() => renderHook(() => useActivity())).toThrow(
      "useActivity doit être utilisé dans <ActivityProvider>",
    );
  });

  it("fusionne un état initial partiel et met à jour minutes (exemple 8)", () => {
    const { result } = renderHook(() => useActivity(), {
      wrapper: ({ children }) => (
        <ActivityProvider
          initialState={{
            sportId: "course-modere",
            effort: { distanceKm: "10", speed: "12", speedUnit: "kmh" },
          }}
        >
          {children}
        </ActivityProvider>
      ),
    });

    expect(result.current.activity.sportId).toBe("course-modere");
    expect(result.current.activity.intensity).toBe("moderate");
    expect(result.current.minutes).toBe(50);

    act(() => {
      result.current.dispatch({
        type: "effortChanged",
        effort: { distanceKm: "20", speed: "12", speedUnit: "kmh" },
      });
    });

    expect(result.current.activity.effort.distanceKm).toBe("20");
    expect(result.current.minutes).toBe(100);
  });
});
