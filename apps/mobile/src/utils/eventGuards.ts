import { addDays, startOfDay } from "date-fns";
import { TiwaniEvent } from "../types/event";

export const isUpcomingEvent = (
  event: TiwaniEvent,
  now = new Date(),
): boolean =>
  event.status === "published" && event.dateTime.getTime() >= now.getTime();

export const visibleUpcomingEvents = (
  events: TiwaniEvent[],
  now = new Date(),
): TiwaniEvent[] =>
  events
    .filter((event) => isUpcomingEvent(event, now))
    .sort((left, right) => left.dateTime.getTime() - right.dateTime.getTime());

export const visiblePublishedEvents = (
  events: TiwaniEvent[],
): TiwaniEvent[] =>
  events
    .filter((event) => event.status === "published")
    .sort((left, right) => left.dateTime.getTime() - right.dateTime.getTime());

export const getCenteredDateWindow = (
  centerDate = new Date(),
  length = 7,
): Date[] => {
  const safeLength = Math.max(1, length);
  const leadingDays = Math.floor(safeLength / 2);
  const start = addDays(startOfDay(centerDate), -leadingDays);
  return Array.from({ length: safeLength }, (_, index) => addDays(start, index));
};
