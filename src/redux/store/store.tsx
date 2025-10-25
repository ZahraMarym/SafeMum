import { configureStore } from '@reduxjs/toolkit';
import languageReducer from '@/redux/slice/languageSlice';
import dashboardReducer from '@/redux/slice/dashboardSlice';

export const store = configureStore({
  reducer: {
    language: languageReducer,
    dashboard: dashboardReducer,

  },
  });
