import React, { useMemo } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Badge from "../../components/common/Badge";
import EmptyState from "../../components/common/EmptyState";
import Icon from "../../components/common/FeatherIcon";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ScreenHeader from "../../components/common/ScreenHeader";
import DocumentCard from "../../components/library/DocumentCard";
import DocumentCategoryCard from "../../components/library/DocumentCategoryCard";
import { useLibraryDocuments } from "../../hooks/useLibraryDocuments";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import {
  LIBRARY_CATEGORY_LABELS,
  LibraryCategory,
  LibraryDocument,
} from "../../types/library";
import { isAdmin } from "../../utils/roleGuard";
import { safeGoBack } from "../../utils/navigation";

const categorySubtitles: Record<LibraryCategory, string> = {
  constitutional: "Constitution, by-laws, conduct, and governance references.",
  minutes_reports: "Meeting minutes, finance reports, and committee updates.",
};

const categoryIcons: Record<LibraryCategory, string> = {
  constitutional: "book-open",
  minutes_reports: "folder",
};

const LibraryScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const admin = isAdmin(user);
  const { documents, error, loading, searchQuery, setSearchQuery } =
    useLibraryDocuments();

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return documents;
    }
    return documents.filter(
      (document) =>
        document.title.toLowerCase().includes(query) ||
        document.description.toLowerCase().includes(query),
    );
  }, [documents, searchQuery]);

  const counts = useMemo(
    () =>
      documents.reduce<Record<LibraryCategory, number>>(
        (total, document) => ({
          ...total,
          [document.category]: total[document.category] + 1,
        }),
        { constitutional: 0, minutes_reports: 0 },
      ),
    [documents],
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Library"
        showBack
        onBack={() => safeGoBack(navigation, "DashboardHome")}
        rightElement={
          admin ? (
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => navigation.navigate("DocumentForm")}
              >
                <Icon name="upload" size={18} color={colors.text.onGold} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => navigation.navigate("LibraryManage")}
              >
                <Icon name="sliders" size={18} color={colors.text.onGold} />
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
      <FlatList
        data={filteredDocuments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
          <TextInput
              style={[styles.search, { marginBottom: spacing.md }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search title or description"
              placeholderTextColor={colors.text.tertiary}
            />
            <View style={[styles.hero, { marginBottom: spacing.md }]}>
              <Badge label="OFFICIAL DOCUMENTS" color={colors.gold.default} />
              <Text style={styles.heroTitle}>Association Library</Text>
              <Text style={styles.heroBody}>
                Browse current governance documents, meeting minutes, and reports.
              </Text>
            </View>
            <View style={styles.categoryGrid}>
              {(Object.keys(LIBRARY_CATEGORY_LABELS) as LibraryCategory[]).map(
                (category) => (
                  <DocumentCategoryCard
                    key={category}
                    count={counts[category]}
                    icon={categoryIcons[category]}
                    label={LIBRARY_CATEGORY_LABELS[category]}
                    subtitle={categorySubtitles[category]}
                    onPress={() =>
                      navigation.navigate("LibraryCategory", { category })
                    }
                  />
                ),
              )}
            </View>
            <Text style={styles.sectionLabel}>DOCUMENTS</Text>
          </>
        }
        renderItem={({ item }: { item: LibraryDocument }) => (
          <DocumentCard
            document={item}
            showStatus={admin}
            onPress={() =>
              navigation.navigate("DocumentViewer", { documentId: item.id })
            }
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="!"
            title={error ? "Library unavailable" : "No documents found"}
            message={
              error ??
              (searchQuery
                ? "Try a different search term."
                : "Published documents will appear here.")
            }
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  headerActions: { flexDirection: "row", gap: spacing.sm },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gold.default,
  },
  content: { padding: spacing.lg, gap: spacing.md },
  hero: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  heroTitle: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  heroBody: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    lineHeight: 21,
  },
  search: {
    minHeight: 48,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.tertiary,
    color: colors.text.primary,
  },
  categoryGrid: { flexDirection: "row", gap: spacing.md },
  sectionLabel: {
    marginTop: spacing.sm,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
    letterSpacing: 0.8,
  },
});

export default LibraryScreen;
