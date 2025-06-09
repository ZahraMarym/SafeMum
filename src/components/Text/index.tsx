// /components/Text.tsx
import { Text as RNText, TextProps } from 'react-native';

export const Text = (props: TextProps) => (
  <RNText
    {...props}
    style={[{ fontFamily: 'Poppins-Regular' }, props.style]}
  />
);
