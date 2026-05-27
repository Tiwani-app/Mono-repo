import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EmptyState from "../../components/common/EmptyState";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ScreenHeader from "../../components/common/ScreenHeader";
import SyncStatusBanner from "../../components/common/SyncStatusBanner";
import DocumentCard from "../../components/library/DocumentCard";
import DocumentFilterBar from "../../components/library/DocumentFilterBar";
import { useLibraryDocuments } from "../../hooks/useLibraryDocuments";
import { colors, spacing, typography } from "../../theme";
import {
  LIBRARY_CATEGORY_LABELS,
  LIBRARY_TYPE_LABELS,
  LibraryCategory,
  LibraryDocument,
  LibraryDocumentType,
} from "../../types/library";
import { safeGoBack } from "../../utils/navigation";
import {
  filterLibraryDocumentsByCategory,
  filterLibraryDocumentsByTypeAndYear,
} from "../../utils/libraryFilters";

const LibraryCategoryScreen = ({ navigation, route }: any) => {
  const [selectedType, setSelectedType] =
    useState<LibraryDocumentType | "all">("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const { documents, error, lastSyncedAt, loading, syncState } = useLibraryDocuments();
  const category = route.params?.category as LibraryCategory | undefined;
  const validCategory =
    category === "constitutional" || category === "minutes_reports";

  const categoryDocuments = useMemo(
    () =>
      validCategory
        ? filterLibraryDocumentsByCategory(documents, category)
        : [],
    [category, documents, validCategory],
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
      filterLibraryDocumentsByTypeAndYear(
        categoryDocuments,
        selectedType,
        selectedYear,
      ),
    [categoryDocuments, selectedType, selectedYear],
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!validCategory) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Library"
          showBack
          onBack={() => safeGoBack(navigation, "Library")}
        />
        <EmptyState
          icon="!"
          title="Category unavailable"
          message="This Library category could not be found."
          actionLabel="Back to Library"
          onAction={() => safeGoBack(navigation, "Library")}
        />
      </SafeAreaView>
    );
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
            <SyncStatusBanner state={syncState} lastSyncedAt={lastSyncedAt} />
            <Text style={styles.sectionLabel}>TYPE</Text>
            <DocumentFilterBar
              options={typeOptions}
              selectedValue={selectedType}
              onChange={(value) =>
                setSelectedType(value as LibraryDocumentType | "all")
              }
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
            title={error ? "Category unavailable" : "No documents here"}
            message={
              error ??
              (categoryDocuments.length
                ? "Try clearing filters or choosing another year."
                : "Published documents in this category will appear here.")
            }
            actionLabel={
              !error && categoryDocuments.length ? "Clear Filters" : undefined
            }
            onAction={
              !error && categoryDocuments.length
                ? () => {
                    setSelectedType("all");
                    setSelectedYear("all");
                  }
                : undefined
            }
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
