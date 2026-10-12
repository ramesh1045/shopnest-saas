export type StoreStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING';

export interface Store {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  theme_color?: string;
  status: StoreStatus;
  role?: string;
  created_at?: string;
}

export interface CreateStoreRequest {
  name: string;
  description?: string;
}

export interface UpdateStoreRequest {
  name?: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  theme_color?: string;
}