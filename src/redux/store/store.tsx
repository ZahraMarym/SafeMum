import { configureStore } from '@reduxjs/toolkit';
import languageReducer from '@/redux/slice/languageSlice';

export const store = configureStore({
  reducer: {
    language: languageReducer,
  },
});
