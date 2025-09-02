import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  language: 'en',
  textDirection: 'ltr' // Add text direction
};

const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {
    setLanguage: (state, action) => {
      state.language = action.payload;
      state.textDirection = action.payload === 'ur' ? 'rtl' : 'ltr';
    },
  },
});

export const { setLanguage } = languageSlice.actions;
export default languageSlice.reducer;
