import React, { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import KeyboardAwareScroll from "../../components/common/KeyboardAwareScroll";
import EmptyState from "../../components/common/EmptyState";
import FeedbackModal, { FeedbackModalType } from "../../components/common/FeedbackModal";
import GoldButton from "../../components/common/GoldButton";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ScreenHeader from "../../components/common/ScreenHeader";
import NairaRateCard from "../../components/finance/NairaRateCard";
import {
  getPaystackRate,
  PaystackRateInfo,
  setPaystackSettings,
} from "../../services/paymentsService";
import {spacing, typography, useThemeColors, useThemedStyles, AppColors} from '../../theme';
import { formatRelativeTime } from "../../utils/formatDate";
import { formatNaira, formatRateChange } from "../../utils/nairaRate";
import { safeGoBack } from "../../utils/navigation";

const MAX_BUFFER_PERCENT = 10; // matches the backend clamp (fxRates.ts)

// Admin settings for Naira (Paystack) payments: see the live rate members are
// charged at, set the buffer added on top, and keep a manual rate as a
// fallback for when the live rate is unavailable (payment-feature.md §15.6).
const NairaPaymentsScreen = ({ navigation }: any) => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const [info, setInfo] = useState<PaystackRateInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [buffer, setBuffer] = useState("");
  const [manualRate, setManualRate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<{
    visible: boolean;
    type: FeedbackModalType;
    title: string;
    message: string;
    onPrimary: () => void;
  } | null>(null);
  const closeModal = () => setModal(null);

  const handleBack = () => safeGoBack(navigation, "FinanceAdmin");

  const load = useCallback(async () => {
    try {
      const next = await getPaystackRate();
      setInfo(next);
      setLoadError(null);
      setBuffer(String(next.bufferPercent));
      setManualRate(next.manualRate > 0 ? String(next.manualRate) : "");
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Could not load the rate.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showError = (title: string, message: string) =>
    setModal({ visible: true, type: "error", title, message, onPrimary: closeModal });

  const handleSave = async () => {
    if (saving || !info) {
      return;
    }
    const bufferValue = Number(buffer.replace(/,/g, ""));
    if (
      buffer.trim() === "" ||
      !Number.isFinite(bufferValue) ||
      bufferValue < 0 ||
      bufferValue > MAX_BUFFER_PERCENT
    ) {
      showError("Invalid buffer", `Enter a buffer from 0 to ${MAX_BUFFER_PERCENT}%.`);
      return;
    }
    // Empty manual rate = no fallback.
    const manualValue =
      manualRate.trim() === "" ? 0 : Number(manualRate.replace(/,/g, ""));
    if (!Number.isFinite(manualValue) || manualValue < 0) {
      showError("Invalid fallback rate", "Enter a rate greater than zero, or leave it empty.");
      return;
    }
    try {
      setSaving(true);
      await setPaystackSettings({
        bufferPercent: bufferValue,
        manualRate: manualValue === info.manualRate ? null : manualValue,
      });
      await load();
      setModal({
        visible: true,
        type: "success",
        title: "Settings saved",
        message: "Naira payments now use these settings.",
        onPrimary: closeModal,
      });
    } catch (saveError) {
      showError(
        "Not saved",
        saveError instanceof Error ? saveError.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const automatic = info?.automatic ?? null;

  return (
    <SafeAreaView style={styles.safe}>
      {modal && (
        <FeedbackModal
          visible={modal.visible}
          type={modal.type}
          title={modal.title}
          message={modal.message}
          onPrimary={modal.onPrimary}
        />
      )}
      <ScreenHeader title="Naira Payments" showBack onBack={handleBack} />
      {!info ? (
        <EmptyState
          icon="!"
          title="Naira payments not set up"
          message={loadError ?? "Online payments are not configured yet."}
          actionLabel="Back"
          onAction={handleBack}
        />
      ) : (
        <KeyboardAwareScroll>
          <Text style={styles.sectionLabel}>WHAT MEMBERS PAY</Text>
          {info.inUse ? (
            <NairaRateCard rate={info.inUse} />
          ) : (
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>
                Naira payments are unavailable. The live rate is missing or
                over 24 hours old, and no fallback rate is set. Members can
                still pay by card.
              </Text>
            </View>
          )}

          <Text style={styles.sectionLabel}>LIVE MARKET RATE</Text>
          <View style={styles.card}>
            {automatic ? (
              <>
                <Text style={styles.value}>
                  {formatNaira(automatic.midRate)}
                  <Text style={styles.per}> per $1</Text>
                </Text>
                <Text style={styles.detail}>
                  {automatic.change24hPercent !== null
                    ? `${formatRateChange(automatic.change24hPercent)} (24h)  ·  `
                    : ""}
                  Updated {formatRelativeTime(new Date(automatic.fetchedAt))}
                </Text>
                <Text style={automatic.stale ? styles.warningText : styles.meta}>
                  {automatic.stale
                    ? "Over 24 hours old, so it is not being used."
                    : "Updated hourly from two independent sources."}
                </Text>
              </>
            ) : (
              <Text style={styles.meta}>No live rate is available yet.</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>BUFFER (%)</Text>
            <TextInput
              value={buffer}
              onChangeText={setBuffer}
              keyboardType="decimal-pad"
              placeholder="2"
              placeholderTextColor={colors.text.tertiary}
              style={styles.input}
            />
            <Text style={styles.hint}>
              Added on top of the live rate to cover Paystack's fee and the
              bank spread, so the community receives the full dues. 0 to{" "}
              {MAX_BUFFER_PERCENT}%.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>FALLBACK RATE (NAIRA PER $1)</Text>
            <TextInput
              value={manualRate}
              onChangeText={setManualRate}
              keyboardType="decimal-pad"
              placeholder="Not set"
              placeholderTextColor={colors.text.tertiary}
              style={styles.input}
            />
            <Text style={styles.hint}>
              Only used if the live rate stops updating. Charged exactly as
              entered, with no buffer. Leave empty to pause Naira payments
              instead.
              {info.manualRateUpdatedAt
                ? ` Last changed ${formatRelativeTime(new Date(info.manualRateUpdatedAt))}.`
                : ""}
            </Text>
          </View>

          <GoldButton
            label={saving ? "Saving…" : "Save Settings"}
            onPress={handleSave}
            loading={saving}
            fullWidth
          />
        </KeyboardAwareScroll>
      )}
    </SafeAreaView>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.secondary },
  sectionLabel: {
    marginTop: spacing.md,
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  card: {
    gap: spacing.xs,
    padding: spacing.lg,
    backgroundColor: colors.bg.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  warningCard: {
    padding: spacing.lg,
    backgroundColor: colors.bg.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.status.error,
  },
  warningText: {
    fontSize: typography.size.sm,
    color: colors.status.error,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  value: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  per: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  detail: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
  },
  meta: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
  },
  hint: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  field: { gap: spacing.xs },
  label: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  input: {
    minHeight: 48,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.tertiary,
    color: colors.text.primary,
  },
});

export default NairaPaymentsScreen;
