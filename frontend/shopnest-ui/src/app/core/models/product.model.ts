export interface Product {
  id: number;
  store_id: number;
  category_id: number | null;
  category_name?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  sku?: string | null;
  price_inr: number;
  compare_price_inr?: number | null;
  stock_quantity: number;
  image_url?: string | null;
  is_active: number | boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: number;
  store_id?: number;
  name: string;
  slug: string;
  product_count?: number;
  created_at?: string;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  sku?: string;
  price_inr: number;
  compare_price_inr?: number;
  stock_quantity?: number;
  category_id?: number | null;
  image_url?: string;
  is_active?: boolean;
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  categoryId?: number;
  search?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc';
  isActive?: boolean;
}