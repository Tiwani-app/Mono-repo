import {
  Listing,
  ListingCondition,
  ListingStatus,
} from "../../types/marketplace";
import {
  RawRecord,
  asNullableString,
  requiredDate,
  requiredEnum,
  requiredNumber,
  requiredString,
} from "./shared";

const listingStatuses: ListingStatus[] = ["available", "sold", "archived"];
const listingConditions: ListingCondition[] = [
  "new",
  "like_new",
  "good",
  "fair",
  "used",
];

export const listingFromRecord = (record: RawRecord): Listing => ({
  id: requiredString(record, "id"),
  title: requiredString(record, "title"),
  price: requiredNumber(record, "price"),
  description: requiredString(record, "description"),
  condition: requiredEnum(record.condition, listingConditions, "condition"),
  status: requiredEnum(record.status, listingStatuses, "status"),
  imageURL: asNullableString(record.imageURL, "imageURL"),
  postedBy: requiredString(record, "postedBy"),
  postedByName: requiredString(record, "postedByName"),
  contactPhone: asNullableString(record.contactPhone, "contactPhone"),
  contactEmail: asNullableString(record.contactEmail, "contactEmail"),
  contactInstruction: requiredString(record, "contactInstruction"),
  createdAt: requiredDate(record, "createdAt"),
  updatedAt: requiredDate(record, "updatedAt"),
});
