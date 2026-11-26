"use client";

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";

import {
  activityReducer,
  INITIAL_ACTIVITY,
  selectMinutes,
  type ActivityAction,
  type ActivityState,
} from "@/lib/activity";

type ActivityContextValue = {
  activity: ActivityState;
  minutes: number | null;
  dispatch: Dispatch<ActivityAction>;
};

const ActivityContext = createContext<ActivityContextValue | null>(null);

type ActivityProviderProps = {
  children: ReactNode;
  /** État de départ partiel : utilisé par les tests, jamais en production. */
  initialState?: Partial<ActivityState>;
};

/** L'activité vit une seule fois, dans le layout : elle survit aux navigations client. */
export default function ActivityProvider({
  children,
  initialState,
}: ActivityProviderProps) {
  const [activity, dispatch] = useReducer(activityReducer, {
    ...INITIAL_ACTIVITY,
    ...initialState,
  });
  const minutes = useMemo(() => selectMinutes(activity), [activity]);

  return (
    <ActivityContext value={{ activity, minutes, dispatch }}>
      {children}
    </ActivityContext>
  );
}

export function useActivity(): ActivityContextValue {
  const value = useContext(ActivityContext);
  if (value === null) {
    throw new Error("useActivity doit être utilisé dans <ActivityProvider>");
  }
  return value;
}
