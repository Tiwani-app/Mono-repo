import { EventCategory, EventStatus, TiwaniEvent } from "../../types/event";
import {
  RawRecord,
  asNumber,
  asStringArray,
  requiredDate,
  requiredEnum,
  requiredNumber,
  requiredString,
} from "./shared";

const categories: EventCategory[] = [
  "meeting",
  "social",
  "volunteer",
  "committee",
];
const statuses: EventStatus[] = [
  "draft",
  "published",
  "cancelled",
  "completed",
];

export const eventFromRecord = (record: RawRecord): TiwaniEvent => {
  const rsvpList = asStringArray(record.rsvpList);
  return {
    id: requiredString(record, "id"),
    title: requiredString(record, "title"),
    description: requiredString(record, "description"),
    category: requiredEnum(record.category, categories, "category"),
    dateTime: requiredDate({ dateTime: record.startTime }, "dateTime"),
    location: requiredString(record, "location"),
    createdBy: requiredString(record, "createdBy"),
    status: requiredEnum(record.status, statuses, "status"),
    rsvpList,
    rsvpCount: asNumber(record.rsvpCount, rsvpList.length),
    capacity: requiredNumber(record, "capacity"),
    attendees: asStringArray(record.attendeeList),
  };
};
