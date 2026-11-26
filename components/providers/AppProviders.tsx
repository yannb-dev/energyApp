"use client";

import type { ReactNode } from "react";

import ActivityProvider from "@/components/providers/ActivityProvider";
import UserSettingsProvider from "@/components/providers/UserSettingsProvider";

/** Providers montés une seule fois par le layout racine (SPEC-08.3). */
export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <UserSettingsProvider>
      <ActivityProvider>{children}</ActivityProvider>
    </UserSettingsProvider>
  );
}
