import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EmptyState from "../../components/common/EmptyState";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ScreenHeader from "../../components/common/ScreenHeader";
import DocumentCard from "../../components/library/DocumentCard";
import DocumentFilterBar from "../../components/library/DocumentFilterBar";
import { useLibraryDocuments } from "../../hooks/useLibraryDocuments";
import { colors, spacing, typography } from "../../theme";
import {
  LIBRARY_CATEGORY_LABELS,
  LIBRARY_TYPE_LABELS,
  LibraryCategory,
  LibraryDocument,
} from "../../types/library";
import { safeGoBack } from "../../utils/navigation";

const LibraryCategoryScreen = ({ navigation, route }: any) => {
  const [selectedType, setSelectedType] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const { documents, loading } = useLibraryDocuments();
  const category = route.params.category as LibraryCategory;

  const categoryDocuments = useMemo(
    () => documents.filter((document) => document.category === category),
    [category, documents],
  );

  const typeOptions = useMemo(() => {
    const seen = new Set(categoryDocuments.map((document) => document.type));
    return [
      { label: "All Types", value: "all" },
      ...Array.from(seen).map((type) => ({
        label: LIBRARY_TYPE_LABELS[type],
        value: type,
      })),
    ];
  }, [categoryDocuments]);

  const yearOptions = useMemo(() => {
    const years = new Set(
      categoryDocuments.map((document) =>
        String((document.documentDate ?? document.uploadedAt).getFullYear()),
      ),
    );
    return [
      { label: "All Years", value: "all" },
      ...Array.from(years)
        .sort((a, b) => Number(b) - Number(a))
        .map((year) => ({ label: year, value: year })),
    ];
  }, [categoryDocuments]);

  const visibleDocuments = useMemo(
    () =>
      categoryDocuments.filter((document) => {
        const date = document.documentDate ?? document.uploadedAt;
        const typeMatch = selectedType === "all" || document.type === selectedType;
        const yearMatch =
          selectedYear === "all" || String(date.getFullYear()) === selectedYear;
        return typeMatch && yearMatch;
      }),
    [categoryDocuments, selectedType, selectedYear],
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title={LIBRARY_CATEGORY_LABELS[category]}
        showBack
        onBack={() => safeGoBack(navigation, "Library")}
      />
      <FlatList
        data={visibleDocuments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <Text style={styles.sectionLabel}>TYPE</Text>
            <DocumentFilterBar
              options={typeOptions}
              selectedValue={selectedType}
              onChange={setSelectedType}
            />
            <Text style={styles.sectionLabel}>YEAR</Text>
            <DocumentFilterBar
              options={yearOptions}
              selectedValue={selectedYear}
              onChange={setSelectedYear}
            />
          </>
        }
        renderItem={({ item }: { item: LibraryDocument }) => (
          <DocumentCard
            document={item}
            onPress={() =>
              navigation.navigate("DocumentViewer", { documentId: item.id })
            }
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="!"
            title="No documents here"
            message="Try clearing filters or check back after documents are published."
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  content: { padding: spacing.lg, gap: spacing.md },
  sectionLabel: {
    marginTop: spacing.sm,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
    letterSpacing: 0.8,
  },
});

export default LibraryCategoryScreen;
