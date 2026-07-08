import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Badge from "../common/Badge";
import Icon from "../common/FeatherIcon";
import { colors, spacing, typography } from "../../theme";
import {
  LIBRARY_TYPE_LABELS,
  LibraryDocument,
} from "../../types/library";
import { formatDisplayDate } from "../../utils/formatDate";

interface Props {
  document: LibraryDocument;
  onPress: () => void;
  showStatus?: boolean;
}

const formatFileSize = (size: number | null) => {
  if (!size) {
    return "Size unavailable";
  }
  if (size < 1000000) {
    return `${Math.round(size / 1000)} KB`;
  }
  return `${(size / 1000000).toFixed(1)} MB`;
};

const statusColor = (status: LibraryDocument["status"]) => {
  if (status === "published") {
    return colors.status.success;
  }
  if (status === "archived") {
    return colors.text.tertiary;
  }
  return colors.gold.default;
};

const DocumentCard = ({ document, onPress, showStatus }: Props) => {
  const date = document.documentDate ?? document.uploadedAt;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.iconBox}>
        <Icon
          name={document.fileType === "pdf" ? "file-text" : "file"}
          size={20}
          color={colors.gold.light}
        />
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.title}>{document.title}</Text>
          {showStatus && (
            <Badge
              label={document.status.toUpperCase()}
              color={statusColor(document.status)}
            />
          )}
        </View>
        <Text style={styles.description}>{document.description}</Text>
        <View style={styles.metaRow}>
          <Badge label={LIBRARY_TYPE_LABELS[document.type]} color={colors.gold.default} />
          <Text style={styles.meta}>
            {formatDisplayDate(date)} · {document.fileType.toUpperCase()} ·{" "}
            {formatFileSize(document.fileSize)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg.elevated,
  },
  content: { flex: 1, gap: spacing.sm },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  title: {
    flex: 1,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  description: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  meta: { fontSize: typography.size.xs, color: colors.text.tertiary },
});

export default DocumentCard;
