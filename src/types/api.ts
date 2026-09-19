export interface Ingredient {
  stockId: string;
  amount: string;
}

export interface Product {
  id: number | string;
  name: string;
  category: string;
  price: number;
  description?: string;
  deskripsi?: string;
  stock: number;
  status: string;
  inStock?: boolean;
  inventoryAvailable?: boolean;
  image_url?: string | null;
  image?: string | null;
  outlet?: string;
  created_at?: string;
  updated_at?: string;
  displayed: number;
  ingredients: Ingredient[];
}

export interface OrderItem {
  productId: string | number;
  quantity: number;
  price: number;
  notes?: string;
}

export interface OrderPayload {
  items: OrderItem[];
  totalPrice: number;
  paymentMethod: string;
}

export interface OrderResponse {
  success: boolean;
  orderId: string;
  message: string;
}

export interface Promotion {
  id: number;
  title: string;
  description: string | null;
  file_name: string;
  file_url: string;
  file_type: 'image' | 'video';
  mime_type: string;
  duration: number;
  thumbnail_url: string | null;
  is_active: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface CoinPromo {
  id: string;
  title: string;
  description: string;
  coin_cost: number;
  discount_type: 'percentage' | 'nominal';
  discount_value: number;
  min_order: number;
  max_usage: number;
  used_count: number;
  valid_until: string;
  is_active: number;
  image_url: string;
  category: string;
  free_item_name: string;
  product_id: string;
}

export interface User {
  id: string;
  nama: string;
  nim: string;
  coin_balance: number;
  avatar_url: string;
  rfid_tag_id: string;
}

export interface AdminPromo {
  id: string;
  title: string;
  code: string;
  discount: number;
  type: 'Percentage' | 'Nominal';
  period: string; // format "YYYY-MM-DD - YYYY-MM-DD"
  status: 'Active' | 'Inactive';
  usageCount: number;
  maxUsage: number | null; // null = unlimited (kuota tidak dibatasi)
  minPurchase: number;
}
