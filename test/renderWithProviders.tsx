import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

import ActivityProvider, {
  useActivity,
} from "@/components/providers/ActivityProvider";
import UserSettingsProvider, {
  useUserSettings,
} from "@/components/providers/UserSettingsProvider";
import type { ActivityState } from "@/lib/activity";

/** Affiche la durée lue dans le contexte, pour remplacer les anciens callbacks. */
export function ActivityProbe() {
  const { minutes } = useActivity();
  return <output data-testid="activity-minutes">{minutes ?? ""}</output>;
}

/** Les composants lisent le stockage au montage : on attend « ready » avant de les rendre. */
function ReadyGate({ children }: { children: ReactNode }) {
  const { status } = useUserSettings();
  return status === "ready" ? <>{children}</> : null;
}

type RenderOptions = {
  activity?: Partial<ActivityState>;
};

/** `render` enveloppé dans les providers du layout, comme en production. */
export function renderWithProviders(
  ui: ReactElement,
  { activity }: RenderOptions = {},
): RenderResult {
  return render(
    <UserSettingsProvider>
      <ActivityProvider initialState={activity}>
        <ReadyGate>{ui}</ReadyGate>
      </ActivityProvider>
    </UserSettingsProvider>,
  );
}
