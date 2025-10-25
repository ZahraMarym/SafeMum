import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  dashboardData: null,
  loading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    setDashboardData: (state, action) => {
      state.dashboardData = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearDashboardData: (state) => {
      state.dashboardData = null;
      state.error = null;
    },
  },
});

export const {
  setDashboardData,
  setLoading,
  setError,
  clearDashboardData,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
