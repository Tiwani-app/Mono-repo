import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from './FeatherIcon';
import {
  spacing,
  typography,
  useThemeColors,
  useThemedStyles,
  AppColors,
} from '../../theme';

interface Props {
  visible: boolean;
  title: string;
  total: React.ReactNode;
  onClose: () => void;
  onBack?: () => void;
  children: React.ReactNode;
}

const BreakdownSheet = ({
  visible,
  title,
  total,
  onClose,
  onBack,
  children,
}: Props) => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.breakdownBackdrop}>
        <View style={styles.breakdownSheet}>
          <View style={styles.breakdownHeader}>
            {onBack && (
              <TouchableOpacity
                style={styles.breakdownBack}
                onPress={onBack}
                activeOpacity={0.8}>
                <Icon name="arrow-left" size={20} color={colors.gold.default} />
              </TouchableOpacity>
            )}
            <Text style={styles.breakdownTitle} numberOfLines={1}>
              {title}
            </Text>
            <TouchableOpacity
              style={styles.breakdownClose}
              onPress={onClose}
              activeOpacity={0.8}>
              <Icon name="x" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.breakdownScroll}
            contentContainerStyle={styles.breakdownScrollContent}>
            {children}
          </ScrollView>
          <View style={styles.breakdownTotalRow}>
            <Text style={styles.breakdownTotalLabel}>Total</Text>
            <Text style={styles.breakdownTotalValue}>{total}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    breakdownBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    breakdownSheet: {
      gap: spacing.xs,
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      backgroundColor: colors.bg.secondary,
    },
    breakdownHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    breakdownBack: {
      width: 36,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    breakdownClose: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
      backgroundColor: colors.bg.card,
    },
    breakdownTitle: {
      flex: 1,
      fontSize: typography.size.lg,
      fontWeight: typography.weight.bold,
      color: colors.text.primary,
    },
    breakdownScroll: {maxHeight: 400},
    breakdownScrollContent: {gap: spacing.xs},
    breakdownTotalRow: {
      marginTop: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border.subtle,
    },
    breakdownTotalLabel: {
      fontSize: typography.size.base,
      fontWeight: typography.weight.bold,
      color: colors.text.secondary,
    },
    breakdownTotalValue: {
      fontSize: typography.size.md,
      fontWeight: typography.weight.black,
      color: colors.gold.light,
    },
  });

export default BreakdownSheet;
