import React, { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import Badge from "../common/Badge";
import FeedbackModal, { FeedbackModalType } from "../common/FeedbackModal";
import GoldButton from "../common/GoldButton";
import ListingMedia from "./ListingMedia";
import { colors, spacing, typography } from "../../theme";
import { Listing, ListingCondition } from "../../types/marketplace";
import { formatCurrency } from "../../utils/formatCurrency";

const CONDITION_LABELS: Record<ListingCondition, string> = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  used: "Used",
};

interface Props {
  listing: Listing;
}

const ListingCard = ({ listing }: Props) => {
  const sold = listing.status === "sold";
  const [modal, setModal] = useState<{
    visible: boolean;
    type: FeedbackModalType;
    title: string;
    message: string;
    primaryLabel?: string;
    onPrimary: () => void;
    secondaryLabel?: string;
    onSecondary?: () => void;
  } | null>(null);
  const closeModal = () => setModal(null);

  const openContactUrl = async (contactUrl: string) => {
    try {
      await Linking.openURL(contactUrl);
    } catch {
      setModal({ visible: true, type: "error", title: "Contact unavailable", message: "This contact method could not be opened on your device.", onPrimary: closeModal });
    }
  };

  const handleEnquire = () => {
    const message = encodeURIComponent(
      `Hi ${listing.postedByName}, I'm interested in "${listing.title}" listed on Tiwani for ${formatCurrency(listing.price)}. Is it still available?`,
    );
    const phone =
      listing.contactPhone?.replace(/[^\d+]/g, "") ??
      listing.contactInstruction
        .match(/\+?\d[\d\s()-]{7,}\d/)?.[0]
        ?.replace(/[^\d+]/g, "");
    const whatsappPhone = phone?.replace(/\D/g, "");
    const email =
      listing.contactEmail ??
      listing.contactInstruction.match(
        /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
      )?.[0];
    const contactOptions = [
      whatsappPhone
        ? {
            label: "WhatsApp",
            url: `https://wa.me/${whatsappPhone}?text=${message}`,
          }
        : null,
      phone
        ? { label: "Text Message", url: `sms:${phone}&body=${message}` }
        : null,
      email
        ? {
            label: "Email",
            url: `mailto:${email}?subject=Tiwani marketplace enquiry&body=${message}`,
          }
        : null,
    ].filter(
      (option): option is { label: string; url: string } => Boolean(option),
    );

    if (contactOptions.length === 0) {
      setModal({ visible: true, type: "info", title: "Contact unavailable", message: "This listing does not have a phone number or email for enquiries.", onPrimary: closeModal });
      return;
    }
    if (contactOptions.length === 1) {
      openContactUrl(contactOptions[0].url);
      return;
    }
    setModal({
      visible: true,
      type: "info",
      title: `Contact ${listing.postedByName}`,
      message: "Choose how to send your enquiry.",
      primaryLabel: contactOptions[0].label,
      onPrimary: () => { closeModal(); openContactUrl(contactOptions[0].url); },
      secondaryLabel: contactOptions[1] ? contactOptions[1].label : "Cancel",
      onSecondary: contactOptions[1] ? () => { closeModal(); openContactUrl(contactOptions[1].url); } : closeModal,
    });
  };

  return (
    <>
      {modal && (
        <FeedbackModal
          visible={modal.visible}
          type={modal.type}
          title={modal.title}
          message={modal.message}
          primaryLabel={modal.primaryLabel}
          onPrimary={modal.onPrimary}
          secondaryLabel={modal.secondaryLabel}
          onSecondary={modal.onSecondary}
        />
      )}
      <View style={[styles.card, sold && styles.sold]}>
      <ListingMedia listing={listing} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.title}>{listing.title}</Text>
          <Badge
            label={listing.status.toUpperCase()}
            color={sold ? colors.text.tertiary : colors.status.success}
          />
        </View>
        <Badge
          label={CONDITION_LABELS[listing.condition].toUpperCase()}
          color={colors.gold.default}
        />
        <Text style={styles.description}>{listing.description}</Text>
        <Text style={styles.contact}>{listing.contactInstruction}</Text>
        <View style={styles.bottomRow}>
          <View style={styles.priceBlock}>
            <Text style={[styles.price, sold && styles.soldPrice]}>
              {formatCurrency(listing.price)}
            </Text>
            <Text style={styles.postedBy}>
              Posted by: {listing.postedByName}
            </Text>
          </View>
          <GoldButton
            label={sold ? "Sold" : "Enquire"}
            onPress={handleEnquire}
            disabled={sold}
            size="sm"
          />
        </View>
      </View>
    </View>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.bg.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  sold: { opacity: 0.65 },
  content: { flex: 1, gap: spacing.md },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  title: {
    flex: 1,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  description: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  contact: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    lineHeight: 17,
  },
  price: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.black,
    color: colors.gold.light,
  },
  soldPrice: {
    color: colors.text.tertiary,
    textDecorationLine: "line-through",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  priceBlock: { flex: 1, gap: spacing.xs },
  postedBy: { fontSize: typography.size.xs, color: colors.text.tertiary },
});

// Memoized so marketplace list re-renders skip unchanged listings.
export default React.memo(ListingCard);
