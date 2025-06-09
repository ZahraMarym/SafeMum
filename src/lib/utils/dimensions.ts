import { Dimensions } from 'react-native';

// Get the dimensions of the window
const { width, height } = Dimensions.get('window');

/**
 * Calculates the pixel value for a given percentage of the screen height.
 */
export const calcPercentageHeight = (percentage: number): number => {
  
  return (height * percentage) / 100;
};

/**
 * Calculates the pixel value for a given percentage of the screen width.
 */
export const calcPercentageWidth = (percentage: number): number => {
  
  return (width * percentage) / 100;
};
