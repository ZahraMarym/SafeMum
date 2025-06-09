// /components/Text.tsx
import { Text as RNText, TextProps } from 'react-native';

export const TextBold = (props: TextProps) => (
  <RNText
    {...props}
    style={[{ fontFamily: 'Poppins-SemiBold' }, props.style]}
  />
);
