export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentMethod = 'COD' | 'SIMULATED' | 'RAZORPAY';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface ShippingAddress {
  full_name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  unit_price_inr: number;
  quantity: number;
  line_total_inr: number;
}

export interface Order {
  id: number;
  store_id: number;
  customer_id: number;
  order_number: string;
  status: OrderStatus;
  subtotal_inr: number;
  discount_inr: number;
  total_inr: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  shipping_address: ShippingAddress;
  created_at: string;
  updated_at: string;
  store_name?: string;
  store_slug?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  items?: OrderItem[];
}

export interface OrderSummary {
  id: number;
  order_number: string;
  status: OrderStatus;
  total_inr: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  created_at: string;
  store_name: string;
  store_slug: string;
  customer_name?: string;
  customer_phone?: string;
}

export interface CheckoutRequest {
  store_slug: string;
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  shipping_address: ShippingAddress;
  payment_method?: 'COD' | 'SIMULATED';
}

export interface Subscription {
  subscription_id: number;
  plan_id: number;
  plan_code: 'STARTER' | 'GROWTH' | 'PRO';
  plan_name: string;
  price_inr: number;
  max_products: number;
  max_staff: number;
  features: Record<string, any>;
  status: string;
  started_at: string;
  current_period_end: string;
}

export interface Plan {
  id: number;
  code: string;
  name: string;
  price_inr: number;
  max_products: number;
  max_staff: number;
  features: Record<string, any>;
}