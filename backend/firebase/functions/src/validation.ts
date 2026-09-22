import { HttpsError } from "firebase-functions/v2/https";

export const stringField = (
  data: unknown,
  field: string,
  options: { maxLength?: number; required?: boolean } = {},
): string => {
  const record = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const value = record[field];
  const required = options.required ?? true;
  if (value === undefined || value === null || value === "") {
    if (!required) {
      return "";
    }
    throw new HttpsError("invalid-argument", `Field "${field}" is required.`);
  }
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", `Field "${field}" must be a string.`);
  }
  const trimmed = value.trim();
  if (required && !trimmed) {
    throw new HttpsError("invalid-argument", `Field "${field}" is required.`);
  }
  if (options.maxLength && trimmed.length > options.maxLength) {
    throw new HttpsError(
      "invalid-argument",
      `Field "${field}" must be ${options.maxLength} characters or fewer.`,
    );
  }
  return trimmed;
};

export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

export const recordFromData = (data: unknown): Record<string, unknown> =>
  data && typeof data === "object" ? (data as Record<string, unknown>) : {};

export const numberField = (data: unknown, field: string): number => {
  const value = recordFromData(data)[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new HttpsError("invalid-argument", `Field "${field}" must be a number.`);
  }
  return value;
};

export const positiveAmountField = (data: unknown, field: string): number => {
  const amount = numberField(data, field);
  if (amount <= 0) {
    throw new HttpsError("invalid-argument", `Field "${field}" must be greater than zero.`);
  }
  return amount;
};

export const optionalStringField = (
  data: unknown,
  field: string,
  options: { maxLength?: number } = {},
): string => stringField(data, field, { ...options, required: false });
