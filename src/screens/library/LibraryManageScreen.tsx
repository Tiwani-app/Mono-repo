import React from "react";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EmptyState from "../../components/common/EmptyState";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import OutlineButton from "../../components/common/OutlineButton";
import ScreenHeader from "../../components/common/ScreenHeader";
import DocumentCard from "../../components/library/DocumentCard";
import { useLibraryDocuments } from "../../hooks/useLibraryDocuments";
import {
  deleteLibraryDocument,
  setLibraryDocumentStatus,
} from "../../services/libraryService";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing } from "../../theme";
import { LibraryDocument } from "../../types/library";
import { isAdmin } from "../../utils/roleGuard";
import { safeGoBack } from "../../utils/navigation";

const LibraryManageScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const { documents, loading } = useLibraryDocuments();

  if (!isAdmin(user)) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Library Manage" showBack onBack={() => safeGoBack(navigation, "Library")} />
        <EmptyState
          icon="!"
          title="Admin only"
          message="Only admins can manage Library documents."
        />
      </SafeAreaView>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  const confirmDelete = (document: LibraryDocument) => {
    Alert.alert("Delete Document", `Delete ${document.title}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteLibraryDocument(document.id),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Manage Library"
        showBack
        onBack={() => safeGoBack(navigation, "Library")}
        rightElement={
          <GoldButton
            label="Upload"
            size="sm"
            onPress={() => navigation.navigate("DocumentForm")}
          />
        }
      />
      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <View style={styles.manageCard}>
            <DocumentCard
              document={item}
              showStatus
              onPress={() =>
                navigation.navigate("DocumentViewer", { documentId: item.id })
              }
            />
            <View style={styles.actions}>
              <OutlineButton
                label="Edit"
                onPress={() =>
                  navigation.navigate("DocumentForm", { documentId: item.id })
                }
              />
              {item.status === "published" ? (
                <OutlineButton
                  label="Archive"
                  onPress={() => setLibraryDocumentStatus(item.id, "archived")}
                />
              ) : (
                <GoldButton
                  label="Publish"
                  onPress={() => setLibraryDocumentStatus(item.id, "published")}
                />
              )}
              <OutlineButton
                label="Delete"
                color={colors.status.error}
                onPress={() => confirmDelete(item)}
              />
            </View>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="!"
            title="No documents"
            message="Upload a document to start the Library archive."
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  content: { padding: spacing.lg, gap: spacing.md },
  manageCard: { gap: spacing.sm },
  actions: { gap: spacing.sm },
});

export default LibraryManageScreen;
