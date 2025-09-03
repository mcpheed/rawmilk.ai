export type Location = {
  id: string;
  name: string;
  type: 'farm' | 'pickup' | 'retail';
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  website?: string;
  lat?: number;
  lng?: number;
  source: { name: string; url: string };
  updatedAt: string;
};
