import React from 'react';
import {
  KeyboardTypeOptions,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import {Controller} from 'react-hook-form';
import {
  spacing,
  typography,
  useThemeColors,
  useThemedStyles,
  AppColors,
} from '../../theme';

interface Props {
  // Typed `any` to match the per-screen `Field` these replaced: react-hook-form's
  // Control/rules generics vary per form and aren't assignable to a shared type.
  control: any;
  name: string;
  label: string;
  error?: string;
  rules?: any;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  placeholder?: string;
  fieldStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  renderInput?: (field: {
    onChange: (value: string) => void;
    value: string;
  }) => React.ReactElement;
}

const FormField = ({
  control,
  name,
  label,
  error,
  rules,
  keyboardType,
  multiline,
  placeholder,
  fieldStyle,
  inputStyle,
  renderInput,
}: Props) => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.field, fieldStyle]}>
      <Text style={styles.label}>{label}</Text>
      <Controller
        control={control}
        name={name}
        rules={rules}
        render={({field: {onBlur, onChange, value}}) =>
          renderInput ? (
            renderInput({onChange, value})
          ) : (
            <TextInput
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              keyboardType={keyboardType}
              autoCapitalize={
                keyboardType === 'email-address' || keyboardType === 'url'
                  ? 'none'
                  : undefined
              }
              multiline={multiline}
              placeholder={placeholder}
              placeholderTextColor={colors.text.tertiary}
              style={[
                styles.input,
                multiline && styles.textArea,
                error && styles.inputError,
                inputStyle,
              ]}
            />
          )
        }
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    field: {gap: spacing.xs},
    label: {
      fontSize: typography.size.xs,
      color: colors.text.secondary,
      letterSpacing: 0.5,
    },
    input: {
      minHeight: 48,
      padding: spacing.md,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.border.subtle,
      backgroundColor: colors.bg.tertiary,
      color: colors.text.primary,
    },
    textArea: {minHeight: 92, textAlignVertical: 'top'},
    inputError: {borderColor: colors.status.error},
    errorText: {fontSize: typography.size.xs, color: colors.status.error},
  });

export default FormField;
