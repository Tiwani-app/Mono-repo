export type RawRecord = Record<string, unknown>;

const fieldLabel = (field: string) => `Field "${field}"`;

export const requiredString = (record: RawRecord, field: string): string => {
  const value = record[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldLabel(field)} is required.`);
  }
  return value;
};

export const asNullableString = (
  value: unknown,
  field = "value",
): string | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`${fieldLabel(field)} must be a string or null.`);
  }
  return value;
};

export const requiredNumber = (record: RawRecord, field: string): number => {
  const value = record[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${fieldLabel(field)} must be a valid number.`);
  }
  return value;
};

export const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export const asStringArray = (value: unknown, field = "value"): string[] => {
  if (value === null || value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${fieldLabel(field)} must be an array of strings.`);
  }
  return value;
};

export const requiredRecordArray = (
  record: RawRecord,
  field: string,
): RawRecord[] => {
  const value = record[field];
  if (!Array.isArray(value)) {
    throw new Error(`${fieldLabel(field)} must be an array.`);
  }
  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(
        `${fieldLabel(field)} item ${index + 1} must be an object.`,
      );
    }
    return item as RawRecord;
  });
};

const dateFromValue = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

export const requiredDate = (record: RawRecord, field: string): Date => {
  const date = dateFromValue(record[field]);
  if (!date) {
    throw new Error(`${fieldLabel(field)} must be a valid date.`);
  }
  return date;
};

export const asDate = (value: unknown, fallback = new Date(0)): Date => {
  return dateFromValue(value) ?? fallback;
};

export const asNullableDate = (
  value: unknown,
  field = "value",
): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const date = dateFromValue(value);
  if (!date) {
    throw new Error(`${fieldLabel(field)} must be a valid date or null.`);
  }
  return date;
};

export const requiredEnum = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  field = "value",
): T => {
  if (typeof value === "string" && allowed.includes(value as T)) {
    return value as T;
  }
  throw new Error(`${fieldLabel(field)} has an unsupported value.`);
};
