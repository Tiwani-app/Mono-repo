import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Badge from "../../components/common/Badge";
import ScreenHeader from "../../components/common/ScreenHeader";
import { colors, spacing, typography } from "../../theme";
import { safeGoBack } from "../../utils/navigation";

interface Props {
  title: string;
  badge?: string;
  body: string;
  bullets?: string[];
  fallbackRoute?: string;
  navigation: { canGoBack?: () => boolean; goBack: () => void; navigate: (...args: any[]) => void };
}

const WorkflowPlaceholderScreen = ({
  badge = "NEXT FORM STEP",
  body,
  bullets = [],
  fallbackRoute = "DashboardHome",
  navigation,
  title,
}: Props) => (
  <SafeAreaView style={styles.safe}>
    <ScreenHeader title={title} showBack onBack={() => safeGoBack(navigation, fallbackRoute)} />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Badge label={badge} color={colors.gold.default} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
      {bullets.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>EXPECTED CONTROLS</Text>
          {bullets.map((bullet) => (
            <Text key={bullet} style={styles.bullet}>
              - {bullet}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  content: { padding: spacing.lg, gap: spacing.lg },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  body: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    lineHeight: 21,
  },
  sectionLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
    letterSpacing: 0.8,
  },
  bullet: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    lineHeight: 22,
  },
});

export default WorkflowPlaceholderScreen;
