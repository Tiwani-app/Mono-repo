export type ListingStatus = "available" | "sold";
export type ListingCondition = "new" | "like_new" | "good" | "fair" | "used";

export interface Listing {
  id: string;
  title: string;
  price: number;
  description: string;
  condition: ListingCondition;
  status: ListingStatus;
  imageURL: string | null;
  postedBy: string;
  postedByName: string;
  contactInstruction: string;
  createdAt: Date;
  updatedAt: Date;
}
