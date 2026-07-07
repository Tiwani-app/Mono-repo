import { isBefore, isSameDay, startOfDay } from "date-fns";
import { formatDisplayDate } from "./formatDate";

export const isPastCalendarDay = (date: Date, now = new Date()): boolean =>
  isBefore(startOfDay(date), startOfDay(now));

export const isTodayCalendarDay = (date: Date, now = new Date()): boolean =>
  isSameDay(date, now);

export const formatVotingExpiryLabel = (
  expiresAt: Date,
  now = new Date(),
): string => {
  if (isPastCalendarDay(expiresAt, now)) {
    return `Expired on ${formatDisplayDate(expiresAt)}`;
  }
  if (isTodayCalendarDay(expiresAt, now)) {
    return "Expires today";
  }
  return `Expires ${formatDisplayDate(expiresAt)}`;
};

export const formatDueOverdueLabel = (
  dueDate: Date,
  now = new Date(),
): string => {
  if (isPastCalendarDay(dueDate, now)) {
    return `Overdue since ${formatDisplayDate(dueDate)}`;
  }
  if (isTodayCalendarDay(dueDate, now)) {
    return "Becomes overdue after today";
  }
  return `Becomes overdue after ${formatDisplayDate(dueDate)}`;
};
