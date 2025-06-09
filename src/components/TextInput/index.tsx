import {
  TextInput as RNTextInput,
  TextInputProps,
  StyleSheet,
  I18nManager,
} from 'react-native';
import React from 'react';

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(
  (props, ref) => {
    const isRTL = I18nManager.isRTL;

    return (
      <RNTextInput
        ref={ref}
        {...props}
        placeholderTextColor={props.placeholderTextColor || 'gray'}
        style={[
          styles.input,
          { textAlign: isRTL ? 'right' : 'left' }, // RTL awareness
          props.style,
        ]}
      />
    );
  }
);

const styles = StyleSheet.create({
  input: {
    fontFamily: 'Poppins-Regular',
    color: 'black',
    padding: 10,
    borderRadius: 5,
    fontSize: 16,
  },
});
