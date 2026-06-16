import { env } from "../config/env";
import { FinanceContact, LedgerEntry } from "../types/finance";
import { RawRecord } from "./converters/shared";
import { firestore, getCurrentOrgId, getUserRecord } from "./firebaseHelpers";

const trimmedString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const nestedRecord = (value: unknown): RawRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as RawRecord)
    : {};

const contactFromValues = ({
  email,
  label,
  name,
  phone,
}: {
  email?: unknown;
  label?: string;
  name?: unknown;
  phone?: unknown;
}): FinanceContact | null => {
  const contactEmail = trimmedString(email);
  const contactPhone = trimmedString(phone);
  if (!contactEmail && !contactPhone) {
    return null;
  }
  const contactName = trimmedString(name) ?? "Finance Contact";
  return {
    ...(contactEmail ? { email: contactEmail } : {}),
    label: label ?? `Contact ${contactName}`,
    name: contactName,
    ...(contactPhone ? { phone: contactPhone } : {}),
  };
};

const treasurerContactFromOrg = (record: RawRecord): FinanceContact | null => {
  const financeContact = nestedRecord(record.financeContact);
  const treasurer = nestedRecord(record.treasurer);
  return contactFromValues({
    email:
      financeContact.email ??
      treasurer.email ??
      record.financeContactEmail ??
      record.treasurerEmail,
    label: "Contact Treasurer",
    name:
      financeContact.name ??
      treasurer.name ??
      record.financeContactName ??
      record.treasurerName ??
      "Treasurer",
    phone:
      financeContact.phone ??
      treasurer.phone ??
      record.financeContactPhone ??
      record.treasurerPhone,
  });
};

const fallbackTreasurerContact = (): FinanceContact | null =>
  contactFromValues({
    email: env.financeContactEmail,
    label: "Contact Treasurer",
    name: "Treasurer",
    phone: env.financeContactPhone,
  });

const creatorContactFromStoredFields = (
  entry: Pick<
    LedgerEntry,
    "recordedByEmail" | "recordedByName" | "recordedByPhone"
  >,
): FinanceContact | null =>
  contactFromValues({
    email: entry.recordedByEmail,
    name: entry.recordedByName ?? "Dues Creator",
    phone: entry.recordedByPhone,
  });

const creatorContactFromPeriodRecord = (
  record: RawRecord,
): FinanceContact | null =>
  contactFromValues({
    email: record.createdByEmail,
    name: record.createdByName ?? "Dues Creator",
    phone: record.createdByPhone,
  });

const creatorContactFromUserRecord = async (
  uid: string | undefined,
): Promise<FinanceContact | null> => {
  if (!uid?.trim()) {
    return null;
  }
  try {
    const record = await getUserRecord(uid.trim());
    return contactFromValues({
      email: record.email,
      name: record.fullName ?? "Dues Creator",
      phone: record.phone,
    });
  } catch {
    return null;
  }
};

export const getCurrentOrganisationFinanceContact =
  async (): Promise<FinanceContact | null> => {
    try {
      const orgId = await getCurrentOrgId();
      const snapshot = await firestore()
        .collection("organisations")
        .doc(orgId)
        .get();
      if (snapshot.exists()) {
        const contact = treasurerContactFromOrg(snapshot.data() ?? {});
        if (contact) {
          return contact;
        }
      }
    } catch {
      // Keep the member flow usable even if the optional org contact is absent.
    }
    return fallbackTreasurerContact();
  };

export const getLedgerCreatorContact = async (
  ledgerEntries: LedgerEntry[],
): Promise<FinanceContact | null> => {
  const unpaidEntries = ledgerEntries.filter(
    (ledgerEntry) =>
      ledgerEntry.type !== "payment" && ledgerEntry.paidStatus !== "paid",
  );
  const entry =
    unpaidEntries.find(
      (ledgerEntry) =>
        Boolean(
          ledgerEntry.recordedByEmail ||
            ledgerEntry.recordedByPhone ||
            ledgerEntry.recordedBy ||
            ledgerEntry.duesPeriodId,
        ),
    ) ?? unpaidEntries[0];
  if (!entry) {
    return null;
  }

  const storedContact = creatorContactFromStoredFields(entry);
  if (storedContact) {
    return storedContact;
  }

  if (entry.duesPeriodId) {
    try {
      const periodSnapshot = await firestore()
        .collection("finance_periods")
        .doc(entry.duesPeriodId)
        .get();
      if (periodSnapshot.exists()) {
        const period = periodSnapshot.data() ?? {};
        const periodContact = creatorContactFromPeriodRecord(period);
        if (periodContact) {
          return periodContact;
        }
        const createdBy = trimmedString(period.createdBy);
        const createdByContact = await creatorContactFromUserRecord(
          createdBy ?? undefined,
        );
        if (createdByContact) {
          return createdByContact;
        }
      }
    } catch {
      // Fall back to the charge creator user lookup below.
    }
  }

  return creatorContactFromUserRecord(entry.recordedBy);
};
