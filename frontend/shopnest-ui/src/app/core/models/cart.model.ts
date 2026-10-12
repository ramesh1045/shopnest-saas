export interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  name: string;
  slug: string;
  price_inr: number;
  stock_quantity: number;
  image_url?: string | null;
  line_total: number;
}

export interface Cart {
  cart_id: number;
  store_id: number;
  items: CartItem[];
  subtotal_inr: number;
  item_count: number;
}

export interface AddToCartRequest {
  product_id: number;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}