export type ListingStatus = 'available' | 'sold';

export interface Listing {
  id: string;
  title: string;
  price: number;
  description: string;
  status: ListingStatus;
  imageURL: string | null;
  postedBy: string;
  postedByName: string;
  contactInstruction: string;
}
