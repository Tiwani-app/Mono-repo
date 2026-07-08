import React, { useState } from "react";
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
  unarchiveLibraryDocument,
} from "../../services/libraryService";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing } from "../../theme";
import { LibraryDocument } from "../../types/library";
import { canManageLibraryDocuments } from "../../utils/libraryGuards";
import { safeGoBack } from "../../utils/navigation";

const LibraryManageScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const canManage = canManageLibraryDocuments(user);
  const { documents, error, loading } = useLibraryDocuments({
    enabled: canManage,
  });
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  if (!canManage) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Library Manage"
          showBack
          onBack={() => safeGoBack(navigation, "Library")}
        />
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

  const runDocumentAction = async (
    actionId: string,
    action: () => Promise<void>,
    failureTitle: string,
  ) => {
    try {
      setPendingActionId(actionId);
      await action();
    } catch (actionError) {
      Alert.alert(
        failureTitle,
        actionError instanceof Error
          ? actionError.message
          : "Please try again.",
      );
    } finally {
      setPendingActionId(null);
    }
  };

  const confirmDelete = (document: LibraryDocument) => {
    Alert.alert("Delete Document", `Delete ${document.title}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          runDocumentAction(
            `delete-${document.id}`,
            () => deleteLibraryDocument(document.id),
            "Document not deleted",
          ),
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
                disabled={Boolean(pendingActionId)}
                onPress={() =>
                  navigation.navigate("DocumentForm", { documentId: item.id })
                }
              />
              {item.status === "archived" ? (
                <GoldButton
                  label="Unarchive"
                  loading={pendingActionId === `unarchive-${item.id}`}
                  disabled={Boolean(pendingActionId)}
                  onPress={() =>
                    runDocumentAction(
                      `unarchive-${item.id}`,
                      () => unarchiveLibraryDocument(item.id),
                      "Document not unarchived",
                    )
                  }
                />
              ) : item.status === "published" ? (
                <OutlineButton
                  label="Archive"
                  disabled={Boolean(pendingActionId)}
                  onPress={() =>
                    runDocumentAction(
                      `archive-${item.id}`,
                      () => setLibraryDocumentStatus(item.id, "archived"),
                      "Document not archived",
                    )
                  }
                />
              ) : (
                <GoldButton
                  label="Publish"
                  loading={pendingActionId === `publish-${item.id}`}
                  disabled={Boolean(pendingActionId)}
                  onPress={() =>
                    runDocumentAction(
                      `publish-${item.id}`,
                      () => setLibraryDocumentStatus(item.id, "published"),
                      "Document not published",
                    )
                  }
                />
              )}
              <OutlineButton
                label="Delete"
                color={colors.status.error}
                disabled={Boolean(pendingActionId)}
                onPress={() => confirmDelete(item)}
              />
            </View>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="!"
            title={error ? "Library management unavailable" : "No documents"}
            message={error ?? "Upload a document to start the Library archive."}
            actionLabel={error ? undefined : "Upload Document"}
            onAction={
              error ? undefined : () => navigation.navigate("DocumentForm")
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
  manageCard: { gap: spacing.sm },
  actions: { gap: spacing.sm },
});

export default LibraryManageScreen;
