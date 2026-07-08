import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export const DASHBOARD_TABS = {
  ACTIVE: "Connect",
  CREATE: "Create",
  PUBLISH: "Publish",
  SCHEDULE: "Schedule",
  ANALYTICS: "Analytics",
  SUMMARY: "Summary",
} as const;

export type DashboardTab = typeof DASHBOARD_TABS[keyof typeof DASHBOARD_TABS];

interface DashboardState {
  activeTab: DashboardTab;
  activePlatform: string | null;
}

const initialState: DashboardState = {
  activeTab: DASHBOARD_TABS.ACTIVE,
  activePlatform: null,
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    setActiveTab(state, action: PayloadAction<DashboardTab>) {
      state.activeTab = action.payload;
      state.activePlatform = null;
    },
    setActivePlatform(state, action: PayloadAction<string | null>) {
      state.activePlatform = action.payload;
    },
    resetDashboardView(state) {
      state.activeTab = DASHBOARD_TABS.ACTIVE;
      state.activePlatform = null;
    },
  },
});

export const { setActiveTab, setActivePlatform, resetDashboardView } =
  dashboardSlice.actions;

export default dashboardSlice.reducer;
