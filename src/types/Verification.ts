export interface Verification {
  id?: string;
  placeId: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  date: Date;
  comment?: string;
}
