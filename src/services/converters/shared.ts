export type RawRecord = Record<string, unknown>;

export interface DocumentSnapshotLike {
  id: string;
  data: () => RawRecord | undefined;
}

export const snapshotToRecord = (snapshot: DocumentSnapshotLike): RawRecord => ({
  id: snapshot.id,
  ...(snapshot.data() ?? {}),
});

export const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

export const asNullableString = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

export const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

export const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export const asDate = (value: unknown, fallback = new Date(0)): Date => {
  if (value instanceof Date) {
    return value;
  }
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    const date = value.toDate();
    return date instanceof Date ? date : fallback;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed;
  }
  return fallback;
};

export const asNullableDate = (value: unknown): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const date = asDate(value);
  return date.getTime() === 0 ? null : date;
};

export const enumValue = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T => (typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback);

