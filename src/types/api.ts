export interface Ingredient {
  stockId: string;
  amount: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: string;
  description: string;
  stock: number;
  status: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
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
