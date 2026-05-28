import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Badge from "../../components/common/Badge";
import EmptyState from "../../components/common/EmptyState";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import OutlineButton from "../../components/common/OutlineButton";
import ScreenHeader from "../../components/common/ScreenHeader";
import {
  getLibraryDocumentURL,
  getLibraryDocument,
} from "../../services/libraryService";
import { useAuthStore } from "../../store/authStore";
import { colors, spacing, typography } from "../../theme";
import {
  LIBRARY_CATEGORY_LABELS,
  LIBRARY_TYPE_LABELS,
  LibraryDocument,
} from "../../types/library";
import { formatDisplayDate } from "../../utils/formatDate";
import { safeGoBack } from "../../utils/navigation";
import { isAdmin } from "../../utils/roleGuard";

const DocumentViewerScreen = ({ navigation, route }: any) => {
  const documentId = route.params?.documentId as string | undefined;
  const { user } = useAuthStore();
  const admin = isAdmin(user);
  const [document, setDocument] = useState<LibraryDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    if (!documentId) {
      setError("This document could not be found.");
      setLoading(false);
      return;
    }
    getLibraryDocument(documentId, admin)
      .then(setDocument)
      .catch((loadError) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load this document.",
        ),
      )
      .finally(() => setLoading(false));
  }, [admin, documentId]);

  const handleOpen = async () => {
    if (!document) {
      return;
    }
    try {
      setOpening(true);
      const url = await getLibraryDocumentURL(document.id, admin);
      if (!url) {
        Alert.alert(
          "File unavailable",
          "This document does not have a file URL yet.",
        );
        return;
      }
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return;
      }
      Alert.alert(
        "Unsupported file",
        "This file cannot be opened on this device.",
      );
    } catch (openError) {
      Alert.alert(
        "Document unavailable",
        openError instanceof Error ? openError.message : "Please try again.",
      );
    } finally {
      setOpening(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !document) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader
          title="Document"
          showBack
          onBack={() => safeGoBack(navigation, "Library")}
        />
        <EmptyState
          icon="!"
          title="Document unavailable"
          message={error ?? "This document could not be found."}
          actionLabel="Back to Library"
          onAction={() => safeGoBack(navigation, "Library")}
        />
      </SafeAreaView>
    );
  }

  const date = document.documentDate ?? document.uploadedAt;
  const previewSupported =
    document.fileType === "pdf" && Boolean(document.fileURL);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Document"
        showBack
        onBack={() => safeGoBack(navigation, "Library")}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.badgeRow}>
            <Badge
              label={LIBRARY_TYPE_LABELS[document.type]}
              color={colors.gold.default}
            />
            <Badge
              label={LIBRARY_CATEGORY_LABELS[document.category]}
              color={colors.text.secondary}
            />
          </View>
          <Text style={styles.title}>{document.title}</Text>
          <Text style={styles.body}>{document.description}</Text>
          <Text style={styles.meta}>
            {formatDisplayDate(date)} · {document.fileType.toUpperCase()} ·{" "}
            {document.fileName}
          </Text>
        </View>
        <View style={styles.preview}>
          <Text style={styles.previewTitle}>
            {previewSupported ? "PDF preview ready" : "Preview unavailable"}
          </Text>
          <Text style={styles.previewBody}>
            {previewSupported
              ? "Use the open action to preview this PDF through the available document handler."
              : "This file is not available for preview yet. Use the open action when a file has been attached."}
          </Text>
        </View>
        <GoldButton
          label={previewSupported ? "Open PDF" : "Open Externally"}
          onPress={handleOpen}
          loading={opening}
          disabled={!document.fileURL}
          fullWidth
        />
        <OutlineButton
          label="Back to Library"
          onPress={() => safeGoBack(navigation, "Library")}
          fullWidth
        />
      </ScrollView>
    </SafeAreaView>
  );
};

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
  badgeRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  title: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  body: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    lineHeight: 21,
  },
  meta: { fontSize: typography.size.sm, color: colors.text.tertiary },
  preview: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  previewTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: "center",
  },
  previewBody: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: 21,
  },
});

export default DocumentViewerScreen;
